import { describe, it, expect } from 'vitest';
import { processBatch } from '../src/batch.js';

describe('processBatch', () => {
  it('procesa varios ficheros y genera una fila de resumen por cada uno', () => {
    const files = [
      { name: 'a.html', raw: '<html lang="es"><head><title>Página A</title></head><body><h1>A</h1><a href="/x">enlace</a></body></html>' },
      { name: 'b.html', raw: '<html lang="es"><head><title>Página B</title></head><body><h1>B1</h1><h1>B2</h1><img src="x.jpg"></body></html>' },
    ];
    const { rows, details } = processBatch(files);

    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('a.html');
    expect(rows[0].title).toBe('Página A');
    expect(rows[0].links).toBe(1);

    expect(rows[1].h1Count).toBe(2); // B tiene dos H1 -> debería quedar marcado
    expect(rows[1].missingAlt).toBe(1); // img sin alt

    expect(details['a.html'].meta.title).toBe('Página A');
    expect(details['b.html'].headings.h1Count).toBe(2);
  });

  it('usa "(sin título)" cuando el documento no tiene <title>', () => {
    const { rows } = processBatch([{ name: 'sin-titulo.html', raw: '<html><body><p>hola</p></body></html>' }]);
    expect(rows[0].title).toBe('(sin título)');
  });

  it('no rompe el lote entero si un fichero falla al parsear', () => {
    // DOMParser en jsdom es muy tolerante y raramente lanza, pero comprobamos
    // que un fichero vacío no rompe el procesamiento de los demás.
    const files = [
      { name: 'vacio.html', raw: '' },
      { name: 'ok.html', raw: '<html lang="es"><head><title>OK</title></head></html>' },
    ];
    const { rows } = processBatch(files);
    expect(rows).toHaveLength(2);
    expect(rows.find(r => r.name === 'ok.html').title).toBe('OK');
  });
});
