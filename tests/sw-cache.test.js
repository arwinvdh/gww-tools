// Service worker: oude caches opruimen. Alleen caches die aantoonbaar bij deze app horen, mogen verdwijnen.
// Draait via een lokale webserver (service workers werken niet onder file://). De site staat naast elkaar onder
// /locatie/ en /gww-tools/ om een verhuizing van het Pages-pad na te bootsen. Geen internet en geen GitHub.
// SW_FILE=/pad/naar/sw.js draait dezelfde controles tegen een andere sw.js (bijvoorbeeld de oude code).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium, launchOptions, ok } = require('./helpers.js');

const root = path.resolve(__dirname, '..');
const swSource = fs.readFileSync(process.env.SW_FILE || path.join(root, 'sw.js'), 'utf8');
const CDN_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
const CDN_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

// Dezelfde worker met een andere cachenaam: zo bootsen we een nieuwe release na.
function withCache(name) {
  if (!/const CACHE = '[^']*'/.test(swSource)) throw new Error("'const CACHE' niet gevonden in sw.js");
  return swSource.replace(/const CACHE = '[^']*'/, "const CACHE = '" + name + "'");
}
const until = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise(r => setTimeout(r, 100)); } return false; };

(async () => {
  const mounts = ['locatie', 'gww-tools'];
  let sw = {}, gone = {};          // per pad: de sw.js die wordt uitgeleverd, en of het pad weg is (404, zoals na een hernoeming)
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/seed.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<title>seed</title>'); }
    const m = u.match(/^\/([^/]+)\/(.*)$/);
    if (!m || !mounts.includes(m[1]) || gone[m[1]]) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end('<title>404</title>'); }
    if (m[2] === 'sw.js') { res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store' }); return res.end(sw[m[1]]); }
    const f = path.join(root, m[2] || 'index.html');
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(fs.readFileSync(f));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + server.address().port + '/';
  const b = await chromium.launch(launchOptions());

  const newContext = async () => { const c = await b.newContext(); await c.route(u => !u.href.startsWith(BASE), r => r.abort()); return c; };
  const open = async (ctx, urlPath) => { const p = await ctx.newPage(); await p.goto(BASE + urlPath); return p; };
  // Caches klaarzetten vóór de worker bestaat. Een lijst met paden of volledige URL's per cachenaam.
  const seed = async (ctx, spec) => {
    const p = await open(ctx, 'seed.html');
    await p.evaluate(async (spec) => {
      for (const name of Object.keys(spec)) {
        const c = await caches.open(name);
        for (const u of spec[name]) await c.put(new Request(u.startsWith('http') ? u : location.origin + u), new Response('x'));
      }
    }, spec);
    await p.close();
  };
  const listCaches = (p) => p.evaluate(async () => {
    const o = {}; for (const k of (await caches.keys()).sort()) o[k] = (await (await caches.open(k)).keys()).map(r => r.url.replace(location.origin, '')); return o;
  });
  const owners = (urls) => [...new Set(urls.filter(u => u.startsWith('/')).map(u => u.split('/')[1]))].sort();
  // Pas klaar als de worker de pagina bestuurt: dat gebeurt (clients.claim) ná het opruimen in 'activate'.
  const waitControlled = (p) => until(() => p.evaluate(() => !!navigator.serviceWorker.controller));
  // Nieuwe release op een pad: andere cachenaam in sw.js, daarna laat de browser de worker bijwerken.
  // Bij een update wisselt de controller al als de nieuwe worker begint te activeren; het opruimen in 'activate'
  // is pas klaar als die worker de status 'activated' heeft. Daar wachten we dus op.
  const releaseOn = async (p, mount, cacheName) => {
    sw[mount] = withCache(cacheName);
    await p.evaluate(async (scope) => {
      const changed = new Promise((res, rej) => { navigator.serviceWorker.addEventListener('controllerchange', res, { once: true }); setTimeout(() => rej(new Error('geen controllerchange na update')), 15000); });
      const r = await navigator.serviceWorker.getRegistration(scope); await r.update(); await changed;
      const t = Date.now();
      while (navigator.serviceWorker.controller.state !== 'activated') {
        if (Date.now() - t > 15000) throw new Error('nieuwe worker werd niet activated');
        await new Promise(res => setTimeout(res, 50));
      }
    }, BASE + mount + '/');
  };
  const titleOffline = async (ctx, urlPath) => {
    await ctx.setOffline(true); const p = await ctx.newPage();
    try { await p.goto(BASE + urlPath); return await p.title(); } catch (e) { return 'FOUT: ' + e.message.slice(0, 50); }
    finally { await ctx.setOffline(false); await p.close(); }
  };
  async function scenario(naam, fn) {
    sw = {}; gone = {}; const ctx = await newContext();
    try { await fn(ctx); } catch (e) { ok(false, naam + ': scenario afgebroken (' + e.message + ')'); }
    await ctx.close();
  }

  await scenario('opruimen', async (ctx) => {
    sw.locatie = withCache('locatie-v36');
    await seed(ctx, { 'locatie-v35': ['/locatie/index.html', '/locatie/start.html', CDN_JS, CDN_CSS] });
    const p = await open(ctx, 'locatie/start.html'); await waitControlled(p);
    const c = await listCaches(p);
    ok(!('locatie-v35' in c) && 'locatie-v36' in c, 'aantoonbaar eigen oude cache (eigen pad en gedeelde CDN-bestanden) wordt opgeruimd, de huidige blijft');
  });

  await scenario('vreemde caches', async (ctx) => {
    sw.locatie = withCache('locatie-v36');
    await seed(ctx, {
      'other-project-v1': ['/other/app.js'],
      'other-single-v1': ['/locatie/x.html'],
      'other-mixed-v1': ['/other/app.js', '/locatie/x.html'],
      'locatie-v9': ['/elders/x.html', '/locatie/index.html'],
      'locatie-v8': [CDN_JS]
    });
    const p = await open(ctx, 'locatie/start.html'); await waitControlled(p);
    const c = await listCaches(p);
    ok('other-project-v1' in c, 'cache van een ander project zonder bestanden uit onze scope blijft');
    ok('other-single-v1' in c, 'vreemde cache met één bestand uit onze scope blijft (naam is niet van ons)');
    ok('other-mixed-v1' in c, 'vreemde cache met eigen en vreemde bestanden blijft');
    ok('locatie-v9' in c, 'cache met onze naam maar met bestanden van een ander pad blijft');
    ok('locatie-v8' in c, 'cache met alleen gedeelde CDN-bestanden is niet toe te wijzen en blijft');
  });

  await scenario('gemengd', async (ctx) => {
    sw.locatie = withCache('locatie-v36'); sw['gww-tools'] = withCache('locatie-v37');
    await seed(ctx, { 'locatie-v35': ['/locatie/index.html', '/gww-tools/index.html'] });
    const p1 = await open(ctx, 'locatie/start.html'); await waitControlled(p1);
    ok('locatie-v35' in await listCaches(p1), 'cache met /locatie/- én /gww-tools/-bestanden blijft bij een worker op /locatie/');
    const p2 = await open(ctx, 'gww-tools/start.html'); await waitControlled(p2);
    ok('locatie-v35' in await listCaches(p2), 'dezelfde gemengde cache blijft ook bij een worker op /gww-tools/');
  });

  await scenario('zelfde naam', async (ctx) => {
    sw.locatie = withCache('locatie-v36'); sw['gww-tools'] = withCache('locatie-v36');
    const p1 = await open(ctx, 'locatie/start.html'); await waitControlled(p1);
    const p2 = await open(ctx, 'gww-tools/start.html'); await waitControlled(p2);
    let c = await listCaches(p2);
    ok(Object.keys(c).join() === 'locatie-v36' && owners(c['locatie-v36']).join() === 'gww-tools,locatie', 'twee workers met dezelfde cachenaam geven één gemengde cache (verwacht, niet schadelijk)');
    ok(await titleOffline(ctx, 'locatie/start.html') === 'Mijn tools' && await titleOffline(ctx, 'gww-tools/start.html') === 'Mijn tools', 'beide paden werken offline met de gedeelde cachenaam');
    await releaseOn(p2, 'gww-tools', 'locatie-v37');
    c = await listCaches(p2);
    ok('locatie-v37' in c && 'locatie-v36' in c && owners(c['locatie-v36']).join() === 'gww-tools,locatie', 'na een release op het nieuwe pad blijft de gemengde cache met beide paden staan (restcache, handmatig op te ruimen)');
    ok(await titleOffline(ctx, 'locatie/start.html') === 'Mijn tools' && await titleOffline(ctx, 'gww-tools/start.html') === 'Mijn tools', 'beide paden werken offline na die release');
  });

  await scenario('verschillende namen', async (ctx) => {
    sw.locatie = withCache('locatie-v36'); sw['gww-tools'] = withCache('locatie-v37');
    const p1 = await open(ctx, 'locatie/start.html'); await waitControlled(p1);
    gone.locatie = true;                                   // het oude pad bestaat niet meer, zoals na de hernoeming
    const p2 = await open(ctx, 'gww-tools/start.html'); await waitControlled(p2);
    let c = await listCaches(p2);
    ok(Object.keys(c).join() === 'locatie-v36,locatie-v37' && owners(c['locatie-v36']).join() === 'locatie' && owners(c['locatie-v37']).join() === 'gww-tools', 'verschillende cachenamen blijven per pad gescheiden en onaangeroerd');
    ok(await titleOffline(ctx, 'locatie/start.html') === 'Mijn tools', 'de oude app op het verdwenen pad start offline vanuit zijn cache');
    const upd = await p1.evaluate(async (scope) => { try { const r = await navigator.serviceWorker.getRegistration(scope); await r.update(); return 'update ok'; } catch (e) { return 'update fout'; } }, BASE + 'locatie/');
    const st = await p1.evaluate(async (scope) => { const r = await navigator.serviceWorker.getRegistration(scope); return { active: r && r.active && r.active.state, controls: !!navigator.serviceWorker.controller }; }, BASE + 'locatie/');
    ok(upd === 'update fout' && st.active === 'activated' && st.controls, 'een mislukte update laat de actieve worker op het oude pad actief en besturend (' + upd + ', ' + st.active + ')');
    await releaseOn(p2, 'gww-tools', 'locatie-v38');
    c = await listCaches(p2);
    ok(!('locatie-v37' in c) && 'locatie-v38' in c && 'locatie-v36' in c, 'op het nieuwe pad wordt de eigen oude cache opgeruimd en blijft de cache van het oude pad staan');
  });

  await scenario('offline', async (ctx) => {
    sw.locatie = withCache('locatie-v36');
    const pages = ['locatie/start.html', 'locatie/index.html', 'locatie/route.html'];
    const ps = []; for (const f of pages) { const p = await open(ctx, f); await waitControlled(p); ps.push(p); }
    const want = ['Mijn tools', 'Locatie delen', 'Route Knijperwagen'];
    const got = []; for (const f of pages) got.push(await titleOffline(ctx, f));
    ok(got.join() === want.join(), 'startpagina en beide tools openen offline (' + got.join(' / ') + ')');
    await releaseOn(ps[0], 'locatie', 'locatie-v37');
    const got2 = []; for (const f of pages) got2.push(await titleOffline(ctx, f));
    const c = await listCaches(ps[0]);
    ok(got2.join() === want.join() && !('locatie-v36' in c) && 'locatie-v37' in c, 'na een release op hetzelfde pad werkt alles offline en is de vorige eigen cache opgeruimd');
  });

  await b.close(); server.close();
})();
