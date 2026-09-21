import { describe, it, expect, vi } from 'vitest';
import { toCSV } from '../src/utils.js';
import { runExtractorSafely, runAllExtractorsSafely, extractAccessibility } from '../src/extractors.js';
import { runDiffSafely } from '../src/diff.js';

function parse(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('toCSV — mitigación de CSV/Formula Injection', () => {
  it('antepone un apóstrofo a celdas que empiezan por =, +, -, @', () => {
    const csv = toCSV([['=cmd|/c calc', '+1+1', '-2', '@SUM(A1)', 'texto normal']]);
    const cells = csv.split(',');
    expect(cells[0]).toBe("'=cmd|/c calc");
    expect(cells[1]).toBe("'+1+1");
    expect(cells[2]).toBe("'-2");
    expect(cells[3]).toBe("'@SUM(A1)");
    expect(cells[4]).toBe('texto normal');
  });

  it('no toca celdas normales que no empiezan por esos caracteres', () => {
    const csv = toCSV([['https://example.com', 'Texto de un enlace']]);
    expect(csv).toBe('https://example.com,Texto de un enlace');
  });

  it('sigue entrecomillando correctamente celdas con comas o comillas', () => {
    const csv = toCSV([['hola, mundo', 'con "comillas"']]);
    expect(csv).toBe('"hola, mundo","con ""comillas"""');
  });
});

describe('runExtractorSafely — un extractor que falla no rompe el resto', () => {
  it('devuelve un resultado de error en vez de propagar la excepción', () => {
    const badMod = { id: 'roto', run: () => { throw new Error('boom'); } };
    const result = runExtractorSafely(badMod, parse('<html></html>'), '<html></html>');
    expect(result.error).toBeTruthy();
    expect(result.flagged).toBe(true);
  });

  it('runAllExtractorsSafely sigue devolviendo el resto de módulos aunque uno falle', () => {
    const doc = parse('<html lang="es"><head><title>Test</title></head><body><h1>Hola</h1></body></html>');
    const data = runAllExtractorsSafely(doc, '<html lang="es">...</html>', document);
    // meta y headings deben haberse calculado con normalidad
    expect(data.meta.title).toBe('Test');
    expect(data.headings.h1Count).toBe(1);
  });
});

describe('runDiffSafely', () => {
  it('marca el módulo como no comparable si alguno de los dos lados tuvo un error', () => {
    const result = runDiffSafely('meta', { error: 'algo falló' }, { title: 'x' });
    expect(result.error).toBeTruthy();
    expect(result.flagged).toBe(true);
  });

  it('compara con normalidad cuando ambos lados son válidos', () => {
    const a = { title: 'Antes', description: null, keywords: null, canonical: null, robots: null, author: null, generator: null, lang: null, viewport: null, charset: null, og: {}, twitter: {} };
    const b = { ...a, title: 'Después' };
    const result = runDiffSafely('meta', a, b);
    expect(result.error).toBeFalsy();
    expect(result.flagged).toBe(true);
  });
});

describe('extractAccessibility — resiliencia ante ids malformados', () => {
  it('no lanza excepción si un id contiene comillas dobles', () => {
    const doc = parse('<html lang="es"><body><input type="text" id=\'raro"conComillas\' name="x"></body></html>');
    expect(() => extractAccessibility(doc)).not.toThrow();
  });
});

describe('objetos "mapa" con Object.create(null) — no hay contaminación de prototipo', () => {
  it('un id="__proto__" no filtra al Object.prototype global', () => {
    const doc = parse('<html lang="es"><body><div id="__proto__"></div><div id="__proto__"></div></body></html>');
    expect(() => extractAccessibility(doc)).not.toThrow();
    // Comprobación directa: el prototipo global no debe haberse visto afectado.
    expect(Object.prototype.polluted).toBeUndefined();
  });
});
