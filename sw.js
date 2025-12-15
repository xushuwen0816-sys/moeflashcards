const CACHE_NAME = 'moe-cards-v2';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Install: Cache core files immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch(err => {
        console.error('Cache failed:', err);
      });
    })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network first, then fallback to cache (The 404 Killer)
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests (like CDNs) for now to keep it simple, or let them pass through
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If network works, return it and optionally cache it
        return response;
      })
      .catch(() => {
        // If network fails (or 404s in some contexts), try cache
        // Specifically for navigation requests (opening the app), return index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html').then(response => {
            return response || caches.match('./');
          });
        }
        return caches.match(event.request);
      })
  );
});