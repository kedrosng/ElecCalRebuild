// PocketElec service worker — offline-first for core assets.
const CACHE = 'pocketelec-v2.0.0';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './icons/icon.svg',
  './js/app.js',
  './js/i18n.js',
  './js/store.js',
  './js/router.js',
  './js/formulas.js',
  './js/cable-data.js',
  './js/demos.js',
  './js/export.js',
  './js/nl.js',
  './js/modules/dashboard.js',
  './js/modules/cable-sizing.js',
  './js/modules/genset-sizing.js',
  './js/modules/loading-estimation.js',
  './js/modules/projects.js',
  './js/modules/settings.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Network-first for HTML, cache-first for everything else in our origin
  if (request.mode === 'navigate' || request.destination === 'document') {
    e.respondWith(
      fetch(request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(request, copy)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
        return r;
      }).catch(() => cached))
    );
  }
});
