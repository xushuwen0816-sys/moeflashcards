self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('Old Service Worker detecting... Self-destructing to fix 404.');
  self.registration.unregister()
    .then(() => {
      return self.clients.matchAll();
    })
    .then((clients) => {
      clients.forEach(client => client.navigate(client.url));
    });
});