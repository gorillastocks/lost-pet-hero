// Lost Pet Hero offline service worker (generated at build time)
const CACHE = 'lostpet-98500c4a8e';
const SHELL = ["./","./.nojekyll","./assets/esm-kCqkd98W.js","./assets/index-D9AsHLxl.js","./assets/index-DoSkMfh9.css","./assets/web-CROrlO4x.js","./icon-180.png","./icon-192.png","./icon-512.png","./index.html","./manifest.webmanifest"];
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const f of SHELL) { try { await c.add(f); } catch (err) { /* one miss must not block update */ } }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('lostpet-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  const path = url.pathname;
  const isNav = req.mode === 'navigate' || path.endsWith('/') || path.endsWith('/index.html') || /index-[A-Za-z0-9_-]+\.js$/.test(path);
  if (isNav) {
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? './' : req, cp)); }
      return r;
    }).catch(() => caches.match(req.mode === 'navigate' ? './' : req)));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok && path.includes('/assets/')) {
      const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp));
    }
    return r;
  })));
});
