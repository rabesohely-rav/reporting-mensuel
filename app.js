Chart.register(ChartDataLabels);

const MONTHS = [
  'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'
];

const STORAGE_PREFIX = 'reporting-mensuel-france-services:';

const SAMPLE = {
  nom_fs: '',
  periode_label: 'Mois année',
  nombre_accompagnements: 701,
  storage_slot: 'Reporting',
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

function datalabelPercent(value, ctx) {
  const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
  return percentOf(value, total);
}

function buildPieOptions(legendPosition = 'right', extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 6, ...(extra.layout || {}) },
    plugins: {
      legend: {
        position: legendPosition,
        align: 'center',
        labels: {
          boxWidth: 16,
          boxHeight: 10,
          padding: 14,
          font: { size: 10 },
          usePointStyle: false
        },
        ...(extra.legend || {})
      },
      datalabels: {
        color: '#222',
        formatter: datalabelPercent,
        font: { weight: 'bold', size: 10 },
        anchor: 'end',
        align: 'end',
        offset: 4,
        clamp: true
      }
    },
    ...extra.options
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
    options: buildPieOptions('right', {
      layout: { padding: { top: 0, right: 10, bottom: 0, left: 10 } },
      legend: {
        maxWidth: 180,
        labels: {
          boxWidth: 14,
          padding: 12,
          font: { size: 9 },
          generateLabels(chart) {
            const original = Chart.defaults.plugins.legend.labels.generateLabels(chart);
            return original.map((item, index) => ({
              ...item,
              text: chart.data.labels[index]
            }));
          }
        }
      },
      options: {
        elements: { arc: { borderWidth: 2 } },
        plugins: {
          datalabels: {
            font: { weight: 'bold', size: 11 },
            offset: 5
          }
        }
      }
    })
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
    options: { ...buildPieOptions('right'), cutout: '44%' }
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
      layout: { padding: { top: 16 } },
      plugins: {
        legend: { display: false },
        datalabels: {
          color: '#222',
          formatter: (value) => percentOf(value, total),
          font: { weight: 'bold', size: 10 },
          anchor: 'end',
          align: 'end',
          offset: -2,
          clamp: true
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0, font: { size: 9 } } },
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
            font: { size: 8 },
            callback(value, index) {
              return wrapAxisLabel(rows[index].label, 16);
            }
          }
        }
      }
    }
  });
}


function wrapAxisLabel(text, maxChars = 18) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function getPage1DensityClass(data) {
  const usagers = (data.communes_usagers || []).length;
  const permanences = (data.permanences || []).length;
  const longestUsager = Math.max(0, ...(data.communes_usagers || []).map(r => String(r.label || '').length));
  const longestPermanence = Math.max(0, ...(data.permanences || []).map(r => String(r.label || '').length));
  const pressure = usagers + Math.ceil(permanences * 0.7);

  if (pressure >= 22 || longestUsager >= 24 || longestPermanence >= 20) return 'page1-density-dense';
  if (pressure >= 18 || longestUsager >= 20 || longestPermanence >= 16) return 'page1-density-medium';
  return 'page1-density-normal';
}

function applyPage1Density(data) {
  const page = $('reportPage1');
  page.classList.remove('page1-density-normal', 'page1-density-medium', 'page1-density-dense');
  page.classList.add(getPage1DensityClass(data));
}

function waitForChartsToSettle() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        [chartModalites, chartPartenaires, chartThematiques].filter(Boolean).forEach(chart => chart.resize());
        setTimeout(resolve, 220);
      });
    });
  });
}

function extractYear(label) {
  const match = String(label || '').match(/(20\d{2})/);
  return match ? match[1] : String(new Date().getFullYear());
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
  applyPage1Density(data);

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
  if (!data.periode_label) errors.push('Période obligatoire');

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

function normalizedData(data) {
  return {
    nom_fs: data.nom_fs || '',
    periode_label: data.periode_label || '',
    nombre_accompagnements: Number(data.nombre_accompagnements || 0),
    storage_slot: data.storage_slot || defaultStorageSlot(data),
    communes_usagers: Array.isArray(data.communes_usagers) ? data.communes_usagers : [],
    permanences: Array.isArray(data.permanences) ? data.permanences : [],
    modalites_acces: Array.isArray(data.modalites_acces) ? data.modalites_acces : [],
    partenaires: Array.isArray(data.partenaires) ? data.partenaires : [],
    thematiques: Array.isArray(data.thematiques) ? data.thematiques : [],
    demandes_annee: Array.isArray(data.demandes_annee) && data.demandes_annee.length === 12
      ? data.demandes_annee
      : MONTHS.map(mois => ({ mois, value: 0 }))
  };
}

function fillForm(data) {
  const d = normalizedData(data);
  $('nomFs').value = d.nom_fs;
  $('periodeLabel').value = d.periode_label;
  $('nombreAccompagnements').value = d.nombre_accompagnements;
  $('storageSlot').value = d.storage_slot;
  $('inputCommunesUsagers').value = serializePairs(d.communes_usagers);
  $('inputPermanences').value = serializePairs(d.permanences);
  $('inputModalites').value = serializePairs(d.modalites_acces);
  $('inputPartenaires').value = serializePairs(d.partenaires);
  $('inputThematiques').value = serializePairs(d.thematiques);
  renderYearEditor(d.demandes_annee);
  renderReport(d);
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
  setFeedback('ok', `Sauvegarde réussie : ${data.storage_slot}`);
}

function loadLocal() {
  let slot = $('storageSlot').value.trim();
  if (!slot) slot = localStorage.getItem(STORAGE_PREFIX + '__last__') || '';

  if (!slot) {
    fillForm(SAMPLE);
    setFeedback('warn', 'Aucune sauvegarde trouvée. Exemple chargé.');
    return;
  }

  const raw = localStorage.getItem(storageKey(slot));
  if (!raw) {
    fillForm(SAMPLE);
    $('storageSlot').value = 'Reporting';
    setFeedback('warn', `Aucune sauvegarde trouvée pour : ${slot}. Exemple chargé.`);
    return;
  }

  try {
    const data = JSON.parse(raw);
    fillForm(data);
    setFeedback('ok', `Données rechargées : ${slot}`);
  } catch {
    setFeedback('error', 'Sauvegarde locale corrompue.');
  }
}


function buildPrintableData() {
  const { data, errors } = collectFormData();
  const printable = normalizedData({
    ...SAMPLE,
    ...data,
    nom_fs: data.nom_fs || 'Nom de la France Services',
    periode_label: data.periode_label || 'Mois année',
    storage_slot: data.storage_slot || 'Reporting'
  });

  if (!printable.storage_slot) printable.storage_slot = 'Reporting';
  $('storageSlot').value = printable.storage_slot;

  return { printable, errors };
}

async function printReport() {
  const { printable, errors } = buildPrintableData();
  renderReport(printable);

  if (errors.length) {
    setFeedback('warn', `Impression lancée avec valeurs par défaut pour : ${errors.join(' | ')}`);
  } else {
    setFeedback('ok', 'Impression prête.');
  }

  await waitForChartsToSettle();
  window.print();
}

function init() {
  fillForm(SAMPLE);
  $('storageSlot').value = 'Reporting';
  loadLocal();
  if (!$('storageSlot').value.trim()) $('storageSlot').value = 'Reporting';

  $('btnSample').addEventListener('click', () => {
    fillForm(SAMPLE);
    setFeedback('ok', 'Exemple chargé.');
  });

  $('btnSaveLocal').addEventListener('click', saveLocal);
  $('btnLoadLocal').addEventListener('click', loadLocal);

  $('btnPrint').addEventListener('click', printReport);

  function autoSlot() {
    if (!$('storageSlot').value.trim() || $('storageSlot').value.trim() === 'Reporting') {
      $('storageSlot').value = 'Reporting';
    }
  }

  $('nomFs').addEventListener('blur', autoSlot);
  $('periodeLabel').addEventListener('blur', autoSlot);

  window.addEventListener('beforeprint', () => {
    [chartModalites, chartPartenaires, chartThematiques].filter(Boolean).forEach(chart => chart.resize());
  });

  window.addEventListener('afterprint', () => {
    [chartModalites, chartPartenaires, chartThematiques].filter(Boolean).forEach(chart => chart.resize());
  });
}

document.addEventListener('DOMContentLoaded', init);
