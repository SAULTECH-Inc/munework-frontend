const CACHE_NAME = 'munework-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass non-GET and API calls straight to network
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  // SPA navigation: fall back to the cached shell only when offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        return (await caches.match('/index.html')) || (await caches.match('/')) ||
          new Response('Offline', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // Handle static assets with stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      // Never substitute the HTML shell for a script, stylesheet or image —
      // the browser would try to parse index.html as JavaScript and fail in a
      // way that looks nothing like the network error that actually happened.
      return fetch(event.request).catch(
        () => new Response('', { status: 504, statusText: 'Network unavailable' }),
      );
    })
  );
});
