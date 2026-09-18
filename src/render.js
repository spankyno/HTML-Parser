import { esc, toCSV } from './utils.js';

// Cada renderer recibe los datos ya calculados por el extractor y devuelve
// { html, exportData, exportName, exportType } — no vuelve a tocar el DOM origen.

export function renderMeta(data) {
  let html = '<div class="meta-group"><h3>General</h3><dl class="kv">';
  const rows = [
    ['Título', data.title], ['Charset', data.charset], ['Idioma (lang)', data.lang],
    ['Viewport', data.viewport], ['Descripción', data.description], ['Keywords', data.keywords],
    ['Canonical', data.canonical], ['Robots', data.robots], ['Autor', data.author], ['Generador (CMS)', data.generator],
  ];
  rows.forEach(([k, v]) => {
    html += `<dt>${esc(k)}</dt><dd>${v ? esc(v) : '<span class="dim">— no presente —</span>'}</dd>`;
  });
  html += '</dl></div>';

  if (data.favicons.length) {
    html += '<div class="meta-group"><h3>Favicons / iconos</h3><table class="data"><thead><tr><th>rel</th><th>href</th><th>sizes</th></tr></thead><tbody>';
    data.favicons.forEach(f => html += `<tr><td class="mono">${esc(f.rel)}</td><td class="mono">${esc(f.href)}</td><td class="mono dim">${esc(f.sizes) || '—'}</td></tr>`);
    html += '</tbody></table></div>';
  }
  if (Object.keys(data.og).length) {
    html += '<div class="meta-group"><h3>Open Graph</h3><dl class="kv">';
    Object.entries(data.og).forEach(([k, v]) => html += `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`);
    html += '</dl></div>';
  }
  if (Object.keys(data.twitter).length) {
    html += '<div class="meta-group"><h3>Twitter Card</h3><dl class="kv">';
    Object.entries(data.twitter).forEach(([k, v]) => html += `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`);
    html += '</dl></div>';
  }
  return {
    html,
    exportData: () => JSON.stringify(data, null, 2),
    exportName: 'meta.json', exportType: 'application/json',
  };
}

export function renderLinks(data) {
  const { links } = data;
  if (!links.length) return { html: '<div class="empty">No hay enlaces &lt;a href&gt; en el documento.</div>' };
  let html = `<div class="taginfo"><span class="chip"><b>${links.length}</b> enlaces totales</span></div>`;
  html += '<table class="data"><thead><tr><th>href</th><th>texto</th><th>rel</th><th>target</th></tr></thead><tbody>';
  links.forEach(l => {
    html += `<tr><td class="mono">${esc(l.href) || '<span class="pill warn">vacío</span>'} ${l.external ? '<span class="pill ext">externo</span>' : ''}</td>
      <td>${esc(l.text) || '<span class="dim">—</span>'}</td>
      <td class="mono dim">${esc(l.rel) || '—'}</td>
      <td class="mono dim">${esc(l.target) || '—'}</td></tr>`;
  });
  html += '</tbody></table>';
  return {
    html,
    exportData: () => toCSV([['href', 'texto', 'rel', 'target'], ...links.map(l => [l.href, l.text, l.rel, l.target])]),
    exportName: 'links.csv', exportType: 'text/csv',
    filterable: true,
  };
}

export function renderImages(data) {
  const { images, missingAlt } = data;
  if (!images.length) return { html: '<div class="empty">No hay etiquetas &lt;img&gt; en el documento.</div>' };
  let html = `<div class="taginfo"><span class="chip"><b>${images.length}</b> imágenes</span>
    <span class="chip"><b style="color:${missingAlt ? 'var(--warn)' : 'inherit'}">${missingAlt}</b> sin atributo alt</span></div>`;
  html += '<table class="data"><thead><tr><th>src</th><th>alt</th><th>width</th><th>height</th></tr></thead><tbody>';
  images.forEach(i => {
    html += `<tr><td class="mono">${esc(i.src) || '<span class="dim">—</span>'}</td>
      <td>${i.missingAlt ? '<span class="pill warn">falta alt</span>' : esc(i.alt)}</td>
      <td class="mono dim">${esc(i.width) || '—'}</td>
      <td class="mono dim">${esc(i.height) || '—'}</td></tr>`;
  });
  html += '</tbody></table>';
  return {
    html,
    exportData: () => toCSV([['src', 'alt', 'width', 'height'], ...images.map(i => [i.src, i.alt, i.width, i.height])]),
    exportName: 'imagenes.csv', exportType: 'text/csv',
    filterable: true,
  };
}

export function renderAssets(data) {
  const { scripts, stylesheets, inlineStyleBlocks, domains } = data;
  const externalScripts = scripts.filter(s => s.src);
  let html = `<div class="taginfo">
    <span class="chip"><b>${scripts.length}</b> scripts (${externalScripts.length} externos)</span>
    <span class="chip"><b>${stylesheets.length}</b> hojas de estilo externas</span>
    <span class="chip"><b>${inlineStyleBlocks}</b> bloques &lt;style&gt; inline</span>
  </div>`;
  html += '<div class="meta-group"><h3>Scripts</h3>';
  html += scripts.length
    ? '<table class="data"><thead><tr><th>tipo</th><th>src</th><th>async</th><th>defer</th></tr></thead><tbody>' +
      scripts.map(s => `<tr><td class="mono">${s.inline ? '<span class="pill">inline</span>' : '<span class="pill ext">externo</span>'} ${esc(s.type)}</td>
        <td class="mono">${esc(s.src) || '<span class="dim">— código embebido —</span>'}</td>
        <td class="mono dim">${s.async ? 'sí' : '—'}</td><td class="mono dim">${s.defer ? 'sí' : '—'}</td></tr>`).join('') +
      '</tbody></table>'
    : '<div class="empty">Sin scripts.</div>';
  html += '</div>';

  html += '<div class="meta-group"><h3>Hojas de estilo externas</h3>';
  html += stylesheets.length
    ? '<table class="data"><thead><tr><th>href</th></tr></thead><tbody>' + stylesheets.map(s => `<tr><td class="mono">${esc(s.href)}</td></tr>`).join('') + '</tbody></table>'
    : '<div class="empty">Sin hojas de estilo externas.</div>';
  html += '</div>';

  if (domains.length) {
    html += `<div class="meta-group"><h3>Dominios externos que carga la página</h3><div class="taginfo">${domains.map(d => `<span class="chip mono">${esc(d)}</span>`).join('')}</div></div>`;
  }
  return {
    html,
    exportData: () => JSON.stringify(data, null, 2),
    exportName: 'assets.json', exportType: 'application/json',
  };
}

export function renderHeadings(data) {
  const { headings, h1Count, skipDetected } = data;
  let html = `<div class="taginfo">
    <span class="chip"><b>${headings.length}</b> encabezados</span>
    <span class="chip"><b style="color:${h1Count !== 1 ? 'var(--warn)' : 'inherit'}">${h1Count}</b> etiqueta(s) H1 ${h1Count !== 1 ? '<span class="pill warn">debería haber exactamente 1</span>' : ''}</span>
    ${skipDetected ? '<span class="chip"><span class="pill warn">salto de nivel detectado</span></span>' : ''}
  </div>`;
  if (!headings.length) return { html: html + '<div class="empty">No hay encabezados H1–H6.</div>' };

  html += '<div class="heading-tree">';
  let prev = 0;
  headings.forEach(h => {
    const skip = prev && h.level > prev + 1;
    prev = h.level;
    const indent = (h.level - 1) * 18;
    html += `<div class="heading-row ${skip ? 'skip' : ''}" style="padding-left:${indent}px">
      <span class="tag">H${h.level}</span><span class="txt">${esc(h.text) || '<span class="dim">(vacío)</span>'}</span></div>`;
  });
  html += '</div>';
  return {
    html,
    exportData: () => toCSV([['nivel', 'texto'], ...headings.map(h => ['H' + h.level, h.text])]),
    exportName: 'headings.csv', exportType: 'text/csv',
  };
}

export function renderForms(data) {
  const { forms } = data;
  if (!forms.length) return { html: '<div class="empty">No hay formularios &lt;form&gt; en el documento.</div>' };
  let html = '';
  forms.forEach((f, idx) => {
    html += `<div class="card-form"><div class="fh"><span><b>Formulario ${idx + 1}</b></span>
      <span>método: <b class="mono">${esc(f.method)}</b></span>
      <span>action: <b class="mono">${esc(f.action) || '(mismo documento)'}</b></span>
      <span><b>${f.fields.length}</b> campos</span></div>`;
    if (f.fields.length) {
      html += '<table class="data"><thead><tr><th>elemento</th><th>tipo</th><th>name</th><th>required</th><th>placeholder</th></tr></thead><tbody>';
      f.fields.forEach(fl => {
        html += `<tr><td class="mono">${esc(fl.tag)}</td><td class="mono dim">${esc(fl.type)}</td>
          <td class="mono">${esc(fl.name) || '<span class="dim">—</span>'}</td>
          <td>${fl.required ? '<span class="pill ok">sí</span>' : '<span class="dim">—</span>'}</td>
          <td class="dim">${esc(fl.placeholder) || '—'}</td></tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
  });
  return { html, exportData: () => JSON.stringify(forms, null, 2), exportName: 'formularios.json', exportType: 'application/json' };
}

export function renderTables(data, onExportTable) {
  const { tables } = data;
  if (!tables.length) return { html: '<div class="empty">No se detectaron etiquetas &lt;table&gt; en el documento.</div>' };
  let html = `<div class="taginfo"><span class="chip"><b>${tables.length}</b> tabla(s) detectada(s)</span></div>`;
  tables.forEach((t, i) => {
    const maxRows = 8;
    html += `<div class="meta-group"><h3>Tabla ${i + 1} (${t.rows.length} filas × ${t.rows[0] ? t.rows[0].length : 0} columnas)
      <button class="ghost tablebtn" data-table-index="${i}" style="margin-left:10px;padding:3px 8px;font-size:11px;">exportar CSV</button></h3>`;
    html += '<table class="data"><tbody>';
    t.rows.slice(0, maxRows).forEach(r => html += '<tr>' + r.map(c => `<td>${esc(c)}</td>`).join('') + '</tr>');
    html += '</tbody></table>';
    if (t.rows.length > maxRows) html += `<div class="hint" style="margin-top:6px;">… y ${t.rows.length - maxRows} filas más (incluidas en la exportación)</div>`;
    html += '</div>';
  });
  return {
    html,
    exportData: () => tables.map((t, i) => `--- Tabla ${i + 1} ---\n` + toCSV(t.rows)).join('\n\n'),
    exportName: 'tablas.csv', exportType: 'text/csv',
    afterRender(container) {
      container.querySelectorAll('.tablebtn').forEach(btn => {
        btn.addEventListener('click', () => onExportTable(parseInt(btn.dataset.tableIndex, 10)));
      });
    },
  };
}

export function renderPlainText(data) {
  return {
    html: `<div class="taginfo"><span class="chip"><b>${data.words}</b> palabras</span><span class="chip"><b>${data.text.length}</b> caracteres</span></div>
      <pre class="plaintext">${esc(data.text) || '(sin contenido de texto visible)'}</pre>`,
    exportData: () => data.text, exportName: 'texto.txt', exportType: 'text/plain',
  };
}

export function renderTagCounts(data) {
  const { sorted, totalElements } = data;
  let html = `<div class="taginfo"><span class="chip"><b>${totalElements}</b> elementos totales</span><span class="chip"><b>${sorted.length}</b> tipos de etiqueta distintos</span></div>`;
  html += '<table class="data"><thead><tr><th>etiqueta</th><th>cantidad</th><th></th></tr></thead><tbody>';
  const max = sorted.length ? sorted[0][1] : 1;
  sorted.forEach(([tag, n]) => {
    const pct = Math.max(4, Math.round((n / max) * 100));
    html += `<tr><td class="mono">&lt;${esc(tag)}&gt;</td><td class="mono">${n}</td>
      <td><div style="height:8px;background:var(--line-soft);width:160px;"><div style="height:8px;background:var(--accent);width:${pct}%;"></div></div></td></tr>`;
  });
  html += '</tbody></table>';
  return { html, exportData: () => toCSV([['etiqueta', 'cantidad'], ...sorted]), exportName: 'conteo-etiquetas.csv', exportType: 'text/csv' };
}

export function renderMisc(data) {
  const { comments, emails, phones, jsonld, colors } = data;
  let html = '<div class="meta-group"><h3>Datos estructurados (JSON-LD)</h3>';
  html += jsonld.length ? jsonld.map(j => `<pre class="plaintext">${esc(JSON.stringify(j, null, 2))}</pre>`).join('') : '<div class="empty">No se encontraron bloques JSON-LD.</div>';
  html += '</div>';

  html += `<div class="meta-group"><h3>Comentarios HTML ocultos (${comments.length})</h3>`;
  html += comments.length ? ('<table class="data"><tbody>' + comments.map(c => `<tr><td class="mono dim">${esc(c)}</td></tr>`).join('') + '</tbody></table>') : '<div class="empty">No hay comentarios en el código.</div>';
  html += '</div>';

  html += `<div class="meta-group"><h3>Emails encontrados (${emails.length})</h3>`;
  html += emails.length ? `<div class="taginfo">${emails.map(e => `<span class="chip mono">${esc(e)}</span>`).join('')}</div>` : '<div class="empty">Ninguno.</div>';
  html += '</div>';

  html += `<div class="meta-group"><h3>Posibles teléfonos (${phones.length})</h3>`;
  html += phones.length ? `<div class="taginfo">${phones.map(p => `<span class="chip mono">${esc(p.trim())}</span>`).join('')}</div>` : '<div class="empty">Ninguno detectado.</div>';
  html += '</div>';

  html += `<div class="meta-group"><h3>Colores hexadecimales en el código (${colors.length})</h3>`;
  html += colors.length ? `<div class="taginfo">${colors.map(c => `<span class="chip mono" style="border-color:${esc(c)}"><span style="display:inline-block;width:10px;height:10px;background:${esc(c)};margin-right:6px;vertical-align:middle;border:1px solid var(--line)"></span>${esc(c)}</span>`).join('')}</div>` : '<div class="empty">Ninguno.</div>';
  html += '</div>';

  return { html, exportData: () => JSON.stringify(data, null, 2), exportName: 'otros-datos.json', exportType: 'application/json' };
}

export function renderAccessibility(data) {
  const { issues, errors, warnings } = data;
  let html = `<div class="taginfo">
    <span class="chip"><b style="color:${errors ? 'var(--danger)' : 'inherit'}">${errors}</b> errores</span>
    <span class="chip"><b style="color:${warnings ? 'var(--warn)' : 'inherit'}">${warnings}</b> avisos</span>
  </div>`;

  if (!issues.length) {
    return {
      html: html + '<div class="empty">No se detectaron problemas de accesibilidad con las reglas comprobadas. Esto no sustituye una auditoría manual completa.</div>',
      exportData: () => JSON.stringify(data, null, 2), exportName: 'accesibilidad.json', exportType: 'application/json',
    };
  }

  html += '<table class="data"><thead><tr><th>severidad</th><th>regla</th><th>descripción</th><th>detalle</th></tr></thead><tbody>';
  issues.forEach(i => {
    const pillClass = i.severity === 'error' ? 'pill warn' : 'pill';
    const label = i.severity === 'error' ? 'error' : 'aviso';
    html += `<tr><td><span class="${pillClass}" style="${i.severity === 'error' ? 'border-color:var(--danger);color:var(--danger)' : ''}">${label}</span></td>
      <td class="mono dim">${esc(i.rule)}</td>
      <td>${esc(i.message)}</td>
      <td class="mono dim">${esc(i.detail)}</td></tr>`;
  });
  html += '</tbody></table>';
  html += '<div class="hint" style="margin-top:14px;">Estas comprobaciones cubren patrones estructurales (etiquetas, atributos, jerarquía). No sustituyen una auditoría de contraste de color renderizado ni una revisión con lector de pantalla real.</div>';

  return {
    html,
    exportData: () => JSON.stringify(data, null, 2),
    exportName: 'accesibilidad.json', exportType: 'application/json',
    filterable: true,
  };
}

export const RENDERERS = {
  meta: renderMeta, links: renderLinks, images: renderImages, assets: renderAssets,
  headings: renderHeadings, forms: renderForms, tables: renderTables,
  text: renderPlainText, tagcounts: renderTagCounts, misc: renderMisc,
  a11y: renderAccessibility,
};
