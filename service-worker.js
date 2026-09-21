// Service worker mínimo: cachea el "app shell" para que la herramienta
// funcione offline tras la primera visita. Como no hay backend ni datos
// dinámicos que sincronizar, una estrategia "cache first, network fallback"
// es suficiente — no hace falta nada más sofisticado.

const CACHE_NAME = 'html-parser-v5';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './src/app.js',
  './src/extractors.js',
  './src/render.js',
  './src/diff.js',
  './src/diffRender.js',
  './src/batch.js',
  './src/batchRender.js',
  './src/utils.js',
  './src/example.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Solo interceptamos peticiones GET del propio origen (no Google Fonts, etc.)
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
