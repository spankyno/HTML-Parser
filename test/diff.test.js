import { describe, it, expect } from 'vitest';
import {
  diffValueList, diffKeyedList, diffMeta, diffLinks, diffImages,
  diffHeadings, diffTagCounts, diffAssets,
} from '../src/diff.js';
import { extractMeta, extractLinks, extractImages, extractHeadings, extractTagCounts, extractAssets } from '../src/extractors.js';

function parse(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('diffValueList', () => {
  it('detecta valores añadidos y eliminados', () => {
    const d = diffValueList(['a', 'b', 'c'], ['b', 'c', 'd']);
    expect(d.added).toEqual(['d']);
    expect(d.removed).toEqual(['a']);
  });

  it('no detecta cambios cuando las listas son iguales', () => {
    const d = diffValueList(['x', 'y'], ['x', 'y']);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
  });
});

describe('diffKeyedList', () => {
  it('usa la función de clave para identificar elementos', () => {
    const a = [{ id: 1, v: 'uno' }, { id: 2, v: 'dos' }];
    const b = [{ id: 2, v: 'dos' }, { id: 3, v: 'tres' }];
    const d = diffKeyedList(a, b, x => x.id);
    expect(d.added.map(x => x.id)).toEqual([3]);
    expect(d.removed.map(x => x.id)).toEqual([1]);
  });

  it('con función de clave por índice, dos listas idénticas no producen diferencias', () => {
    const a = [{ src: null }, { src: '/x.js' }];
    const b = [{ src: null }, { src: '/x.js' }];
    const d = diffKeyedList(a, b, (item, i) => item.src || ('inline:' + i));
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
  });
});

describe('diffMeta', () => {
  it('detecta cambio de title y description', () => {
    const a = extractMeta(parse('<html><head><title>Antes</title><meta name="description" content="Desc A"></head></html>'));
    const b = extractMeta(parse('<html><head><title>Después</title><meta name="description" content="Desc B"></head></html>'));
    const d = diffMeta(a, b);
    expect(d.flagged).toBe(true);
    const titleChange = d.changed.find(c => c.field === 'title');
    expect(titleChange.before).toBe('Antes');
    expect(titleChange.after).toBe('Después');
  });

  it('no marca cambios cuando el meta es idéntico', () => {
    const html = '<html><head><title>Igual</title></head></html>';
    const a = extractMeta(parse(html));
    const b = extractMeta(parse(html));
    expect(diffMeta(a, b).flagged).toBe(false);
  });
});

describe('diffLinks', () => {
  it('detecta un enlace nuevo', () => {
    const a = extractLinks(parse('<a href="/uno">Uno</a>'));
    const b = extractLinks(parse('<a href="/uno">Uno</a><a href="/dos">Dos</a>'));
    const d = diffLinks(a, b);
    expect(d.added).toHaveLength(1);
    expect(d.added[0].href).toBe('/dos');
    expect(d.removed).toHaveLength(0);
  });
});

describe('diffImages', () => {
  it('detecta una imagen añadida', () => {
    const a = extractImages(parse('<img src="a.jpg">'));
    const b = extractImages(parse('<img src="a.jpg"><img src="b.jpg">'));
    const d = diffImages(a, b);
    expect(d.added.map(i => i.src)).toEqual(['b.jpg']);
  });
});

describe('diffHeadings', () => {
  it('detecta cambio en el número de H1', () => {
    const a = extractHeadings(parse('<h1>Uno</h1>'));
    const b = extractHeadings(parse('<h1>Uno</h1><h1>Dos</h1>'));
    const d = diffHeadings(a, b);
    expect(d.h1CountBefore).toBe(1);
    expect(d.h1CountAfter).toBe(2);
    expect(d.flagged).toBe(true);
  });
});

describe('diffTagCounts', () => {
  it('calcula el delta de cada etiqueta', () => {
    const a = extractTagCounts(parse('<p>a</p><p>b</p>'));
    const b = extractTagCounts(parse('<p>a</p><p>b</p><p>c</p>'));
    const d = diffTagCounts(a, b);
    const pChange = d.changed.find(c => c.tag === 'p');
    expect(pChange.delta).toBe(1);
  });
});

describe('diffAssets', () => {
  it('no marca falsos cambios en scripts inline idénticos entre A y B', () => {
    const html = '<script type="application/ld+json">{"a":1}</script><script src="/x.js"></script>';
    const a = extractAssets(parse(html));
    const b = extractAssets(parse(html));
    const d = diffAssets(a, b);
    expect(d.flagged).toBe(false);
  });

  it('detecta un dominio de script externo nuevo', () => {
    const a = extractAssets(parse('<script src="https://cdn-a.example/x.js"></script>'));
    const b = extractAssets(parse('<script src="https://cdn-a.example/x.js"></script><script src="https://cdn-b.example/y.js"></script>'));
    const d = diffAssets(a, b);
    expect(d.domains.added).toContain('cdn-b.example');
  });
});
