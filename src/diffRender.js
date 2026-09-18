import { esc } from './utils.js';

function chip(n, label, warn) {
  return `<span class="chip"><b style="color:${n && warn ? 'var(--warn)' : 'inherit'}">${n}</b> ${label}</span>`;
}

function addedRemovedList(added, removed, formatItem) {
  let html = '<div class="meta-group"><h3>Añadido</h3>';
  html += added.length
    ? '<table class="data"><tbody>' + added.map(item => `<tr><td class="mono" style="color:var(--accent)">+ ${formatItem(item)}</td></tr>`).join('') + '</tbody></table>'
    : '<div class="empty">Nada añadido.</div>';
  html += '</div><div class="meta-group"><h3>Eliminado</h3>';
  html += removed.length
    ? '<table class="data"><tbody>' + removed.map(item => `<tr><td class="mono" style="color:var(--danger)">− ${formatItem(item)}</td></tr>`).join('') + '</tbody></table>'
    : '<div class="empty">Nada eliminado.</div>';
  html += '</div>';
  return html;
}

export function renderDiffMeta(d) {
  let html = `<div class="taginfo">${chip(d.count, 'campos cambiados', true)}</div>`;
  if (!d.count) return { html: html + '<div class="empty">Sin cambios en metadatos.</div>' };
  const rows = [...d.changed.map(c => ({ ...c, group: 'General' })), ...d.ogDiff.map(c => ({ ...c, group: 'Open Graph' })), ...d.twitterDiff.map(c => ({ ...c, group: 'Twitter Card' }))];
  html += '<table class="data"><thead><tr><th>grupo</th><th>campo</th><th>antes</th><th>después</th></tr></thead><tbody>';
  rows.forEach(c => {
    html += `<tr><td class="mono dim">${esc(c.group)}</td><td class="mono">${esc(c.field)}</td>
      <td style="color:var(--danger)">${esc(c.before) || '<span class="dim">—</span>'}</td>
      <td style="color:var(--accent)">${esc(c.after) || '<span class="dim">—</span>'}</td></tr>`;
  });
  html += '</tbody></table>';
  return { html };
}

export function renderDiffLinks(d) {
  const html = `<div class="taginfo">${chip(d.added.length, 'añadidos')}${chip(d.removed.length, 'eliminados')}</div>` +
    addedRemovedList(d.added, d.removed, l => `${esc(l.href)} <span class="dim">${esc(l.text)}</span>`);
  return { html };
}

export function renderDiffImages(d) {
  const html = `<div class="taginfo">${chip(d.added.length, 'añadidas')}${chip(d.removed.length, 'eliminadas')}</div>` +
    addedRemovedList(d.added, d.removed, i => esc(i.src));
  return { html };
}

export function renderDiffHeadings(d) {
  let html = `<div class="taginfo">${chip(d.added.length, 'añadidos')}${chip(d.removed.length, 'eliminados')}`;
  if (d.h1CountBefore !== d.h1CountAfter) html += `<span class="chip">H1: <b>${d.h1CountBefore}</b> → <b>${d.h1CountAfter}</b></span>`;
  html += '</div>';
  html += addedRemovedList(d.added, d.removed, h => `H${h.level} — ${esc(h.text)}`);
  return { html };
}

export function renderDiffAssets(d) {
  let html = `<div class="taginfo">${chip(d.count, 'cambios totales', true)}</div>`;
  html += '<div class="meta-group"><h3>Scripts</h3>' + addedRemovedList(d.scripts.added, d.scripts.removed, s => esc(s.src || '(inline)')) + '</div>';
  html += '<div class="meta-group"><h3>Hojas de estilo</h3>' + addedRemovedList(d.stylesheets.added, d.stylesheets.removed, s => esc(s.href)) + '</div>';
  html += '<div class="meta-group"><h3>Dominios de terceros</h3>' + addedRemovedList(d.domains.added, d.domains.removed, v => esc(v)) + '</div>';
  return { html };
}

export function renderDiffForms(d) {
  const html = `<div class="taginfo">
    <span class="chip">Formularios: <b>${d.formsBefore}</b> → <b>${d.formsAfter}</b></span>
    <span class="chip">Campos totales: <b>${d.fieldsBefore}</b> → <b>${d.fieldsAfter}</b></span>
  </div>` + (d.flagged ? '' : '<div class="empty">Sin cambios estructurales en formularios.</div>');
  return { html };
}

export function renderDiffTables(d) {
  const html = `<div class="taginfo">
    <span class="chip">Tablas: <b>${d.tablesBefore}</b> → <b>${d.tablesAfter}</b></span>
    <span class="chip">Filas totales: <b>${d.rowsBefore}</b> → <b>${d.rowsAfter}</b></span>
  </div>` + (d.flagged ? '' : '<div class="empty">Sin cambios en tablas.</div>');
  return { html };
}

export function renderDiffText(d) {
  const html = `<div class="taginfo">
    <span class="chip">Palabras: <b>${d.wordsBefore}</b> → <b>${d.wordsAfter}</b></span>
    <span class="chip">Caracteres: <b>${d.charsBefore}</b> → <b>${d.charsAfter}</b></span>
    ${d.contentChanged ? '<span class="chip"><span class="pill warn">contenido modificado</span></span>' : ''}
  </div>` + (d.contentChanged ? '' : '<div class="empty">El texto visible no ha cambiado.</div>');
  return { html };
}

export function renderDiffTagCounts(d) {
  if (!d.changed.length) return { html: '<div class="empty">Sin cambios en el conteo de etiquetas.</div>' };
  let html = `<div class="taginfo">${chip(d.changed.length, 'etiquetas con cambios', true)}</div>`;
  html += '<table class="data"><thead><tr><th>etiqueta</th><th>antes</th><th>después</th><th>delta</th></tr></thead><tbody>';
  d.changed.forEach(c => {
    const color = c.delta > 0 ? 'var(--accent)' : 'var(--danger)';
    html += `<tr><td class="mono">&lt;${esc(c.tag)}&gt;</td><td class="mono dim">${c.before}</td><td class="mono dim">${c.after}</td>
      <td class="mono" style="color:${color}">${c.delta > 0 ? '+' : ''}${c.delta}</td></tr>`;
  });
  html += '</tbody></table>';
  return { html };
}

export function renderDiffMisc(d) {
  let html = `<div class="taginfo">${chip(d.count, 'cambios totales', true)}</div>`;
  html += '<div class="meta-group"><h3>Emails</h3>' + addedRemovedList(d.emails.added, d.emails.removed, v => esc(v)) + '</div>';
  html += '<div class="meta-group"><h3>Teléfonos</h3>' + addedRemovedList(d.phones.added, d.phones.removed, v => esc(v)) + '</div>';
  html += '<div class="meta-group"><h3>Colores</h3>' + addedRemovedList(d.colors.added, d.colors.removed, v => esc(v)) + '</div>';
  html += '<div class="meta-group"><h3>Comentarios ocultos</h3>' + addedRemovedList(d.comments.added, d.comments.removed, v => esc(v)) + '</div>';
  if (d.jsonldChanged) html += '<div class="meta-group"><h3>JSON-LD</h3><div class="empty" style="border:1px solid var(--line-soft);">Los bloques de datos estructurados han cambiado.</div></div>';
  return { html };
}

export function renderDiffAccessibility(d) {
  let html = `<div class="taginfo">
    ${chip(d.added.length, 'problemas nuevos', true)}${chip(d.removed.length, 'problemas resueltos')}
    <span class="chip">Errores: <b>${d.errorsBefore}</b> → <b style="color:${d.errorsAfter > d.errorsBefore ? 'var(--danger)' : 'var(--accent)'}">${d.errorsAfter}</b></span>
  </div>`;
  html += addedRemovedList(d.added, d.removed, i => `<span class="pill ${i.severity === 'error' ? 'warn' : ''}">${i.severity}</span> ${esc(i.rule)} — ${esc(i.detail)}`);
  return { html };
}

export const DIFF_RENDERERS = {
  meta: renderDiffMeta, links: renderDiffLinks, images: renderDiffImages, headings: renderDiffHeadings,
  assets: renderDiffAssets, forms: renderDiffForms, tables: renderDiffTables, text: renderDiffText,
  tagcounts: renderDiffTagCounts, misc: renderDiffMisc, a11y: renderDiffAccessibility,
};
