import { EXTRACTOR_REGISTRY } from './extractors.js';
import { RENDERERS } from './render.js';
import { DIFF_REGISTRY } from './diff.js';
import { DIFF_RENDERERS } from './diffRender.js';
import { processBatch, extractHtmlFilesFromZip } from './batch.js';
import { renderBatchSummary } from './batchRender.js';
import { downloadFile, toCSV } from './utils.js';
import { EXAMPLE_HTML, EXAMPLE_HTML_B } from './example.js';

const els = {
  src: document.getElementById('src'),
  srcA: document.getElementById('srcA'),
  srcB: document.getElementById('srcB'),
  fileInput: document.getElementById('fileInput'),
  fileInputA: document.getElementById('fileInputA'),
  fileInputB: document.getElementById('fileInputB'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  compareBtn: document.getElementById('compareBtn'),
  clearBtn: document.getElementById('clearBtn'),
  clearCompareBtn: document.getElementById('clearCompareBtn'),
  exampleBtn: document.getElementById('exampleBtn'),
  exampleCompareBtn: document.getElementById('exampleCompareBtn'),
  charcount: document.getElementById('charcount'),
  statusline: document.getElementById('statusline'),
  layout: document.getElementById('layout'),
  emptyState: document.getElementById('emptyState'),
  moduleNav: document.getElementById('moduleNav'),
  panelTitle: document.getElementById('panelTitle'),
  panelSub: document.getElementById('panelSub'),
  panelBody: document.getElementById('panelBody'),
  exportbar: document.getElementById('exportbar'),
  filterbox: document.getElementById('filterbox'),
  backToBatchBtn: document.getElementById('backToBatchBtn'),
  modeSingleBtn: document.getElementById('modeSingleBtn'),
  modeCompareBtn: document.getElementById('modeCompareBtn'),
  modeBatchBtn: document.getElementById('modeBatchBtn'),
  singleInput: document.getElementById('singleInput'),
  compareInput: document.getElementById('compareInput'),
  batchInput: document.getElementById('batchInput'),
  batchFileInput: document.getElementById('batchFileInput'),
  batchZipInput: document.getElementById('batchZipInput'),
  batchFileList: document.getElementById('batchFileList'),
  batchAnalyzeBtn: document.getElementById('batchAnalyzeBtn'),
  clearBatchBtn: document.getElementById('clearBatchBtn'),
};

let mode = 'single';       // qué panel de entrada se ve: 'single' | 'compare' | 'batch'
let resultMode = 'single'; // cómo se renderiza el panel de resultados: 'single' | 'compare'
let currentData = null;    // id -> datos del extractor (single, o detalle de un fichero del lote)
let currentDiff = null;    // id -> datos del diff (compare)
let currentRender = null;
let activeId = 'meta';

let pendingBatchFiles = []; // [{name, raw}] listos para analizar
let batchResult = null;     // { rows, details } tras procesar
let batchView = 'summary';  // 'summary' | 'detail'
let batchActiveFile = null;

// ---------- Modo: analizar uno ----------
function analyze() {
  const raw = els.src.value;
  if (!raw.trim()) {
    els.statusline.textContent = 'pega código HTML antes de analizar';
    return;
  }
  let doc;
  try {
    doc = new DOMParser().parseFromString(raw, 'text/html');
  } catch (e) {
    els.statusline.textContent = 'error al parsear el HTML';
    return;
  }

  currentData = {};
  EXTRACTOR_REGISTRY.forEach(m => { currentData[m.id] = m.run(doc, raw, document); });
  resultMode = 'single';

  els.statusline.textContent = `analizado — ${raw.length.toLocaleString('es-ES')} caracteres`;
  els.layout.classList.remove('no-nav');
  els.backToBatchBtn.style.display = 'none';
  showModuleResults();
}

// ---------- Modo: comparar dos ----------
function compare() {
  const rawA = els.srcA.value;
  const rawB = els.srcB.value;
  if (!rawA.trim() || !rawB.trim()) {
    els.statusline.textContent = 'pega ambas versiones (A y B) antes de comparar';
    return;
  }
  let docA, docB;
  try {
    docA = new DOMParser().parseFromString(rawA, 'text/html');
    docB = new DOMParser().parseFromString(rawB, 'text/html');
  } catch (e) {
    els.statusline.textContent = 'error al parsear alguno de los dos HTML';
    return;
  }

  const dataA = {};
  const dataB = {};
  EXTRACTOR_REGISTRY.forEach(m => {
    dataA[m.id] = m.run(docA, rawA, document);
    dataB[m.id] = m.run(docB, rawB, document);
  });

  currentDiff = {};
  EXTRACTOR_REGISTRY.forEach(m => { currentDiff[m.id] = DIFF_REGISTRY[m.id](dataA[m.id], dataB[m.id]); });
  resultMode = 'compare';

  const totalChanges = Object.values(currentDiff).reduce((s, d) => s + d.count, 0);
  els.statusline.textContent = `comparado — ${totalChanges} cambio(s) detectados en total`;
  els.layout.classList.remove('no-nav');
  els.backToBatchBtn.style.display = 'none';
  showModuleResults();
}

// ---------- Modo lote ----------
function updateBatchFileListHint() {
  els.batchFileList.textContent = pendingBatchFiles.length
    ? `${pendingBatchFiles.length} fichero(s) listos: ${pendingBatchFiles.map(f => f.name).slice(0, 4).join(', ')}${pendingBatchFiles.length > 4 ? '…' : ''}`
    : 'ningún fichero seleccionado';
}

async function loadJSZip() {
  // Import dinámico: solo se carga si el usuario realmente sube un .zip,
  // para no penalizar a quien usa la app en modo simple/comparación.
  const mod = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
  return mod.default || mod;
}

function runBatch() {
  if (!pendingBatchFiles.length) {
    els.statusline.textContent = 'sube uno o varios .html (o un .zip) antes de analizar el lote';
    return;
  }
  batchResult = processBatch(pendingBatchFiles);
  batchView = 'summary';
  els.statusline.textContent = `lote analizado — ${batchResult.rows.length} fichero(s)`;
  showBatchSummary();
}

function showBatchSummary() {
  batchView = 'summary';
  els.layout.style.display = 'grid';
  els.layout.classList.add('no-nav');
  els.emptyState.style.display = 'none';
  els.backToBatchBtn.style.display = 'none';
  els.filterbox.style.display = 'none';

  els.panelTitle.textContent = 'Resumen del lote';
  els.panelSub.textContent = `${batchResult.rows.length} fichero(s) procesados`;

  currentRender = renderBatchSummary(batchResult.rows, (filename) => showBatchDetail(filename));
  els.panelBody.innerHTML = currentRender.html;
  if (currentRender.afterRender) currentRender.afterRender(els.panelBody);

  els.exportbar.innerHTML = '';
  if (currentRender.exportData) {
    const btn = document.createElement('button');
    btn.className = 'ghost';
    btn.textContent = 'Exportar CSV';
    btn.addEventListener('click', () => downloadFile(currentRender.exportName, currentRender.exportData(), currentRender.exportType));
    els.exportbar.appendChild(btn);
  }
}

function showBatchDetail(filename) {
  batchView = 'detail';
  batchActiveFile = filename;
  currentData = batchResult.details[filename];
  resultMode = 'single';
  els.layout.classList.remove('no-nav');
  els.backToBatchBtn.style.display = 'inline-block';
  showModuleResults();
}

els.backToBatchBtn.addEventListener('click', showBatchSummary);

// ---------- Renderizado de módulos (compartido por single, compare-detail y batch-detail) ----------
function showModuleResults() {
  els.layout.style.display = 'grid';
  els.emptyState.style.display = 'none';
  renderNav();
  selectModule(activeId);
}

function renderNav() {
  const source = resultMode === 'single' ? currentData : currentDiff;
  let html = '<div class="modhead">MÓDULOS</div>';
  EXTRACTOR_REGISTRY.forEach(m => {
    const d = source[m.id];
    html += `<button class="modbtn ${m.id === activeId ? 'active' : ''} ${d.flagged ? 'flag' : ''}" data-id="${m.id}">
      <span>${m.label}</span><span class="badge">${d.count}</span></button>`;
  });
  els.moduleNav.innerHTML = html;
  els.moduleNav.querySelectorAll('.modbtn').forEach(btn => {
    btn.addEventListener('click', () => selectModule(btn.dataset.id));
  });
}

function selectModule(id) {
  activeId = id;
  const mod = EXTRACTOR_REGISTRY.find(m => m.id === id);
  const titlePrefix = (mode === 'batch' && batchView === 'detail') ? `[${batchActiveFile}] ` : '';

  if (resultMode === 'single') {
    const data = currentData[id];
    const renderer = RENDERERS[id];
    els.panelTitle.textContent = titlePrefix + mod.label;
    els.panelSub.textContent = `${data.count} elemento(s) encontrados`;
    currentRender = renderer(data, (tableIndex) => {
      const table = data.tables[tableIndex];
      downloadFile(`tabla-${tableIndex + 1}.csv`, toCSV(table.rows), 'text/csv');
    });
  } else {
    const d = currentDiff[id];
    const renderer = DIFF_RENDERERS[id];
    els.panelTitle.textContent = mod.label + ' — comparación';
    els.panelSub.textContent = `${d.count} cambio(s)`;
    currentRender = renderer(d);
  }

  els.panelBody.innerHTML = currentRender.html || '';
  if (currentRender.afterRender) currentRender.afterRender(els.panelBody);

  els.moduleNav.querySelectorAll('.modbtn').forEach(b => b.classList.toggle('active', b.dataset.id === id));

  if (currentRender.filterable) {
    els.filterbox.style.display = 'block';
    els.filterbox.value = '';
    applyFilter('');
  } else {
    els.filterbox.style.display = 'none';
  }

  els.exportbar.innerHTML = '';
  if (currentRender.exportData) {
    const btn = document.createElement('button');
    btn.className = 'ghost';
    btn.textContent = 'Exportar ' + currentRender.exportName.split('.').pop().toUpperCase();
    btn.addEventListener('click', () => {
      const out = currentRender.exportData();
      if (out) downloadFile(currentRender.exportName, out, currentRender.exportType);
    });
    els.exportbar.appendChild(btn);
  }
}

function applyFilter(query) {
  const q = query.trim().toLowerCase();
  const rows = els.panelBody.querySelectorAll('table.data tbody tr');
  let visible = 0;
  rows.forEach(tr => {
    const match = !q || tr.textContent.toLowerCase().includes(q);
    tr.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  if (rows.length) {
    els.panelSub.textContent = q ? `${visible} de ${rows.length} filas coinciden con "${query}"` : els.panelSub.textContent;
  }
}

// ---------- Cambio de modo de entrada ----------
function setMode(newMode) {
  mode = newMode;
  els.modeSingleBtn.classList.toggle('active', mode === 'single');
  els.modeCompareBtn.classList.toggle('active', mode === 'compare');
  els.modeBatchBtn.classList.toggle('active', mode === 'batch');
  els.singleInput.style.display = mode === 'single' ? 'block' : 'none';
  els.compareInput.style.display = mode === 'compare' ? 'block' : 'none';
  els.batchInput.style.display = mode === 'batch' ? 'block' : 'none';
  els.layout.style.display = 'none';
  els.layout.classList.remove('no-nav');
  els.emptyState.style.display = 'grid';
  els.backToBatchBtn.style.display = 'none';
  els.statusline.textContent = {
    single: 'esperando código fuente…',
    compare: 'esperando las dos versiones (A y B)…',
    batch: 'sube varios .html o un .zip…',
  }[mode];
}

els.modeSingleBtn.addEventListener('click', () => setMode('single'));
els.modeCompareBtn.addEventListener('click', () => setMode('compare'));
els.modeBatchBtn.addEventListener('click', () => setMode('batch'));

// ---------- Wiring modo simple ----------
els.analyzeBtn.addEventListener('click', analyze);
els.clearBtn.addEventListener('click', () => {
  els.src.value = '';
  els.layout.style.display = 'none';
  els.emptyState.style.display = 'grid';
  els.statusline.textContent = 'esperando código fuente…';
  updateCharCount();
});
els.exampleBtn.addEventListener('click', () => {
  els.src.value = EXAMPLE_HTML;
  updateCharCount();
  analyze();
});
els.fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => { els.src.value = ev.target.result; updateCharCount(); analyze(); };
  reader.readAsText(file);
});
els.src.addEventListener('input', updateCharCount);

// ---------- Wiring modo comparación ----------
els.compareBtn.addEventListener('click', compare);
els.clearCompareBtn.addEventListener('click', () => {
  els.srcA.value = '';
  els.srcB.value = '';
  els.layout.style.display = 'none';
  els.emptyState.style.display = 'grid';
  els.statusline.textContent = 'esperando las dos versiones (A y B)…';
});
els.exampleCompareBtn.addEventListener('click', () => {
  els.srcA.value = EXAMPLE_HTML;
  els.srcB.value = EXAMPLE_HTML_B;
  compare();
});
els.fileInputA.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => { els.srcA.value = ev.target.result; };
  reader.readAsText(file);
});
els.fileInputB.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => { els.srcB.value = ev.target.result; };
  reader.readAsText(file);
});

// ---------- Wiring modo lote ----------
els.batchFileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  const loaded = await Promise.all(files.map(f => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve({ name: f.name, raw: ev.target.result });
    reader.readAsText(f);
  })));
  pendingBatchFiles = pendingBatchFiles.concat(loaded);
  updateBatchFileListHint();
});

els.batchZipInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  els.batchFileList.textContent = 'leyendo .zip…';
  try {
    const JSZip = await loadJSZip();
    const zip = await JSZip.loadAsync(file);
    const files = await extractHtmlFilesFromZip(zip);
    if (!files.length) {
      els.batchFileList.textContent = 'el .zip no contiene ficheros .html/.htm';
      return;
    }
    pendingBatchFiles = pendingBatchFiles.concat(files);
    updateBatchFileListHint();
  } catch (err) {
    console.error(err);
    els.batchFileList.textContent = 'no se pudo leer el .zip (¿está corrupto o no es un zip válido?)';
  }
});

els.batchAnalyzeBtn.addEventListener('click', runBatch);
els.clearBatchBtn.addEventListener('click', () => {
  pendingBatchFiles = [];
  batchResult = null;
  updateBatchFileListHint();
  els.layout.style.display = 'none';
  els.layout.classList.remove('no-nav');
  els.emptyState.style.display = 'grid';
  els.statusline.textContent = 'sube varios .html o un .zip…';
});

els.filterbox.addEventListener('input', () => applyFilter(els.filterbox.value));

function updateCharCount() {
  const n = els.src.value.length;
  els.charcount.textContent = n ? `${n.toLocaleString('es-ES')} caracteres` : '';
}

// ---------- PWA: registro del service worker ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(err => {
      console.warn('No se pudo registrar el service worker:', err);
    });
  });
}

updateCharCount();
updateBatchFileListHint();
