// Cache only the explicit offline notice. Never cache scientific API responses.
const CACHE = 'sarflow-offline-v1';
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add('/offline.html')));
});
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate' && event.request.method === 'GET' && new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(fetch(event.request).catch(async () => (await caches.match('/offline.html')) || Response.error()));
  }
});
