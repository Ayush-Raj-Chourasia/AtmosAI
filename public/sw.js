/**
 * N-WEIS: National Weather Event Intelligence System
 * Disaster Resilient Service Worker & Offline Cache (SIH26069)
 * Enables field disaster responders and Aapda Mitra volunteers to operate
 * seamlessly during severe weather-induced cellular / power blackouts.
 */

const CACHE_NAME = 'nweis-v2-live';
const PREVIOUS_CACHE = 'nweis-v1-offline';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

// Install: pre-cache critical app shell & skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[N-WEIS SW] Caching offline emergency operational shell v2-live');
      return cache.addAll(SHELL_ASSETS);
    })
  );
});

// Activate: clean up older cache versions immediately and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[N-WEIS SW] Deleting obsolete cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore SSE streams and non-GET requests for standard caching
  if (url.pathname.includes('/stream') || request.method !== 'GET') {
    return;
  }

  // 1. Navigation & HTML Requests: STRICT NETWORK-FIRST
  // Guarantees UI bugfixes and updates reflect immediately without browser caching
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          console.warn('[N-WEIS SW] Offline mode: Serving cached index.html');
          const cached = await caches.match('/index.html');
          if (cached) return cached;
          return caches.match(request);
        })
    );
    return;
  }

  // 2. API Caching: Network-first with cache fallback for offline situational awareness
  if (url.pathname.startsWith('/api/v1/events') || url.pathname.startsWith('/api/v1/admin/stats') || url.pathname.startsWith('/api/v1/admin/analytics') || url.pathname.startsWith('/api/v1/sensors')) {
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

  // 3. Static assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => null);
      return cachedResponse || fetchPromise;
    })
  );
});
