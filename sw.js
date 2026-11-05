// Lost Pet Hero offline service worker (generated at build time)
const CACHE = 'lostpet-79811e3147';
const SHELL = ["./","./.nojekyll","./assets/baloo-2-devanagari-700-normal-CEIF4sJg.woff","./assets/baloo-2-devanagari-700-normal-D37Te3iF.woff2","./assets/baloo-2-latin-700-normal-CqTg7A15.woff2","./assets/baloo-2-latin-700-normal-Ld3Zm3l2.woff","./assets/baloo-2-latin-ext-700-normal-D6LeXASg.woff","./assets/baloo-2-latin-ext-700-normal-Mlh7kdab.woff2","./assets/baloo-2-vietnamese-700-normal-DoF59Mjc.woff","./assets/baloo-2-vietnamese-700-normal-h4tlcePq.woff2","./assets/esm-kO4WZLCm.js","./assets/fredoka-hebrew-700-normal-DBqnFHCe.woff2","./assets/fredoka-hebrew-700-normal-DiqR04Vd.woff","./assets/fredoka-latin-700-normal-BOIZVyIN.woff2","./assets/fredoka-latin-700-normal-C8FeHd3X.woff","./assets/index-BribpQQP.css","./assets/index-DKT7Xo78.js","./assets/nunito-cyrillic-600-normal-BUjmtIuu.woff","./assets/nunito-cyrillic-600-normal-DJGQ2h05.woff2","./assets/nunito-cyrillic-800-normal-D3igD7Kl.woff2","./assets/nunito-cyrillic-800-normal-DymMgApb.woff","./assets/nunito-cyrillic-ext-600-normal-CWPPjBOD.woff2","./assets/nunito-cyrillic-ext-600-normal-vnfu4DTE.woff","./assets/nunito-cyrillic-ext-800-normal-B-cvGohL.woff2","./assets/nunito-cyrillic-ext-800-normal-pjRatrRO.woff","./assets/nunito-latin-600-normal-Br8yIETf.woff2","./assets/nunito-latin-600-normal-Cd0eNu1l.woff","./assets/nunito-latin-800-normal-D-J0wlBY.woff","./assets/nunito-latin-800-normal-Dz8SOQK_.woff2","./assets/nunito-latin-ext-600-normal-BKUpuB78.woff","./assets/nunito-latin-ext-600-normal-Dd9Zuxh1.woff2","./assets/nunito-latin-ext-800-normal-CDcxIxx8.woff","./assets/nunito-latin-ext-800-normal-CtU8tJOV.woff2","./assets/nunito-vietnamese-600-normal-BY8O6Cug.woff2","./assets/nunito-vietnamese-600-normal-DO1RqFw5.woff","./assets/nunito-vietnamese-800-normal-D_CZYdm9.woff2","./assets/nunito-vietnamese-800-normal-Dz0hZPb5.woff","./assets/web-CCLyllC0.js","./icon-180.png","./icon-192.png","./icon-512.png","./index.html","./manifest.webmanifest"];
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
    if (r.ok && (path.includes('/assets/') || path.includes('/voice/') || path.includes('/sfx/') || path.includes('/music/'))) {
      const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp));
    }
    return r;
  })));
});
