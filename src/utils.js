// Utilidades compartidas por extractores y renderizado.

export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function attr(el, name) {
  return el.hasAttribute(name) ? el.getAttribute(name) : null;
}

export function toCSV(rows) {
  return rows.map(r => r.map(v => {
    v = v === null || v === undefined ? '' : String(v);
    if (/[",\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
    return v;
  }).join(',')).join('\n');
}

export function downloadFile(filename, content, mime) {
  try {
    const blob = new Blob([content], { type: mime || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) {
    console.error('download failed', e);
  }
}
