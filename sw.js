const CACHE_NAME = 'swan-pwa-v2'; // <--- Aggiornato a V2 per forzare il refresh!

self.addEventListener('install', e => {
  self.skipWaiting(); // Forza l'attivazione immediata della nuova versione
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(['./index.html', './manifest.json']))
  );
});

self.addEventListener('activate', e => {
  // Pulisce le vecchie cache (elimina la v1)
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
