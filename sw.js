const CACHE_NAME = 'moe-cards-v5-ios-fix';
const OFFLINE_URL = './index.html';

const ASSETS = [
  './',
  OFFLINE_URL,
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Important: Cache both the root and the explicit index.html
      // This ensures hits regardless of how iOS requests the start_url
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => k !== CACHE_NAME && caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Navigation requests (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // 1. Try Network First
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          // 2. Network failed (Offline or 404), return cached index.html
          const cache = await caches.open(CACHE_NAME);
          
          // Try to match exact request first
          let cachedResponse = await cache.match(event.request);
          if (cachedResponse) return cachedResponse;
          
          // Fallback: Return the specific offline page (index.html)
          // irrespective of the sub-path requested (SPA support)
          cachedResponse = await cache.match(OFFLINE_URL);
          if (cachedResponse) return cachedResponse;

          // Last resort: Try matching './'
          return cache.match('./');
        }
      })()
    );
    return;
  }

  // Asset requests (CSS, JS, Images)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      // Cache First, then Network
      return cached || fetch(event.request);
    })
  );
});