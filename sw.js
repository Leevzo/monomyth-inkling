/* sw.js — THE SHELL KEPT FOR A DAY WITH NO SIGNAL (an iOS engineer read the app, 2026-10-02: "Inkling cannot open without
   signal"). Network first, always: a fresh build is never hidden behind an old one. Only when the network does not answer in
   four seconds is the last good copy of the page and its files served. Only this site's own files pass through here: the AI
   doors, the key and the kingdom never do (the kingdom lives in the phone's drawer, not in any file). version.json is never kept,
   so the fresh open still sees every new build. */
const C = 'inkling-shell';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.endsWith('version.json') || !u.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  const key = u.origin + u.pathname;   // one copy of each page and file under its own name, whatever its ?v= (crown.html never stands in for the app)
  e.respondWith(Promise.race([fetch(r), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 4000))])
    .then(res => { if (res && res.ok && res.type === 'basic') { const copy = res.clone(); e.waitUntil(caches.open(C).then(c => c.put(key, copy)).catch(() => {})); } return res; })
    .catch(() => caches.match(key).then(m => m || fetch(r))));
});
