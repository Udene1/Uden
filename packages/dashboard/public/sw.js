const CACHE = 'uden-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Keep authenticated/API requests network-authoritative. The service worker only
  // provides an offline fallback for the public shell.
  if (request.url.includes('/api/') || request.url.includes('/dashboard')) return;

  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok && ['style', 'script', 'font', 'image'].includes(request.destination)) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request))
  );
});
