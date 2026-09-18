// Cada función recibe un documento DOM ya parseado (y el HTML crudo cuando
// hace falta buscar patrones de texto) y devuelve datos planos, sin tocar el
// DOM de la página ni generar HTML. Esto es lo que permite testear cada
// extractor de forma aislada con Vitest + jsdom.

import { attr } from './utils.js';

export function extractMeta(doc) {
  const data = {
    title: doc.title || null,
    charset:
      doc.querySelector('meta[charset]')?.getAttribute('charset') ||
      doc.querySelector('meta[http-equiv="Content-Type"]')?.content ||
      null,
    viewport: doc.querySelector('meta[name="viewport"]')?.content || null,
    description: doc.querySelector('meta[name="description"]')?.content || null,
    keywords: doc.querySelector('meta[name="keywords"]')?.content || null,
    canonical:
      doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
    robots: doc.querySelector('meta[name="robots"]')?.content || null,
    author: doc.querySelector('meta[name="author"]')?.content || null,
    generator: doc.querySelector('meta[name="generator"]')?.content || null,
    lang: doc.documentElement.getAttribute('lang') || null,
  };

  const favicons = Array.from(
    doc.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
  ).map(l => ({ rel: attr(l, 'rel'), href: attr(l, 'href'), sizes: attr(l, 'sizes') }));

  const og = {};
  const twitter = {};
  doc.querySelectorAll('meta[property^="og:"]').forEach(m => { og[attr(m, 'property')] = attr(m, 'content'); });
  doc.querySelectorAll('meta[name^="twitter:"]').forEach(m => { twitter[attr(m, 'name')] = attr(m, 'content'); });

  const count = Object.values(data).filter(Boolean).length + favicons.length + Object.keys(og).length + Object.keys(twitter).length;
  const flagged = !data.description || !data.title;

  return { ...data, favicons, og, twitter, count, flagged };
}

export function extractLinks(doc) {
  const links = Array.from(doc.querySelectorAll('a[href]')).map(a => ({
    href: attr(a, 'href'),
    text: (a.textContent || '').trim().slice(0, 120),
    rel: attr(a, 'rel'),
    target: attr(a, 'target'),
    external: !!attr(a, 'href') && /^https?:\/\//i.test(attr(a, 'href')),
  }));
  return {
    links,
    count: links.length,
    flagged: links.some(l => !l.href || l.href.trim() === ''),
  };
}

export function extractImages(doc) {
  const images = Array.from(doc.querySelectorAll('img')).map(i => ({
    src: attr(i, 'src'),
    alt: attr(i, 'alt'),
    width: attr(i, 'width'),
    height: attr(i, 'height'),
    missingAlt: attr(i, 'alt') === null || attr(i, 'alt').trim() === '',
  }));
  const missingAlt = images.filter(i => i.missingAlt).length;
  return { images, missingAlt, count: images.length, flagged: missingAlt > 0 };
}

export function extractAssets(doc) {
  const scripts = Array.from(doc.querySelectorAll('script')).map(s => ({
    src: attr(s, 'src'),
    type: attr(s, 'type') || 'text/javascript',
    async: s.hasAttribute('async'),
    defer: s.hasAttribute('defer'),
    inline: !attr(s, 'src'),
  }));
  const stylesheets = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(l => ({ href: attr(l, 'href') }));
  const inlineStyleBlocks = doc.querySelectorAll('style').length;
  const externalScripts = scripts.filter(s => s.src);
  const domains = [...new Set(externalScripts.map(s => {
    try { return new URL(s.src, 'https://x.invalid/').hostname; } catch { return s.src; }
  }))];
  return {
    scripts, stylesheets, inlineStyleBlocks, domains,
    count: scripts.length + stylesheets.length,
    flagged: false,
  };
}

export function extractHeadings(doc) {
  const headings = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => ({
    level: parseInt(h.tagName.substring(1), 10),
    text: (h.textContent || '').trim().slice(0, 160),
  }));
  const h1Count = headings.filter(h => h.level === 1).length;
  let skipDetected = false;
  let prev = 0;
  headings.forEach(h => {
    if (prev && h.level > prev + 1) skipDetected = true;
    prev = h.level;
  });
  return {
    headings, h1Count, skipDetected,
    count: headings.length,
    flagged: h1Count !== 1 || skipDetected,
  };
}

export function extractForms(doc) {
  const forms = Array.from(doc.querySelectorAll('form')).map(f => ({
    action: attr(f, 'action'),
    method: (attr(f, 'method') || 'GET').toUpperCase(),
    fields: Array.from(f.querySelectorAll('input,select,textarea,button')).map(el => ({
      tag: el.tagName.toLowerCase(),
      type: attr(el, 'type') || (el.tagName.toLowerCase() === 'textarea' ? 'textarea' : el.tagName.toLowerCase() === 'select' ? 'select' : 'text'),
      name: attr(el, 'name'),
      required: el.hasAttribute('required'),
      placeholder: attr(el, 'placeholder'),
    })),
  }));
  return { forms, count: forms.length, flagged: false };
}

export function extractTables(doc) {
  const tables = Array.from(doc.querySelectorAll('table')).map(t => ({
    rows: Array.from(t.querySelectorAll('tr')).map(tr =>
      Array.from(tr.querySelectorAll('th,td')).map(c => (c.textContent || '').trim())
    ),
  }));
  return { tables, count: tables.length, flagged: false };
}

export function extractPlainText(doc) {
  const clone = doc.body ? doc.body.cloneNode(true) : doc.cloneNode(true);
  clone.querySelectorAll('script,style,noscript').forEach(n => n.remove());
  const text = (clone.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  return { text, words, count: words, flagged: false };
}

export function extractTagCounts(doc) {
  const all = doc.querySelectorAll('*');
  const counts = {};
  all.forEach(el => { const t = el.tagName.toLowerCase(); counts[t] = (counts[t] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return { sorted, totalElements: all.length, count: all.length, flagged: false };
}

export function extractMisc(doc, raw, documentImpl) {
  const comments = [];
  // TreeWalker necesita el objeto `document` del entorno (navegador o jsdom).
  const docImpl = documentImpl || (typeof document !== 'undefined' ? document : null);
  if (docImpl && docImpl.createTreeWalker) {
    const walker = docImpl.createTreeWalker(doc, NodeFilter.SHOW_COMMENT, null);
    let n;
    while ((n = walker.nextNode())) {
      const c = n.nodeValue.trim();
      if (c) comments.push(c.slice(0, 300));
    }
  }

  const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRe = /(\+?\d[\d\s().-]{7,}\d)/g;
  const emails = [...new Set((raw.match(emailRe) || []))];
  const phones = [...new Set((raw.match(phoneRe) || []))].filter(p => p.replace(/\D/g, '').length >= 9).slice(0, 50);

  const jsonld = Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).map(s => {
    try { return JSON.parse(s.textContent); } catch { return { __parseError: true, raw: s.textContent.slice(0, 300) }; }
  });

  const colorRe = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
  const colors = [...new Set(raw.match(colorRe) || [])].slice(0, 60);

  const count = comments.length + emails.length + phones.length + jsonld.length + colors.length;

  return { comments, emails, phones, jsonld, colors, count, flagged: comments.length > 0 };
}

export function extractAccessibility(doc) {
  const issues = [];
  const add = (severity, rule, message, detail) => issues.push({ severity, rule, message, detail: detail || '' });

  // 1. Idioma del documento
  if (!doc.documentElement.getAttribute('lang')) {
    add('error', 'lang-missing', 'El documento no declara el atributo lang en <html>', 'Los lectores de pantalla no saben en qué idioma leer el contenido.');
  }

  // 2. Imágenes sin alt
  const imgsNoAlt = Array.from(doc.querySelectorAll('img')).filter(i => {
    const alt = i.getAttribute('alt');
    return alt === null || alt.trim() === '';
  });
  imgsNoAlt.forEach(i => add('error', 'img-alt', 'Imagen sin atributo alt', i.getAttribute('src') || '(sin src)'));

  // 3. Campos de formulario sin etiqueta asociada
  const fields = Array.from(doc.querySelectorAll('input, select, textarea'))
    .filter(el => !['hidden', 'submit', 'button', 'image'].includes((el.getAttribute('type') || '').toLowerCase()));
  fields.forEach(el => {
    const id = el.getAttribute('id');
    const hasLabelFor = id && doc.querySelector(`label[for="${(typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(id) : id}"]`);
    const wrappedInLabel = el.closest('label');
    const hasAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    if (!hasLabelFor && !wrappedInLabel && !hasAria) {
      add('error', 'form-label', 'Campo de formulario sin <label> asociado', `name="${el.getAttribute('name') || '(sin name)'}"`);
    }
  });

  // 4. Enlaces y botones sin texto accesible
  Array.from(doc.querySelectorAll('a[href], button')).forEach(el => {
    const text = (el.textContent || '').trim();
    const hasAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    const hasTitle = el.getAttribute('title');
    const hasImgAlt = el.querySelector('img[alt]') && el.querySelector('img[alt]').getAttribute('alt').trim() !== '';
    if (!text && !hasAria && !hasTitle && !hasImgAlt) {
      add('error', 'accessible-name', `${el.tagName.toLowerCase()} sin texto accesible`, el.outerHTML.slice(0, 120));
    }
  });

  // 5. IDs duplicados (rompe label[for], aria-labelledby, anclas...)
  const idMap = {};
  doc.querySelectorAll('[id]').forEach(el => {
    const id = el.getAttribute('id');
    idMap[id] = (idMap[id] || 0) + 1;
  });
  Object.entries(idMap).filter(([, n]) => n > 1).forEach(([id, n]) => {
    add('error', 'duplicate-id', `El id "${id}" aparece ${n} veces`, 'Un id debe ser único en todo el documento.');
  });

  // 6. iframes sin title
  doc.querySelectorAll('iframe').forEach(f => {
    if (!f.getAttribute('title')) add('warning', 'iframe-title', 'iframe sin atributo title', f.getAttribute('src') || '(sin src)');
  });

  // 7. Tablas de datos sin th ni caption
  doc.querySelectorAll('table').forEach((t, i) => {
    const hasTh = t.querySelector('th');
    const hasCaption = t.querySelector('caption');
    if (!hasTh && !hasCaption && t.querySelectorAll('tr').length > 1) {
      add('warning', 'table-headers', `Tabla ${i + 1} sin <th> ni <caption>`, 'Dificulta entender la tabla con lector de pantalla.');
    }
  });

  // 8. tabindex positivo (antipatrón: rompe el orden natural de tabulación)
  doc.querySelectorAll('[tabindex]').forEach(el => {
    const v = parseInt(el.getAttribute('tabindex'), 10);
    if (v > 0) add('warning', 'positive-tabindex', `tabindex="${v}" en <${el.tagName.toLowerCase()}>`, 'Los valores positivos alteran el orden natural de navegación por teclado.');
  });

  // 9. Jerarquía de encabezados (reutiliza la misma señal que el módulo de headings)
  const heads = extractHeadings(doc);
  if (heads.h1Count === 0) add('warning', 'no-h1', 'El documento no tiene ningún H1', '');
  if (heads.h1Count > 1) add('warning', 'multiple-h1', `El documento tiene ${heads.h1Count} etiquetas H1`, 'Se recomienda un único H1 por página.');
  if (heads.skipDetected) add('warning', 'heading-skip', 'Hay un salto de nivel en los encabezados', 'Ej. un H2 seguido directamente de un H4.');

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;

  return { issues, errors, warnings, count: issues.length, flagged: errors > 0 };
}


export const EXTRACTOR_REGISTRY = [
  { id: 'meta', label: 'Meta & SEO', run: extractMeta },
  { id: 'a11y', label: 'Accesibilidad', run: extractAccessibility },
  { id: 'headings', label: 'Encabezados', run: extractHeadings },
  { id: 'links', label: 'Enlaces', run: extractLinks },
  { id: 'images', label: 'Imágenes', run: extractImages },
  { id: 'tables', label: 'Tablas', run: extractTables },
  { id: 'forms', label: 'Formularios', run: extractForms },
  { id: 'assets', label: 'Scripts & estilos', run: extractAssets },
  { id: 'tagcounts', label: 'Conteo de etiquetas', run: extractTagCounts },
  { id: 'text', label: 'Texto plano', run: extractPlainText },
  { id: 'misc', label: 'Otros hallazgos', run: extractMisc },
];
