const CACHE_NAME = 'pepsi-locator-static-v4.3';
const RUNTIME_CACHE = 'pepsi-locator-runtime-v1.3';
const PRECACHE_ASSETS = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'assets/locations.json',
  'assets/Pepsi_2023.svg',
  'assets/og-map.svg',
  'assets/pepsi-locator-pin.png',
  'assets/pepsi-locator-pin-no-bg.png',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/android-chrome-192x192.png',
  'assets/icons/android-chrome-512x512.png',
  'assets/icons/favicon-32x32.png',
  'assets/icons/favicon-16x16.png',
  'assets/icons/favicon.ico'
];
const RUNTIME_ALLOWLIST = new Set(['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com']);
const RUNTIME_BLOCKLIST = new Set(['tile.openstreetmap.org']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function cacheFirstThenNetwork(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request)
      .then((response) => {
        const url = new URL(request.url);
        if (response.ok && (url.origin === location.origin || RUNTIME_ALLOWLIST.has(url.hostname))) {
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => cached);
  });
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Avoid caching heavy map tiles; let them stream from network.
  if (RUNTIME_BLOCKLIST.has(url.hostname)) return;

  // Offline fallback for navigations.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then((cached) => cached || fetch(event.request)).catch(() => caches.match('index.html'))
    );
    return;
  }

  event.respondWith(cacheFirstThenNetwork(event.request));
});
