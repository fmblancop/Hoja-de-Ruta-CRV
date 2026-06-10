/* ============================================================
   CRV Hoja de Ruta — Service Worker
   Estrategia: Network-first para el HTML (garantiza que cada
   apertura con conexión muestre la versión más reciente) y
   cache-first para el resto de recursos estáticos.
   Al actualizar el HTML, incrementar CACHE_VER para forzar
   la descarga de la versión nueva.
   ============================================================ */

const CACHE_VER  = 'crv-ruta-v15';
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

/* ── Fetch ── */
self.addEventListener('fetch', event => {
  /* Solo interceptar peticiones GET */
  if (event.request.method !== 'GET') return;

  const accept = event.request.headers.get('accept') || '';
  const isHTML = event.request.mode === 'navigate' || accept.includes('text/html');

  /* HTML: network-first, caché como respaldo sin conexión */
  if (isHTML) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const toCache = response.clone();
          caches.open(CACHE_VER).then(cache => cache.put(event.request, toCache));
        }
        return response;
      }).catch(() =>
        caches.match(event.request).then(cached => cached || caches.match('./'))
      )
    );
    return;
  }

  /* Resto de recursos: cache-first, red como fallback */
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
