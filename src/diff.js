// Utilidades de comparación entre dos resultados de extractores (A = "antes", B = "después").
// Cada diffX() es una función pura: recibe los datos ya calculados por el
// extractor correspondiente para A y para B, y devuelve qué cambió.

// Diff de dos listas de strings (por valor): qué se añadió, qué se quitó.
export function diffValueList(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  return {
    added: b.filter(v => !setA.has(v)),
    removed: a.filter(v => !setB.has(v)),
  };
}

// Diff de dos listas de objetos, identificados por una función de clave.
// No detecta "modificados" como tal (para eso necesitaríamos comparar campo a
// campo); un objeto con la misma clave pero contenido distinto aparece como
// removed+added, que es una aproximación razonable y fácil de leer.
export function diffKeyedList(a, b, keyFn) {
  const mapA = new Map(a.map((item, i) => [keyFn(item, i), item]));
  const mapB = new Map(b.map((item, i) => [keyFn(item, i), item]));
  const added = [];
  const removed = [];
  mapB.forEach((item, key) => { if (!mapA.has(key)) added.push(item); });
  mapA.forEach((item, key) => { if (!mapB.has(key)) removed.push(item); });
  return { added, removed };
}

export function diffMeta(a, b) {
  const keys = ['title', 'description', 'keywords', 'canonical', 'robots', 'author', 'generator', 'lang', 'viewport', 'charset'];
  const changed = keys
    .filter(k => (a[k] || null) !== (b[k] || null))
    .map(k => ({ field: k, before: a[k] || null, after: b[k] || null }));

  const ogDiff = diffObjectKeys(a.og, b.og);
  const twitterDiff = diffObjectKeys(a.twitter, b.twitter);

  const count = changed.length + ogDiff.length + twitterDiff.length;
  return { changed, ogDiff, twitterDiff, count, flagged: count > 0 };
}

function diffObjectKeys(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  const changed = [];
  keys.forEach(k => {
    if ((a[k] || null) !== (b[k] || null)) changed.push({ field: k, before: a[k] || null, after: b[k] || null });
  });
  return changed;
}

export function diffLinks(a, b) {
  const { added, removed } = diffKeyedList(a.links, b.links, l => `${l.href}|${l.text}`);
  return { added, removed, count: added.length + removed.length, flagged: added.length + removed.length > 0 };
}

export function diffImages(a, b) {
  const { added, removed } = diffKeyedList(a.images, b.images, i => i.src);
  return { added, removed, count: added.length + removed.length, flagged: added.length + removed.length > 0 };
}

export function diffHeadings(a, b) {
  const { added, removed } = diffKeyedList(a.headings, b.headings, h => `H${h.level}|${h.text}`);
  return {
    added, removed,
    h1CountBefore: a.h1Count, h1CountAfter: b.h1Count,
    count: added.length + removed.length,
    flagged: added.length + removed.length > 0 || a.h1Count !== b.h1Count,
  };
}

export function diffAssets(a, b) {
  const scripts = diffKeyedList(a.scripts, b.scripts, (s, i) => s.src || ('inline:' + i));
  const stylesheets = diffKeyedList(a.stylesheets, b.stylesheets, s => s.href);
  const domains = diffValueList(a.domains, b.domains);
  const count = scripts.added.length + scripts.removed.length + stylesheets.added.length + stylesheets.removed.length + domains.added.length + domains.removed.length;
  return { scripts, stylesheets, domains, count, flagged: count > 0 };
}

export function diffForms(a, b) {
  const fieldCountA = a.forms.reduce((s, f) => s + f.fields.length, 0);
  const fieldCountB = b.forms.reduce((s, f) => s + f.fields.length, 0);
  const changed = a.forms.length !== b.forms.length || fieldCountA !== fieldCountB;
  return {
    formsBefore: a.forms.length, formsAfter: b.forms.length,
    fieldsBefore: fieldCountA, fieldsAfter: fieldCountB,
    count: changed ? 1 : 0, flagged: changed,
  };
}

export function diffTables(a, b) {
  const rowsA = a.tables.reduce((s, t) => s + t.rows.length, 0);
  const rowsB = b.tables.reduce((s, t) => s + t.rows.length, 0);
  const changed = a.tables.length !== b.tables.length || rowsA !== rowsB;
  return {
    tablesBefore: a.tables.length, tablesAfter: b.tables.length,
    rowsBefore: rowsA, rowsAfter: rowsB,
    count: changed ? 1 : 0, flagged: changed,
  };
}

export function diffText(a, b) {
  const changed = a.words !== b.words || a.text !== b.text;
  return {
    wordsBefore: a.words, wordsAfter: b.words,
    charsBefore: a.text.length, charsAfter: b.text.length,
    contentChanged: a.text !== b.text,
    count: changed ? 1 : 0, flagged: changed,
  };
}

export function diffTagCounts(a, b) {
  const mapA = new Map(a.sorted);
  const mapB = new Map(b.sorted);
  const tags = new Set([...mapA.keys(), ...mapB.keys()]);
  const changed = [];
  tags.forEach(tag => {
    const before = mapA.get(tag) || 0;
    const after = mapB.get(tag) || 0;
    if (before !== after) changed.push({ tag, before, after, delta: after - before });
  });
  changed.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  return { changed, count: changed.length, flagged: changed.length > 0 };
}

export function diffMisc(a, b) {
  const emails = diffValueList(a.emails, b.emails);
  const phones = diffValueList(a.phones, b.phones);
  const colors = diffValueList(a.colors, b.colors);
  const comments = diffValueList(a.comments, b.comments);
  const jsonldChanged = a.jsonld.length !== b.jsonld.length || JSON.stringify(a.jsonld) !== JSON.stringify(b.jsonld);
  const count = emails.added.length + emails.removed.length + phones.added.length + phones.removed.length +
    colors.added.length + colors.removed.length + comments.added.length + comments.removed.length + (jsonldChanged ? 1 : 0);
  return { emails, phones, colors, comments, jsonldChanged, count, flagged: count > 0 };
}

export function diffAccessibility(a, b) {
  const { added, removed } = diffKeyedList(a.issues, b.issues, i => `${i.rule}|${i.detail}`);
  return {
    added, removed,
    errorsBefore: a.errors, errorsAfter: b.errors,
    warningsBefore: a.warnings, warningsAfter: b.warnings,
    count: added.length + removed.length, flagged: added.length + removed.length > 0,
  };
}

export const DIFF_REGISTRY = {
  meta: diffMeta, links: diffLinks, images: diffImages, headings: diffHeadings,
  assets: diffAssets, forms: diffForms, tables: diffTables, text: diffText,
  tagcounts: diffTagCounts, misc: diffMisc, a11y: diffAccessibility,
};

// Igual que runExtractorSafely en extractors.js: si alguno de los dos lados
// (A o B) tuvo un error al extraer, o el propio cálculo del diff falla, no
// debe tumbar la comparación completa — se marca ese módulo como no
// disponible y se sigue con el resto.
export function runDiffSafely(id, dataA, dataB) {
  try {
    if (dataA?.error || dataB?.error) {
      return { count: 0, flagged: true, error: 'No se pudo comparar: uno de los dos análisis falló en este módulo.' };
    }
    return DIFF_REGISTRY[id](dataA, dataB);
  } catch (e) {
    console.error(`El diff de "${id}" ha fallado:`, e);
    return { count: 0, flagged: true, error: e.message || 'Error desconocido al comparar este módulo.' };
  }
}
