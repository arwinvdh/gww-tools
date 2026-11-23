// Offline en service worker via een lokale webserver (service workers werken niet onder file://). Met nagebootste CDN-bestanden uit node_modules.
// Controleert: alle pagina's en de externe bibliotheken (Leaflet voor de kaart, jsPDF voor rapporten) werken zonder internet nadat de app
// één keer online is geopend, en een nieuwe versie wordt opgehaald en vervangt de oude kopie (ook offline daarna).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium, launchOptions, ok, LEAFLET_JS, LEAFLET_CSS } = require('./helpers.js');
const JSPDF = require.resolve('jspdf/dist/jspdf.umd.min.js');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const swSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const withCache = (n) => swSource.replace(/const CACHE = '[^']*'/, "const CACHE = '" + n + "'");
const until = async (fn, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise(r => setTimeout(r, 150)); } return false; };
const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); const TODAY = iso(new Date());
(async () => {
  let sw = withCache('locatie-v900'), titleSuffix = '';
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]); const m = u.match(/^\/gww-tools\/(.*)$/);
    if (!m) { res.writeHead(404); return res.end(); }
    if (m[1] === 'sw.js') { res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store' }); return res.end(sw); }
    const f = path.join(root, m[1] || 'index.html');
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    let body = fs.readFileSync(f);
    if (m[1] === 'index.html' && titleSuffix) body = Buffer.from(body.toString('utf8').replace('<title>Locatie delen</title>', '<title>Locatie delen ' + titleSuffix + '</title>'));
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + server.address().port + '/gww-tools/';
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true });
  let offline = false;
  await ctx.route(u => !u.href.startsWith(BASE), r => {
    const url = r.request().url();
    if (offline) return r.abort();
    if (/leaflet\.min\.js/.test(url)) return r.fulfill({ path: LEAFLET_JS, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } });
    if (/leaflet\.min\.css/.test(url)) return r.fulfill({ path: LEAFLET_CSS, contentType: 'text/css', headers: { 'access-control-allow-origin': '*' } });
    if (/jspdf\.umd\.min\.js/.test(url)) return r.fulfill({ path: JSPDF, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } });
    return r.abort();
  });
  await ctx.addInitScript(([T]) => { if (localStorage.getItem('__s')) return; localStorage.setItem('__s', '1'); localStorage.setItem('start.tipX', '1');
    localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB9', name: 'Offline project', created: 1, modified: 2 }]));
    localStorage.setItem('gww.log', JSON.stringify([{ v: 1, id: 'l1', projectId: 'p1', date: T, work: 'Gewerkt zonder internet', equipment: [], crew: [{ partner: 'Bouwpartner', count: 2, hours: 8 }], created: 5, modified: 6 }])); }, [TODAY]);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  const cacheNames = () => p.evaluate(() => caches.keys());
  const cached = () => p.evaluate(async () => { const out = []; for (const k of await caches.keys()) { const c = await caches.open(k); out.push(...(await c.keys()).map(r => r.url)); } return out; });

  // 1. online openen: de worker installeert en bewaart de app en de bibliotheken
  await p.goto(BASE + 'start.html');
  ok(await until(async () => (await cacheNames()).includes('locatie-v900') && (await cached()).filter(u => /leaflet|jspdf/.test(u)).length >= 3), 'online: de worker bewaart de app, Leaflet (js en css) en jsPDF');
  const urls = await cached();
  const need = ['index.html', 'route.html', 'projecten.html', 'logboek.html', 'start.html', 'vault.html', 'visie.html', 'shared.css', 'sync.js', 'datasync.js', 'nav.js', 'version.js'];
  ok(need.every(f => urls.some(u => u.endsWith('/' + f))), 'online: alle pagina\'s en scripts staan in de bewaarde kopie (' + need.filter(f => !urls.some(u => u.endsWith('/' + f))).join(', ') + ')');
  await p.goto(BASE + 'index.html'); await p.waitForTimeout(800);   // zodat de pagina onder de worker valt

  // 2. offline: alle pagina's openen, de kaart en het PDF-rapport werken
  offline = true; await ctx.setOffline(true);
  const bad = [];
  for (const f of ['start.html', 'index.html', 'route.html', 'projecten.html', 'logboek.html', 'vault.html', 'visie.html']) {
    p.errs.length = 0; await p.goto(BASE + f); await p.waitForTimeout(400);
    if (p.errs.length || !(await p.evaluate(() => document.body.innerText.length > 20))) bad.push(f + ' ' + (p.errs[0] || 'leeg'));
  }
  ok(bad.length === 0, 'offline: alle 7 pagina\'s openen zonder fouten (' + (bad.join(', ') || 'geen afwijkingen') + ')');
  await p.goto(BASE + 'index.html'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => typeof L !== 'undefined' && !!document.querySelector('#map .leaflet-pane')), 'offline: Leaflet komt uit de bewaarde kopie en de kaart staat er');
  await p.fill('#q', '52.0907, 5.1214'); await p.click('#go'); await p.waitForTimeout(500); await p.fill('#nr', 'IB9'); await p.waitForTimeout(300);
  ok(/52\.0907,5\.1214/.test(await p.evaluate(() => document.getElementById('preview').innerText)) && await p.isEnabled('#copy'), 'offline: een pin zetten en het bericht samenstellen werkt');
  await p.goto(BASE + 'logboek.html#/p/p1/' + TODAY); await p.waitForTimeout(500);
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }).catch(() => null), p.click('#report')]);
  ok(dl && /^dagrapport-IB9-/.test(dl.suggestedFilename()) && fs.readFileSync(await dl.path()).slice(0, 5).toString() === '%PDF-', 'offline: jsPDF komt uit de bewaarde kopie en het dagrapport wordt gemaakt');

  // 3. een nieuwe versie: de pagina komt van het netwerk, de oude kopie verdwijnt, ook offline daarna blijft het nieuwe staan
  offline = false; await ctx.setOffline(false);
  sw = withCache('locatie-v901'); titleSuffix = 'NIEUW';
  await p.goto(BASE + 'index.html'); await p.waitForTimeout(800);
  ok((await p.title()).includes('NIEUW'), 'update: online krijg je meteen de nieuwe pagina (netwerk eerst)');
  ok(await until(async () => { const n = await cacheNames(); return n.includes('locatie-v901') && !n.includes('locatie-v900'); }), 'update: de nieuwe worker neemt het over en ruimt de oude cache op (' + (await cacheNames()).join(', ') + ')');
  ok(await until(async () => (await cached()).filter(u => /leaflet|jspdf/.test(u)).length >= 3), 'update: de bibliotheken staan ook in de nieuwe cache');
  await p.goto(BASE + 'index.html'); await p.waitForTimeout(600);
  offline = true; await ctx.setOffline(true);
  await p.goto(BASE + 'index.html'); await p.waitForTimeout(600);
  ok((await p.title()).includes('NIEUW') && await p.evaluate(() => typeof L !== 'undefined'), 'update: offline staat daarna de nieuwe versie (niet de oude) en Leaflet is er nog');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('gww.projects')).length === 1 && JSON.parse(localStorage.getItem('gww.log')).length === 1), 'update: projecten en logboek zijn na de update ongewijzigd');
  ok(p.errs.length === 0, 'geen scriptfouten ' + p.errs.join('|'));
  await b.close(); server.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
