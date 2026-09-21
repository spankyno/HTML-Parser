import { esc, toCSV } from './utils.js';

export function renderBatchSummary(rows, onSelectFile) {
  if (!rows.length) {
    return { html: '<div class="empty">No se ha procesado ningún fichero.</div>' };
  }

  const ok = rows.filter(r => !r.error);
  const errors = rows.filter(r => r.error);

  let html = `<div class="taginfo">
    <span class="chip"><b>${rows.length}</b> ficheros procesados</span>
    ${errors.length ? `<span class="chip"><b style="color:var(--danger)">${errors.length}</b> con error de parseo</span>` : ''}
  </div>`;

  html += '<table class="data"><thead><tr>';
  html += '<th>fichero</th><th>título</th><th>palabras</th><th>enlaces</th><th>imágenes</th><th>sin alt</th><th>H1</th><th>tablas</th><th>formularios</th><th>a11y errores</th><th>a11y avisos</th>';
  html += '</tr></thead><tbody>';

  ok.forEach(r => {
    html += `<tr class="batchrow" data-file="${esc(r.name)}" style="cursor:pointer;">
      <td class="mono" style="color:var(--accent)">${esc(r.name)}</td>
      <td>${esc(r.title)}</td>
      <td class="mono dim">${r.words}</td>
      <td class="mono dim">${r.links}</td>
      <td class="mono dim">${r.images}</td>
      <td class="mono">${r.missingAlt ? `<span class="pill warn">${r.missingAlt}</span>` : '0'}</td>
      <td class="mono">${r.h1Count !== 1 ? `<span class="pill warn">${r.h1Count}</span>` : '1'}</td>
      <td class="mono dim">${r.tables}</td>
      <td class="mono dim">${r.forms}</td>
      <td class="mono">${r.a11yErrors ? `<span class="pill warn" style="border-color:var(--danger);color:var(--danger)">${r.a11yErrors}</span>` : '0'}</td>
      <td class="mono dim">${r.a11yWarnings}</td>
    </tr>`;
  });
  html += '</tbody></table>';

  if (errors.length) {
    html += '<div class="meta-group"><h3>Ficheros con error</h3><table class="data"><tbody>';
    errors.forEach(r => html += `<tr><td class="mono">${esc(r.name)}</td><td class="dim">${esc(r.error)}</td></tr>`);
    html += '</tbody></table></div>';
  }

  html += '<div class="hint" style="margin-top:14px;">Haz clic en una fila para ver el desglose completo de ese fichero (mismos módulos que el análisis individual).</div>';

  return {
    html,
    exportData: () => toCSV([
      ['fichero', 'título', 'palabras', 'enlaces', 'imágenes', 'sin_alt', 'h1', 'tablas', 'formularios', 'a11y_errores', 'a11y_avisos'],
      ...ok.map(r => [r.name, r.title, r.words, r.links, r.images, r.missingAlt, r.h1Count, r.tables, r.forms, r.a11yErrors, r.a11yWarnings]),
    ]),
    exportName: 'resumen-lote.csv',
    exportType: 'text/csv',
    afterRender(container) {
      container.querySelectorAll('.batchrow').forEach(tr => {
        tr.addEventListener('click', () => onSelectFile(tr.dataset.file));
      });
    },
  };
}
