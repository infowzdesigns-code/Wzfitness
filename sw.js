
// WZ Fitness service worker -- network first, cache fallback
const CACHE = 'wz-fitness-v7-2-1';
const ASSETS = ['./', './index.html', './manifest.json', './wz-icon-192.png', './wz-icon-512.png', './wz-apple-icon-180.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Don't cache jsonblob.com sync calls
  const url = new URL(event.request.url);
  if (url.hostname.includes('jsonblob.com')) return;
  // Never cache your synced data or the Health inbox
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;
  event.respondWith(
    // v7.2: always ask the server for a fresh copy (GitHub Pages lets phones cache pages for 10 minutes)
    (url.origin === self.location.origin ? fetch(event.request.url, { cache: 'no-cache' }) : fetch(event.request))
      .then(res => {
        // v6.5: if the site answers with an error page (e.g. host paused), use the saved copy instead
        if (!res.ok && res.type !== 'opaque') return caches.match(event.request, { ignoreSearch: true }).then(r => r || (event.request.mode === 'navigate' ? caches.match('./index.html') : null) || res);
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
  );
});
