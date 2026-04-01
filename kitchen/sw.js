// Kitchen Display System Service Worker v1
var CACHE_NAME = 'kds-v1';
var CORE_ASSETS = [
  './',
  './index.html',
  '../amogha-logo.png'
];
var OPTIONAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@500;700&family=JetBrains+Mono:wght@400;600;700&display=swap'
];

// Install: cache core assets (required), then optional assets (best-effort)
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CORE_ASSETS).then(function() {
        return Promise.allSettled(OPTIONAL_ASSETS.map(function(url) { return cache.add(url); }));
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first, fallback to cache
self.addEventListener('fetch', function(e) {
  // Skip non-GET and Firebase/Firestore requests (let them go through normally)
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  if (url.indexOf('firestore.googleapis.com') !== -1 ||
      (url.indexOf('firebase') !== -1 && url.indexOf('.js') !== -1)) {
    return;
  }

  e.respondWith(
    fetch(e.request).then(function(response) {
      // Cache successful responses only
      if (response && response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      // Offline: serve from cache
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
