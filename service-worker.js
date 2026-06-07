/* ============================================================
   CRV Hoja de Ruta — Service Worker
   Estrategia: Cache-first para todos los recursos estáticos.
   Al actualizar el HTML, incrementar CACHE_VER para forzar
   la descarga de la versión nueva.
   ============================================================ */

const CACHE_VER  = 'crv-ruta-v8';
const CACHE_URLS = [
  './',
  './hoja_de_ruta_bolsillo.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

/* ── Instalación: precachear todos los recursos ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VER)
      .then(cache => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activación: limpiar cachés antiguas ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VER)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first, red como fallback ── */
self.addEventListener('fetch', event => {
  /* Solo interceptar peticiones GET */
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      /* No está en caché: ir a la red y guardar para después */
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_VER).then(cache => cache.put(event.request, toCache));
        return response;
      });
    }).catch(() => {
      /* Sin red y sin caché: devolver página principal si existe */
      return caches.match('./');
    })
  );
});
