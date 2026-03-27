const CACHE_NAME = 'bingo-v1.0.1.8';

// Use relative paths to ensure they work in GitHub subdirectories

const ASSETS = [
  '/BINGO/',
  '/BINGO/index.html',
  '/BINGO/style.css',
  '/BINGO/script.js',
  '/BINGO/manifest.json',
  '/BINGO/icon-192.png',
  '/BINGO/icon-512.png'
];


// 🟡 INSTALL: Pre-cache all essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Use {cache: 'reload'} to bypass the browser's HTTP cache 
      // and ensure we get the latest files from the server
      return cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).then(() => self.skipWaiting()) // Force transition to active state
  );
});

// 🟢 ACTIVATE: Clean up old caches immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim()) // Take control of open tabs immediately
  );
});

// 🔥 UPDATE: Handle manual updates from the UI
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 🔵 FETCH: The "Installability" engine (Crucial for WebAPK)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. Return cached asset if found
      if (cachedResponse) return cachedResponse;

      // 2. Otherwise, fetch from network
      return fetch(event.request).catch(() => {
        // 3. OFFLINE FALLBACK: If network fails and it's a page navigation,
        // return the main index.html to keep the PWA "alive"
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
