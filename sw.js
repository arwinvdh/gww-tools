// Service worker: de app opent ook zonder of met slecht bereik.
// Pagina en manifest: eerst het netwerk (altijd de nieuwste versie), na 4 s of zonder netwerk de bewaarde kopie.
// Kaartbibliotheek en iconen: uit de cache.
const CACHE = 'locatie-v66';
const LOCAL = ['./', 'index.html', 'route.html', 'start.html', 'vault.html', 'visie.html', 'sync.js', 'version.js', 'nav.js', 'datasync.js', 'projecten.html', 'logboek.html', 'shared.css', 'manifest.webmanifest', 'route.webmanifest', 'start.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/start-icon-180.png', 'icons/start-icon-192.png', 'icons/start-icon-512.png',
  'icons/route-icon-180.png', 'icons/route-icon-192.png', 'icons/route-icon-512.png',
  'icons/projecten-icon-180.png', 'icons/projecten-icon-192.png', 'icons/projecten-icon-512.png',
  'icons/logboek-icon-180.png', 'icons/logboek-icon-192.png', 'icons/logboek-icon-512.png'];
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js'
];

// Oude caches opruimen mag alleen als ze aantoonbaar van deze app zijn: de naam begint met CACHE_PREFIX én alle
// bestanden liggen onder het eigen pad of zijn gedeelde CDN-bestanden (minstens één onder het eigen pad).
// Gemengde of onduidelijke caches blijven staan: een restcache kost wat opslag, een verkeerd gewiste cache kost
// offlinewerking. Andere projecten op dezelfde origin en de cache van een app op een ander pad blijven dus heel.
// Verander je de cachenaam van het project, pas dan ook CACHE_PREFIX aan en beslis bewust over de oude caches.
const CACHE_PREFIX = 'locatie-v';
async function isOwnCache(name) {
  if (!name.startsWith(CACHE_PREFIX)) return false;
  try {
    const urls = (await (await caches.open(name)).keys()).map((r) => r.url);
    const own = urls.filter((u) => u.startsWith(self.registration.scope)).length;
    return own > 0 && own + urls.filter((u) => CDN.includes(u)).length === urls.length;
  } catch (err) { return false; }  // bij twijfel niet wissen
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(LOCAL.concat(CDN).map((u) => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && await isOwnCache(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (CDN.includes(req.url)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return r;
    })));
    return;
  }

  if (url.origin === self.location.origin) {
    const isPage = req.mode === 'navigate' || /\.(html|webmanifest|js|css)$/.test(url.pathname) || url.pathname.endsWith('/');
    if (isPage) {
      e.respondWith((async () => {
        const net = fetch(req).then((r) => {
          if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return r;
        });
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('traag')), 4000));
        try { return await Promise.race([net, timeout]); }
        catch (err) { return (await caches.match(req, { ignoreSearch: true })) || (await caches.match('index.html')) || net; }
      })());
    } else {
      e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
    }
  }
});
