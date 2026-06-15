const CACHE = 'niochess-v1';

const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/state.js',
  './js/engine.js',
  './js/ai.js',
  './js/net.js',
  './js/game.js',
  './js/render.js',
  './js/ui.js',
  './js/i18n.js',
  './manifest.webmanifest',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cachePut(req, res) {
  if (res && res.status === 200) {
    const copy = res.clone();
    caches.open(CACHE).then(cache => cache.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.hostname.includes('esm.sh')) return;

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then(res => cachePut(req, res))
        .catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  const cdn =
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');
  if (cdn) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => cachePut(req, res)))
    );
  }
});
