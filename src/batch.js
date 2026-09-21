import { EXTRACTOR_REGISTRY, runAllExtractorsSafely } from './extractors.js';

// Recibe una lista de { name, raw } (nombre de fichero + HTML como texto) y
// devuelve un resumen por fichero + los datos completos de cada uno (para
// poder "entrar" a ver el detalle de un fichero concreto reutilizando la
// misma UI que el modo de análisis simple).

export function processBatch(files) {
  const rows = [];
  const details = Object.create(null);

  files.forEach(({ name, raw }) => {
    let doc;
    try {
      doc = new DOMParser().parseFromString(raw, 'text/html');
    } catch (e) {
      rows.push({ name, error: 'No se pudo parsear el HTML' });
      return;
    }

    const data = runAllExtractorsSafely(doc, raw, typeof document !== 'undefined' ? document : null);
    details[name] = data;

    rows.push({
      name,
      error: null,
      title: (data.meta && !data.meta.error) ? (data.meta.title || '(sin título)') : '(error al leer meta)',
      words: (data.text && !data.text.error) ? data.text.words : 0,
      links: (data.links && !data.links.error) ? data.links.count : 0,
      images: (data.images && !data.images.error) ? data.images.count : 0,
      missingAlt: (data.images && !data.images.error) ? data.images.missingAlt : 0,
      h1Count: (data.headings && !data.headings.error) ? data.headings.h1Count : 0,
      tables: (data.tables && !data.tables.error) ? data.tables.count : 0,
      forms: (data.forms && !data.forms.error) ? data.forms.count : 0,
      a11yErrors: (data.a11y && !data.a11y.error) ? data.a11y.errors : 0,
      a11yWarnings: (data.a11y && !data.a11y.error) ? data.a11y.warnings : 0,
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
