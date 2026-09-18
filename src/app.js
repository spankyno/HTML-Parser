import { EXTRACTOR_REGISTRY } from './extractors.js';
import { RENDERERS } from './render.js';
import { DIFF_REGISTRY } from './diff.js';
import { DIFF_RENDERERS } from './diffRender.js';
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
  modeSingleBtn: document.getElementById('modeSingleBtn'),
  modeCompareBtn: document.getElementById('modeCompareBtn'),
  singleInput: document.getElementById('singleInput'),
  compareInput: document.getElementById('compareInput'),
};

let mode = 'single'; // 'single' | 'compare'
let currentData = null;   // modo single: id -> datos del extractor
let currentDiff = null;   // modo compare: id -> datos del diff
let currentRender = null;
let activeId = 'meta';

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
  currentDiff = null;
  EXTRACTOR_REGISTRY.forEach(mod => { currentData[mod.id] = mod.run(doc, raw, document); });

  els.statusline.textContent = `analizado — ${raw.length.toLocaleString('es-ES')} caracteres`;
  showResults();
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
  EXTRACTOR_REGISTRY.forEach(mod => {
    dataA[mod.id] = mod.run(docA, rawA, document);
    dataB[mod.id] = mod.run(docB, rawB, document);
  });

  currentDiff = {};
  currentData = null;
  EXTRACTOR_REGISTRY.forEach(mod => {
    currentDiff[mod.id] = DIFF_REGISTRY[mod.id](dataA[mod.id], dataB[mod.id]);
  });

  const totalChanges = Object.values(currentDiff).reduce((s, d) => s + d.count, 0);
  els.statusline.textContent = `comparado — ${totalChanges} cambio(s) detectados en total`;
  showResults();
}

function showResults() {
  els.layout.style.display = 'grid';
  els.emptyState.style.display = 'none';
  renderNav();
  selectModule(activeId);
}

function renderNav() {
  const source = mode === 'single' ? currentData : currentDiff;
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

  if (mode === 'single') {
    const data = currentData[id];
    const renderer = RENDERERS[id];
    els.panelTitle.textContent = mod.label;
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

// ---------- Cambio de modo ----------
function setMode(newMode) {
  mode = newMode;
  els.modeSingleBtn.classList.toggle('active', mode === 'single');
  els.modeCompareBtn.classList.toggle('active', mode === 'compare');
  els.singleInput.style.display = mode === 'single' ? 'block' : 'none';
  els.compareInput.style.display = mode === 'compare' ? 'block' : 'none';
  els.layout.style.display = 'none';
  els.emptyState.style.display = 'grid';
  els.statusline.textContent = mode === 'single' ? 'esperando código fuente…' : 'esperando las dos versiones (A y B)…';
}

els.modeSingleBtn.addEventListener('click', () => setMode('single'));
els.modeCompareBtn.addEventListener('click', () => setMode('compare'));

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
