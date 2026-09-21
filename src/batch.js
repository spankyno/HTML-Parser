import { EXTRACTOR_REGISTRY } from './extractors.js';

// Recibe una lista de { name, raw } (nombre de fichero + HTML como texto) y
// devuelve un resumen por fichero + los datos completos de cada uno (para
// poder "entrar" a ver el detalle de un fichero concreto reutilizando la
// misma UI que el modo de análisis simple).

export function processBatch(files) {
  const rows = [];
  const details = {};

  files.forEach(({ name, raw }) => {
    let doc;
    try {
      doc = new DOMParser().parseFromString(raw, 'text/html');
    } catch (e) {
      rows.push({ name, error: 'No se pudo parsear el HTML' });
      return;
    }

    const data = {};
    EXTRACTOR_REGISTRY.forEach(mod => { data[mod.id] = mod.run(doc, raw, typeof document !== 'undefined' ? document : null); });
    details[name] = data;

    rows.push({
      name,
      error: null,
      title: data.meta.title || '(sin título)',
      words: data.text.words,
      links: data.links.count,
      images: data.images.count,
      missingAlt: data.images.missingAlt,
      h1Count: data.headings.h1Count,
      tables: data.tables.count,
      forms: data.forms.count,
      a11yErrors: data.a11y.errors,
      a11yWarnings: data.a11y.warnings,
    });
  });

  return { rows, details };
}

// Extrae entradas .html/.htm de un objeto JSZip ya cargado.
// Se le pasa la instancia de JSZip cargada (this.files de jszip) para no
// acoplar este módulo a cómo se cargó la librería.
export async function extractHtmlFilesFromZip(zip) {
  const entries = Object.values(zip.files).filter(
    f => !f.dir && /\.html?$/i.test(f.name)
  );
  const files = [];
  for (const entry of entries) {
    const raw = await entry.async('text');
    files.push({ name: entry.name, raw });
  }
  return files;
}
