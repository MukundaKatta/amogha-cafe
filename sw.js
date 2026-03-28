const CACHE_NAME = 'amogha-v78';
const MAX_CACHE_ITEMS = 200; // Prevent unbounded cache growth
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './amogha-logo.png',
  // Hero slideshow images
  './bg.jpeg',
  './pics/Gemini_Generated_Image_gax5k7gax5k7gax5.png',
  './Gemini_Generated_Image_x9jtrox9jtrox9jt.png',
  './chefchallu.jpg',
  './BreakfastAtSimplySouthNew.png',
  './chefchallu2.jpg',
  './SimplySouthAtKnowledgeCityNew.png',
  './pics/Gemini_Generated_Image_umcuogumcuogumcu.png',
  './pics/gourmet-meal-with-grilled-meat-rice-generated-by-ai.jpg',
  // Chef images
  './pics/WhatsApp Image 2026-02-22 at 11.48.37 AM.jpeg',
  './pics/WhatsApp Image 2026-02-22 at 11.56.52 AM.jpeg',
  './pics/WhatsApp Image 2026-02-24 at 4.46.56 AM.jpeg',
  // Menu category images
  './pics/Gemini_Generated_Image_wnzsqxwnzsqxwnzs.png',
  './pics/Gemini_Generated_Image_tu348stu348stu34.png',
  './pics/Gemini_Generated_Image_h1vezgh1vezgh1ve.png',
  './pics/Gemini_Generated_Image_5jdcgq5jdcgq5jdc.png',
  './pics/Gemini_Generated_Image_1ojbou1ojbou1ojb.png',
  './pics/Gemini_Generated_Image_bfgo8abfgo8abfgo.png',
  './pics/Gemini_Generated_Image_6lqqu6lqqu6lqqu6.png',
  // Gallery images
  './pics/logo-sign.jpeg',
  './pics/chai-stall.jpeg',
  './pics/stall-wide.jpeg',
  './pics/street-view.jpeg',
  './pics/stall-close.jpeg',
  './pics/curries-menu.jpeg'
];

// Placeholder SVG for offline image fallback
var OFFLINE_IMAGE_PLACEHOLDER = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">'
  + '<rect width="400" height="300" fill="#2c1810"/>'
  + '<text x="200" y="140" text-anchor="middle" fill="#D4A017" font-size="18" font-family="sans-serif">Image unavailable offline</text>'
  + '<text x="200" y="170" text-anchor="middle" fill="#8a6d3b" font-size="14" font-family="sans-serif">Amogha Cafe</text>'
  + '</svg>';

// Install — cache all assets, skip waiting immediately
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(ASSETS); })
  );
  self.skipWaiting();
});

// Activate — delete ALL old caches and claim clients immediately
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Auto-trim counter — run trimCache() every 50 fetches to prevent unbounded growth
var fetchCount = 0;

// Fetch — tiered caching strategy
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Skip non-GET requests and external URLs
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // Auto-trim cache every 50 fetches
  fetchCount++;
  if (fetchCount % 50 === 0) trimCache();

  // Skip API requests from caching (they have their own caching in-app)
  if (url.pathname.startsWith('/api')) return;

  // HTML documents, CSS, JS — stale-while-revalidate (fast + fresh)
  var isDocument = e.request.destination === 'document';
  var isStyle = e.request.destination === 'style' || url.pathname.endsWith('.css');
  var isScript = e.request.destination === 'script' || url.pathname.endsWith('.js');

  if (isDocument || isStyle || isScript) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        // Network fetch with 5s timeout to prevent indefinite hangs
        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 5000);
        var fetchPromise = fetch(e.request, { signal: controller.signal }).then(function(response) {
          clearTimeout(timeoutId);
          if (response.ok && response.type !== 'opaque') {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
          }
          return response;
        }).catch(function() {
          clearTimeout(timeoutId);
          return cached || (isDocument ? caches.match('./index.html') : new Response('', { status: 503 }));
        });
        // Return cached immediately if available, revalidate in background
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Images — stale-while-revalidate with 3s network timeout + offline placeholder
  var isImage = e.request.destination === 'image';
  if (isImage) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        // Network fetch with 3s timeout to keep images fresh
        var imgController = new AbortController();
        var imgTimeout = setTimeout(function() { imgController.abort(); }, 3000);
        var fetchPromise = fetch(e.request, { signal: imgController.signal }).then(function(response) {
          clearTimeout(imgTimeout);
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
          }
          return response;
        }).catch(function() {
          clearTimeout(imgTimeout);
          // Return cached version if available, otherwise a branded placeholder SVG
          return cached || new Response(OFFLINE_IMAGE_PLACEHOLDER, {
            headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' }
          });
        });
        // Return cached immediately if available, revalidate in background
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Hashed chunk files (assets/*-[hash].js) — cache first (immutable by content hash)
  if (url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
          }
          return response;
        });
      })
    );
    return;
  }

  // Other assets — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      });
    })
  );
});

// ===== CACHE HOUSEKEEPING =====
// Trim cache to prevent unbounded growth on devices with limited storage
async function trimCache() {
  try {
    var cache = await caches.open(CACHE_NAME);
    var keys = await cache.keys();
    if (keys.length > MAX_CACHE_ITEMS) {
      // Remove oldest entries (first added) until within limit
      var toDelete = keys.slice(0, keys.length - MAX_CACHE_ITEMS);
      await Promise.all(toDelete.map(function(req) { return cache.delete(req); }));
    }
  } catch(e) { /* storage quota errors are non-fatal */ }
}

// Periodic cache trim on message from main thread
self.addEventListener('message', function(e) {
  if (e.data === 'trimCache') trimCache();
});

// ===== FIREBASE CLOUD MESSAGING (Background Push) =====
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) { data = {}; }

  var title = (data.notification && data.notification.title) || 'Amogha Cafe';
  var options = {
    body: (data.notification && data.notification.body) || 'You have a new notification',
    icon: './amogha-logo.png',
    badge: './amogha-logo.png',
    tag: 'amogha-push',
    data: data.data || {}
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = '/';
  if (e.notification.data && e.notification.data.url) {
    url = e.notification.data.url;
  }
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        if (windowClients[i].url.indexOf(url) !== -1) {
          return windowClients[i].focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
