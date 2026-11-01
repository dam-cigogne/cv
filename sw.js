// Service worker : hors connexion + toujours la dernière version quand le réseau est là.
const V = 'cvpoche-v2';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'parser.js', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'pdf.min.mjs', 'pdf.worker.min.mjs'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' }))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  const same = url.origin === location.origin;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !fonts) return;
  if (fonts) {
    // polices : cache d'abord
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; })));
    return;
  }
  // appli : réseau d'abord (revalidation), cache en secours hors connexion
  e.respondWith(
    fetch(r.url, { cache: 'no-cache' }).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }))
  );
});
