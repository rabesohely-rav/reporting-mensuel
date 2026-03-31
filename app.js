const MONTHS = [
  'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'
];

const STORAGE_KEY = 'reporting-mensuel-france-services-v1';

const SAMPLE = {
  nom_fs: 'ALZONNE',
  periode_label: 'Janvier 2026',
  periode_key: '2026-01',
  nombre_accompagnements: 701,
  communes_usagers: [
    { label: 'Alzonne', value: 102 },
    { label: 'Arzens', value: 2 },
    { label: 'Bram', value: 3 },
    { label: 'Carcassonne', value: 1 },
    { label: 'Carlipa', value: 2 },
    { label: 'Cenne-Monestiés', value: 1 },
    { label: 'Montolieu', value: 5 },
    { label: 'Montréal', value: 4 },
    { label: 'Moussoulens', value: 16 },
    { label: 'Pennautier', value: 1 },
    { label: 'Pezens', value: 15 },
    { label: 'Raissac-sur-Lampy', value: 8 },
    { label: 'Saint-Hilaire', value: 1 },
    { label: 'Saint-Martin-le-Vieil', value: 1 },
    { label: 'Sainte-Eulalie', value: 6 },
    { label: 'Saissac', value: 2 },
    { label: 'Ventenac-Cabardès', value: 3 },
    { label: "Villelongue-d'Aude", value: 1 }
  ],
  permanences: [
    { label: 'PEZENS', value: 2 },
    { label: 'RAISSAC SUR LAMPY', value: 1 }
  ],
  modalites_acces: [
    { label: 'En France services - Sur rendez-vous', value: 51 },
    { label: 'En France services - Visite spontanée', value: 40 },
    { label: 'Par téléphone - Appel spontané', value: 9 }
  ],
  partenaires: [
    { label: 'Assurance retraite (Carsat)', value: 33 },
    { label: "Ministère de l'intérieur / France Titres", value: 18 },
    { label: 'Finances publiques (DDFiP)', value: 14 },
    { label: 'Assurance Maladie (CPAM)', value: 13 },
    { label: 'Mutualité sociale agricole (MSA)', value: 9 },
    { label: 'Allocations familiales (Caf)', value: 8 },
    { label: 'Chèque énergie', value: 5 }
  ],
  thematiques: [
    { label: 'Dossier de retraite', value: 66 },
    { label: 'Espace particulier sites opérateurs', value: 50 },
    { label: 'Imposition', value: 29 },
    { label: 'Santé', value: 26 },
    { label: "Titre d'identité", value: 21 }
  ],
  demandes_annee: MONTHS.map((mois, index) => ({ mois, value: index === 0 ? 701 : 0 }))
};

const $ = (id) => document.getElementById(id);
let chartModalites = null;
let chartPartenaires = null;
let chartThematiques = null;

function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function normalizeText(text) {
  return text.replace(/\r/g, '').replace(/\u00A0/g, ' ').trim();
}

function toNumber(str) {
  if (typeof str !== 'string') return Number(str);
  return Number(str.replace(/\s/g, '').replace(',', '.'));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parsePairs(rawText) {
  const text = normalizeText(rawText);
  if (!text) return [];

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const pairs = [];
  let i = 0;

  while (i < lines.length) {
    const labelParts = [];
    while (i < lines.length && Number.isNaN(toNumber(lines[i]))) {
      labelParts.push(lines[i]);
      i += 1;
    }
    if (labelParts.length === 0 || i >= lines.length) {
      throw new Error('Format invalide : libellé sans valeur');
    }
    const value = toNumber(lines[i]);
    if (Number.isNaN(value) || value < 0) {
      throw new Error('Format invalide : valeur numérique attendue');
    }
    pairs.push({
      label: labelParts.join(' ').replace(/\s+/g, ' ').trim(),
      value
    });
    i += 1;
  }
  return pairs;
}

function serializePairs(pairs) {
  return pairs.map(item => `${item.label}\n\n${item.value}`).join('\n');
}

function setStatus(id, type, message) {
  const el = $(id);
  el.className = `status ${type}`;
  el.textContent = message;
}

function setFeedback(type, message) {
  const el = $('saveFeedback');
  el.className = `card save-feedback ${type}`;
  el.textContent = message;
}

function renderYearEditor(rows) {
  const tbody = $('editorDemandesTable').querySelector('tbody');
  tbody.innerHTML = rows.map((row, index) => `
    <tr>
      <td>${escapeHtml(row.mois)}</td>
      <td><input type="number" min="0" step="1" value="${row.value}" data-year-index="${index}" /></td>
    </tr>
  `).join('');
}

function readYearEditor() {
  return MONTHS.map((mois, index) => {
    const input = document.querySelector(`[data-year-index="${index}"]`);
    return {
      mois,
      value: Math.max(0, parseInt(input?.value || '0', 10) || 0)
    };
  });
}

function totalOf(rows) {
  return rows.reduce((sum, row) => sum + row.value, 0);
}

function renderTableBody(tbodyId, rows) {
  $(tbodyId).innerHTML = rows.map(row => `
    <tr>
      <td>${escapeHtml(row.label || row.mois)}</td>
      <td>${formatNumber(row.value)}</td>
    </tr>
  `).join('');
}

function sumPercentLike(rows) {
  return totalOf(rows) === 100;
}

function renderModalitesChart(rows) {
  if (chartModalites) chartModalites.destroy();
  chartModalites = new Chart($('chartModalites'), {
    type: 'pie',
    data: {
      labels: rows.map(r => `${r.label} (${r.value}${sumPercentLike(rows) ? '%' : ''})`),
      datasets: [{
        data: rows.map(r => r.value),
        backgroundColor: ['#7eb6ea', '#f27145', '#a9b0b8', '#8bc34a', '#ffca28'],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderPartenairesChart(rows) {
  if (chartPartenaires) chartPartenaires.destroy();
  chartPartenaires = new Chart($('chartPartenaires'), {
    type: 'doughnut',
    data: {
      labels: rows.map(r => `${r.label} (${r.value}${sumPercentLike(rows) ? '%' : ''})`),
      datasets: [{
        data: rows.map(r => r.value),
        backgroundColor: ['#8fd3ff','#f4a261','#c9ada7','#f6d365','#90caf9','#a5d6a7','#81c784','#ffcc80','#ce93d8'],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: { responsive: true, cutout: '45%', plugins: { legend: { position: 'right' } } }
  });
}

function renderThematiquesChart(rows) {
  if (chartThematiques) chartThematiques.destroy();
  chartThematiques = new Chart($('chartThematiques'), {
    type: 'bar',
    data: {
      labels: rows.map(r => r.label),
      datasets: [{
        data: rows.map(r => r.value),
        backgroundColor: '#efe77a',
        borderColor: '#d3c84f',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderReport(data) {
  $('displayNomFs').textContent = data.nom_fs;
  $('displayPeriode').textContent = data.periode_label;
  $('displayNombreAccompagnements').textContent = formatNumber(data.nombre_accompagnements);
  $('displayNombrePermanences').textContent = formatNumber(totalOf(data.permanences));
  $('displayTotalAnnee').textContent = formatNumber(totalOf(data.demandes_annee));
  $('displayYear').textContent = data.periode_key.slice(0, 4);

  renderTableBody('tbodyCommunesUsagers', data.communes_usagers);
  renderTableBody('tbodyPermanences', data.permanences);
  renderTableBody('tbodyDemandesAnnee', data.demandes_annee);

  renderModalitesChart(data.modalites_acces);
  renderPartenairesChart(data.partenaires);
  renderThematiquesChart(data.thematiques);
}

function collectFormData() {
  const data = {
    nom_fs: $('nomFs').value.trim(),
    periode_label: $('periodeLabel').value.trim(),
    periode_key: $('periodeKey').value,
    nombre_accompagnements: Math.max(0, parseInt($('nombreAccompagnements').value || '0', 10) || 0),
    communes_usagers: [],
    permanences: [],
    modalites_acces: [],
    partenaires: [],
    thematiques: [],
    demandes_annee: readYearEditor()
  };

  const blocks = [
    ['inputCommunesUsagers', 'statusCommunesUsagers', 'communes_usagers'],
    ['inputPermanences', 'statusPermanences', 'permanences'],
    ['inputModalites', 'statusModalites', 'modalites_acces'],
    ['inputPartenaires', 'statusPartenaires', 'partenaires'],
    ['inputThematiques', 'statusThematiques', 'thematiques']
  ];

  const errors = [];
  if (!data.nom_fs) errors.push('Nom de la France Services obligatoire');
  if (!data.periode_label) errors.push('Période affichée obligatoire');
  if (!data.periode_key) errors.push('Clé période obligatoire');

  for (const [inputId, statusId, key] of blocks) {
    try {
      data[key] = parsePairs($(inputId).value);
      if (!data[key].length) {
        errors.push(`${key} vide`);
        setStatus(statusId, 'warn', 'Bloc vide');
      } else {
        setStatus(statusId, 'ok', `${data[key].length} ligne(s) reconnue(s)`);
      }
    } catch (error) {
      errors.push(`${key} invalide`);
      setStatus(statusId, 'error', error.message);
    }
  }

  return { data, errors };
}

function fillForm(data) {
  $('nomFs').value = data.nom_fs;
  $('periodeLabel').value = data.periode_label;
  $('periodeKey').value = data.periode_key;
  $('nombreAccompagnements').value = data.nombre_accompagnements;
  $('inputCommunesUsagers').value = serializePairs(data.communes_usagers);
  $('inputPermanences').value = serializePairs(data.permanences);
  $('inputModalites').value = serializePairs(data.modalites_acces);
  $('inputPartenaires').value = serializePairs(data.partenaires);
  $('inputThematiques').value = serializePairs(data.thematiques);
  renderYearEditor(data.demandes_annee);
  renderReport(data);
}

function saveLocal() {
  const { data, errors } = collectFormData();
  if (errors.length) {
    setFeedback('error', `Sauvegarde refusée : ${errors.join(' | ')}`);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderReport(data);
  setFeedback('ok', 'Sauvegarde localStorage réussie.');
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    fillForm(SAMPLE);
    setFeedback('warn', 'Aucune sauvegarde trouvée. Exemple chargé.');
    return;
  }
  try {
    const data = JSON.parse(raw);
    fillForm(data);
    setFeedback('ok', 'Données rechargées depuis le localStorage.');
  } catch {
    fillForm(SAMPLE);
    setFeedback('error', 'Sauvegarde locale corrompue. Exemple rechargé.');
  }
}

function humanizePeriod(period) {
  const [year, month] = period.split('-');
  const map = {
    '01': 'Janvier', '02': 'Février', '03': 'Mars', '04': 'Avril',
    '05': 'Mai', '06': 'Juin', '07': 'Juillet', '08': 'Août',
    '09': 'Septembre', '10': 'Octobre', '11': 'Novembre', '12': 'Décembre'
  };
  return `${map[month] || month} ${year}`;
}

function init() {
  loadLocal();

  $('btnSample').addEventListener('click', () => {
    fillForm(SAMPLE);
    setFeedback('ok', 'Exemple chargé.');
  });

  $('btnSaveLocal').addEventListener('click', saveLocal);
  $('btnLoadLocal').addEventListener('click', loadLocal);

  $('btnPrint').addEventListener('click', () => {
    const { data, errors } = collectFormData();
    if (errors.length) {
      setFeedback('error', `Impression refusée : ${errors.join(' | ')}`);
      return;
    }
    renderReport(data);
    window.print();
  });

  $('periodeKey').addEventListener('change', () => {
    if (!$('periodeLabel').value.trim()) {
      $('periodeLabel').value = humanizePeriod($('periodeKey').value);
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
