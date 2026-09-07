/**
 * N-WEIS: National Weather Event Intelligence System
 * Disaster Resilient Service Worker & Offline Cache (SIH26069)
 * Enables field disaster responders and Aapda Mitra volunteers to operate
 * seamlessly during severe weather-induced cellular / power blackouts.
 */

const CACHE_NAME = 'nweis-v1-offline';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

// Install: pre-cache critical app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[N-WEIS SW] Caching offline emergency operational shell');
      return cache.addAll(SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up older cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for API endpoints, Stale-While-Revalidate for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore SSE streams and non-GET requests for standard caching
  if (url.pathname.includes('/stream') || request.method !== 'GET') {
    return;
  }

  // API Caching: Network-first with cache fallback for offline situational awareness
  if (url.pathname.startsWith('/api/v1/events') || url.pathname.startsWith('/api/v1/admin/stats') || url.pathname.startsWith('/api/v1/sensors')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          console.warn('[N-WEIS SW] Network unreachable. Serving cached incident intelligence for:', url.pathname);
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return new Response(JSON.stringify({
            offline: true,
            message: 'N-WEIS Offline Mode: Network connection unavailable in disaster sector. Displaying local cached intelligence.'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // App shell & UI assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => {
        // Fallback to cached index.html for page navigation
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
      return cachedResponse || fetchPromise;
    })
  );
});
