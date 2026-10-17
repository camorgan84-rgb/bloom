// Bloom offline support. Serves the saved copy right away, then quietly
// fetches the latest version so the next launch is up to date.
const CACHE = 'bloom-v7';
const FILES = ['./', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's own cache so we save the real latest files
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // Every page load maps to the one saved copy of the app, whatever the query string
  const key = e.request.mode === 'navigate'
    ? new URL('./', self.registration.scope).href
    : url.origin + url.pathname;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(key);
    const fresh = fetch(new Request(url.origin + url.pathname, { cache: 'no-cache' }))
      .then(res => { if (res.ok) cache.put(key, res.clone()); return res; })
      .catch(() => cached);
    return cached || fresh;
  }));
});
