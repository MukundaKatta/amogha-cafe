const CACHE_NAME = 'amogha-v64';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=64',
  './script.js?v=64',
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

// Fetch — network first for documents/CSS/JS, cache first for images
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Skip non-GET requests and external URLs
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // HTML documents, CSS, JS — always network first
  var isDocument = e.request.destination === 'document';
  var isStyle = e.request.destination === 'style' || url.pathname.endsWith('.css');
  var isScript = e.request.destination === 'script' || url.pathname.endsWith('.js');

  if (isDocument || isStyle || isScript) {
    e.respondWith(
      fetch(e.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || (isDocument ? caches.match('./index.html') : new Response('', { status: 503 }));
        });
      })
    );
    return;
  }

  // Images and other assets — cache first, network fallback
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
