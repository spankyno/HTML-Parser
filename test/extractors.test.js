import { describe, it, expect } from 'vitest';
import {
  extractMeta, extractLinks, extractImages, extractHeadings,
  extractForms, extractTables, extractTagCounts, extractMisc, extractAccessibility,
} from '../src/extractors.js';

function parse(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('extractMeta', () => {
  it('lee title, description y canonical', () => {
    const doc = parse(`<html><head>
      <title>Página de prueba</title>
      <meta name="description" content="Una descripción">
      <link rel="canonical" href="https://example.com/">
    </head><body></body></html>`);
    const data = extractMeta(doc);
    expect(data.title).toBe('Página de prueba');
    expect(data.description).toBe('Una descripción');
    expect(data.canonical).toBe('https://example.com/');
  });

  it('marca "flagged" cuando falta description', () => {
    const doc = parse('<html><head><title>Solo título</title></head></html>');
    expect(extractMeta(doc).flagged).toBe(true);
  });

  it('extrae bloques Open Graph', () => {
    const doc = parse(`<html><head>
      <meta property="og:title" content="Título OG">
      <meta property="og:image" content="https://example.com/img.jpg">
    </head></html>`);
    const data = extractMeta(doc);
    expect(data.og['og:title']).toBe('Título OG');
    expect(data.og['og:image']).toBe('https://example.com/img.jpg');
  });
});

describe('extractLinks', () => {
  it('distingue enlaces internos y externos', () => {
    const doc = parse(`<html><body>
      <a href="/interno">Interno</a>
      <a href="https://otrosite.com">Externo</a>
    </body></html>`);
    const { links } = extractLinks(doc);
    expect(links).toHaveLength(2);
    expect(links.find(l => l.href === '/interno').external).toBe(false);
    expect(links.find(l => l.href === 'https://otrosite.com').external).toBe(true);
  });

  it('marca flagged si hay un href vacío', () => {
    const doc = parse('<html><body><a href="">vacío</a></body></html>');
    expect(extractLinks(doc).flagged).toBe(true);
  });
});

describe('extractImages', () => {
  it('detecta imágenes sin atributo alt', () => {
    const doc = parse(`<html><body>
      <img src="a.jpg" alt="con texto">
      <img src="b.jpg">
    </body></html>`);
    const data = extractImages(doc);
    expect(data.count).toBe(2);
    expect(data.missingAlt).toBe(1);
    expect(data.flagged).toBe(true);
  });
});

describe('extractHeadings', () => {
  it('detecta más de un H1 como problema', () => {
    const doc = parse('<html><body><h1>Uno</h1><h1>Dos</h1></body></html>');
    const data = extractHeadings(doc);
    expect(data.h1Count).toBe(2);
    expect(data.flagged).toBe(true);
  });

  it('detecta saltos de nivel (H2 a H4)', () => {
    const doc = parse('<html><body><h1>A</h1><h2>B</h2><h4>C</h4></body></html>');
    expect(extractHeadings(doc).skipDetected).toBe(true);
  });

  it('no marca flagged en una jerarquía correcta', () => {
    const doc = parse('<html><body><h1>A</h1><h2>B</h2><h3>C</h3></body></html>');
    const data = extractHeadings(doc);
    expect(data.skipDetected).toBe(false);
    expect(data.flagged).toBe(false);
  });
});

describe('extractForms', () => {
  it('lee method, action y campos requeridos', () => {
    const doc = parse(`<html><body>
      <form action="/enviar" method="post">
        <input type="email" name="correo" required>
        <button type="submit">Enviar</button>
      </form>
    </body></html>`);
    const { forms } = extractForms(doc);
    expect(forms[0].method).toBe('POST');
    expect(forms[0].fields.find(f => f.name === 'correo').required).toBe(true);
  });
});

describe('extractTables', () => {
  it('extrae filas y celdas como texto', () => {
    const doc = parse(`<table>
      <tr><th>Producto</th><th>Precio</th></tr>
      <tr><td>Pan</td><td>1,20€</td></tr>
    </table>`);
    const { tables } = extractTables(doc);
    expect(tables).toHaveLength(1);
    expect(tables[0].rows).toEqual([['Producto', 'Precio'], ['Pan', '1,20€']]);
  });
});

describe('extractTagCounts', () => {
  it('cuenta ocurrencias por etiqueta', () => {
    const doc = parse('<html><body><p>a</p><p>b</p><span>c</span></body></html>');
    const data = extractTagCounts(doc);
    const p = data.sorted.find(([tag]) => tag === 'p');
    expect(p[1]).toBe(2);
  });
});

describe('extractMisc', () => {
  it('encuentra un email en el HTML crudo', () => {
    const raw = '<p>Contacto: hola@ejemplo.com</p>';
    const doc = parse(raw);
    const data = extractMisc(doc, raw, document);
    expect(data.emails).toContain('hola@ejemplo.com');
  });

  it('parsea bloques JSON-LD válidos', () => {
    const raw = `<script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>`;
    const doc = parse(raw);
    const data = extractMisc(doc, raw, document);
    expect(data.jsonld[0].name).toBe('Acme');
  });
});

describe('extractAccessibility', () => {
  it('detecta que falta el atributo lang', () => {
    const doc = parse('<html><head><title>x</title></head><body></body></html>');
    const data = extractAccessibility(doc);
    expect(data.issues.some(i => i.rule === 'lang-missing')).toBe(true);
  });

  it('no marca error de lang cuando sí está presente', () => {
    const doc = parse('<html lang="es"><head><title>x</title></head><body></body></html>');
    const data = extractAccessibility(doc);
    expect(data.issues.some(i => i.rule === 'lang-missing')).toBe(false);
  });

  it('detecta un input sin label asociado', () => {
    const doc = parse('<html lang="es"><body><form><input type="text" name="nombre"></form></body></html>');
    const data = extractAccessibility(doc);
    expect(data.issues.some(i => i.rule === 'form-label')).toBe(true);
  });

  it('no marca error si el input tiene label por for/id', () => {
    const doc = parse('<html lang="es"><body><form><label for="n">Nombre</label><input type="text" id="n" name="nombre"></form></body></html>');
    const data = extractAccessibility(doc);
    expect(data.issues.some(i => i.rule === 'form-label')).toBe(false);
  });

  it('detecta ids duplicados', () => {
    const doc = parse('<html lang="es"><body><div id="x"></div><div id="x"></div></body></html>');
    const data = extractAccessibility(doc);
    expect(data.issues.some(i => i.rule === 'duplicate-id')).toBe(true);
  });

  it('detecta un enlace sin texto accesible', () => {
    const doc = parse('<html lang="es"><body><a href="/x"></a></body></html>');
    const data = extractAccessibility(doc);
    expect(data.issues.some(i => i.rule === 'accessible-name')).toBe(true);
  });

  it('cuenta errores y avisos por separado', () => {
    const doc = parse('<html><body><img src="a.jpg"><iframe src="b.html"></iframe></body></html>');
    const data = extractAccessibility(doc);
    expect(data.errors).toBeGreaterThan(0); // lang-missing + img-alt
    expect(data.warnings).toBeGreaterThan(0); // iframe-title
  });
});
