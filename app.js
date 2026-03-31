Chart.register(ChartDataLabels);

const MONTHS = [
  'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'
];

const STORAGE_PREFIX = 'reporting-mensuel-france-services:';

const SAMPLE = {
  nom_fs: 'VILLEMOUSTAUSSOU',
  periode_label: 'Février 2026',
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
  demandes_annee: MONTHS.map((mois, index) => ({ mois, value: index === 1 ? 701 : 0 }))
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
    .replace(/"/g, '&quot;')
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

function percentOf(value, total) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function renderTableBody(tbodyId, rows) {
  $(tbodyId).innerHTML = rows.map(row => `
    <tr>
      <td>${escapeHtml(row.label || row.mois)}</td>
      <td>${formatNumber(row.value)}</td>
    </tr>
  `).join('');
}

function commonDatalabelFormatter(value, ctx) {
  const data = ctx.chart.data.datasets[0].data;
  const total = data.reduce((a, b) => a + b, 0);
  return percentOf(value, total);
}

function buildPieLikeOptions(legendPosition = 'right') {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: legendPosition, labels: { boxWidth: 18, font: { size: 11 } } },
      datalabels: {
        color: '#222',
        formatter: commonDatalabelFormatter,
        font: { weight: 'bold', size: 11 },
        anchor: 'end',
        align: 'end',
        offset: 6,
        clamp: true
      }
    },
    layout: { padding: 10 }
  };
}

function renderModalitesChart(rows) {
  if (chartModalites) chartModalites.destroy();
  chartModalites = new Chart($('chartModalites'), {
    type: 'pie',
    data: {
      labels: rows.map(r => r.label),
      datasets: [{
        data: rows.map(r => r.value),
        backgroundColor: ['#7eb6ea', '#f27145', '#a9b0b8', '#8bc34a', '#ffca28'],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: buildPieLikeOptions('bottom')
  });
}

function renderPartenairesChart(rows) {
  if (chartPartenaires) chartPartenaires.destroy();
  chartPartenaires = new Chart($('chartPartenaires'), {
    type: 'doughnut',
    data: {
      labels: rows.map(r => r.label),
      datasets: [{
        data: rows.map(r => r.value),
        backgroundColor: ['#8fd3ff','#f4a261','#c9ada7','#f6d365','#90caf9','#a5d6a7','#81c784','#ffcc80','#ce93d8'],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      ...buildPieLikeOptions('right'),
      cutout: '45%'
    }
  });
}

function renderThematiquesChart(rows) {
  if (chartThematiques) chartThematiques.destroy();
  const total = totalOf(rows);
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
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: {
          color: '#222',
          formatter: (value) => percentOf(value, total),
          font: { weight: 'bold', size: 11 },
          anchor: 'end',
          align: 'end',
          offset: -2,
          clamp: true
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { ticks: { maxRotation: 0, minRotation: 0, font: { size: 10 } } }
      },
      layout: { padding: { top: 18 } }
    }
  });
}

function extractYear(label) {
  const match = String(label || '').match(/(20\d{2})/);
  return match ? match[1] : new Date().getFullYear();
}

function renderReport(data) {
  $('displayNomFs').textContent = data.nom_fs;
  $('displayPeriode').textContent = data.periode_label;
  $('displayNombreAccompagnements').textContent = formatNumber(data.nombre_accompagnements);
  $('displayNombrePermanences').textContent = formatNumber(totalOf(data.permanences));
  $('displayTotalCommunesUsagers').textContent = formatNumber(totalOf(data.communes_usagers));
  $('displayTotalAnnee').textContent = formatNumber(totalOf(data.demandes_annee));
  $('displayYear').textContent = extractYear(data.periode_label);

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
    nombre_accompagnements: Math.max(0, parseInt($('nombreAccompagnements').value || '0', 10) || 0),
    storage_slot: $('storageSlot').value.trim(),
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

function defaultStorageSlot(data) {
  const name = (data.nom_fs || 'reporting').trim();
  const period = (data.periode_label || 'periode').trim();
  return `${name} - ${period}`;
}

function storageKey(slot) {
  return STORAGE_PREFIX + slot.trim();
}

function fillForm(data) {
  $('nomFs').value = data.nom_fs || '';
  $('periodeLabel').value = data.periode_label || '';
  $('nombreAccompagnements').value = data.nombre_accompagnements ?? 0;
  $('storageSlot').value = data.storage_slot || defaultStorageSlot(data);
  $('inputCommunesUsagers').value = serializePairs(data.communes_usagers || []);
  $('inputPermanences').value = serializePairs(data.permanences || []);
  $('inputModalites').value = serializePairs(data.modalites_acces || []);
  $('inputPartenaires').value = serializePairs(data.partenaires || []);
  $('inputThematiques').value = serializePairs(data.thematiques || []);
  renderYearEditor(data.demandes_annee || MONTHS.map(mois => ({ mois, value: 0 })));
  renderReport({
    ...data,
    communes_usagers: data.communes_usagers || [],
    permanences: data.permanences || [],
    modalites_acces: data.modalites_acces || [],
    partenaires: data.partenaires || [],
    thematiques: data.thematiques || [],
    demandes_annee: data.demandes_annee || MONTHS.map(mois => ({ mois, value: 0 }))
  });
}

function saveLocal() {
  const { data, errors } = collectFormData();
  if (errors.length) {
    setFeedback('error', `Sauvegarde refusée : ${errors.join(' | ')}`);
    return;
  }

  if (!data.storage_slot) {
    data.storage_slot = defaultStorageSlot(data);
    $('storageSlot').value = data.storage_slot;
  }

  localStorage.setItem(storageKey(data.storage_slot), JSON.stringify(data));
  localStorage.setItem(STORAGE_PREFIX + '__last__', data.storage_slot);

  renderReport(data);
  setFeedback('ok', `Sauvegarde localStorage réussie : ${data.storage_slot}`);
}

function loadLocal() {
  let slot = $('storageSlot').value.trim();
  if (!slot) {
    slot = localStorage.getItem(STORAGE_PREFIX + '__last__') || '';
  }

  if (!slot) {
    fillForm({ ...SAMPLE, storage_slot: defaultStorageSlot(SAMPLE) });
    setFeedback('warn', 'Aucune sauvegarde trouvée. Exemple chargé.');
    return;
  }

  const raw = localStorage.getItem(storageKey(slot));
  if (!raw) {
    setFeedback('error', `Aucune sauvegarde trouvée pour : ${slot}`);
    return;
  }

  try {
    const data = JSON.parse(raw);
    fillForm(data);
    setFeedback('ok', `Données rechargées depuis le localStorage : ${slot}`);
  } catch {
    setFeedback('error', 'Sauvegarde locale corrompue.');
  }
}

function init() {
  fillForm({ ...SAMPLE, storage_slot: defaultStorageSlot(SAMPLE) });
  loadLocal();

  $('btnSample').addEventListener('click', () => {
    fillForm({ ...SAMPLE, storage_slot: defaultStorageSlot(SAMPLE) });
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
    if (!data.storage_slot) {
      data.storage_slot = defaultStorageSlot(data);
      $('storageSlot').value = data.storage_slot;
    }
    renderReport(data);
    setFeedback('ok', 'Aperçu mis à jour. Impression en cours…');
    setTimeout(() => window.print(), 150);
  });

  $('nomFs').addEventListener('blur', () => {
    if (!$('storageSlot').value.trim() && $('nomFs').value.trim() && $('periodeLabel').value.trim()) {
      $('storageSlot').value = defaultStorageSlot({
        nom_fs: $('nomFs').value,
        periode_label: $('periodeLabel').value
      });
    }
  });

  $('periodeLabel').addEventListener('blur', () => {
    if (!$('storageSlot').value.trim() && $('nomFs').value.trim() && $('periodeLabel').value.trim()) {
      $('storageSlot').value = defaultStorageSlot({
        nom_fs: $('nomFs').value,
        periode_label: $('periodeLabel').value
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
