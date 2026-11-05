// Offline support: the network wins when it answers, otherwise use what we last saw.
// Only ever caches files as published, so song data stays encrypted at rest.
const CACHE = 'choir-practice-v1';
const SHELL = ['./', 'manifest.webmanifest', 'icons/favicon.svg', 'icons/apple-touch-icon.png', 'data/catalogue.bin'];
const PATIENCE_MS = 4000;  // on bad signal, stop waiting once we have a cached copy to show

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(e.request).then(r => {
      if (r.ok) cache.put(e.request, r.clone());
      return r;
    });
    const cached = await cache.match(e.request);
    if (!cached) return net;
    const timeout = new Promise(res => setTimeout(() => res(cached), PATIENCE_MS));
    return Promise.race([net.catch(() => cached), timeout]);
  })());
});
