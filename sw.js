const CACHE_NAME = 'swan-pwa-v3'; // <--- Aggiornato a v3 per caricare style.css e app.js

self.addEventListener('install', e => {
  self.skipWaiting(); // Forza l'attivazione immediata della nuova versione
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([
      './',
      './index.html',
      './style.css',
      './app.js',
      './manifest.json'
    ]))
  );
});

self.addEventListener('activate', e => {
  // Pulisce le vecchie cache (elimina la v1, v2, ecc.)
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
});

self.addEventListener('fetch', e => {
  // 🛑 IGNORA LA CACHE PER LE CHIAMATE API (Google Apps Script)
  if (e.request.url.includes('script.google.com')) {
    return; // Lascia che la chiamata passi diretta a Internet
  }

  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
