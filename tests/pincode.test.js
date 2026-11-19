// Pincode: token versleuteld in vault.json, koppelen met alleen de pincode. Draait via een lokale webserver omdat vault.json echt wordt opgehaald.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium, launchOptions, ok } = require('./helpers.js');
const { createMock } = require('./mock-github.js');
(async () => {
  const root = path.resolve(__dirname, '..');
  let vault = null;                                    // wat /vault.json teruggeeft; null = bestaat niet
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/vault.json') { if (!vault) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': 'application/json' }); return res.end(vault); }
    const f = path.join(root, u === '/' ? 'start.html' : u);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + server.address().port + '/';
  const b = await chromium.launch(launchOptions());
  const gh = createMock(); const REPO = 'arwinvdh/locatie-data', TOKEN = 'github_pat_testtoken_0123456789', PIN = '482915';
  async function dev() {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
    await ctx.route(u => !/^(http:\/\/127\.0\.0\.1|https:\/\/api\.github\.com)/.test(u.href), r => r.abort());
    await ctx.route('https://api.github.com/**', r => gh.handle(r));
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); return p;
  }
  // 1. versleutelen
  const A = await dev(); await A.goto(BASE + 'vault.html'); await A.waitForTimeout(400);
  const fill = async (pin, pin2) => { await A.fill('#repo', REPO); await A.fill('#token', TOKEN); await A.fill('#pin', pin); await A.fill('#pin2', pin2); };
  await fill('12345', '12345'); await A.click('#go'); await A.waitForTimeout(200);
  ok((await A.textContent('#msg')).includes('te kort') && await A.locator('#result').isHidden(), 'te korte pincode wordt geweigerd');
  await fill(PIN, '111111'); await A.click('#go'); await A.waitForTimeout(200);
  ok((await A.textContent('#msg')).includes('niet gelijk'), 'twee verschillende pincodes worden geweigerd');
  await fill(PIN, PIN); await A.click('#go'); await A.waitForSelector('#result:not([hidden])', { timeout: 20000 });
  const out = await A.inputValue('#out'); const j = JSON.parse(out);
  ok(j.v === 1 && j.iter >= 1000000 && j.n === 1 && !out.includes(TOKEN) && !out.includes(PIN) && !out.includes(REPO), 'versleutelde tekst bevat geen token, pincode of reponaam (iter ' + j.iter + ')');
  ok(await A.inputValue('#token') === '' && await A.inputValue('#pin') === '', 'token en pincode worden na het versleutelen uit het scherm gehaald');
  // 2. geen vault.json: geen pinveld
  const N = await dev(); await N.goto(BASE + 'start.html'); await N.waitForTimeout(600);
  ok(await N.locator('#gh-pin').isHidden() && await N.locator('#gh-repo').isVisible(), 'zonder vault.json blijft het tokenformulier staan en is er geen pinveld');
  // 3. met vault.json: koppelen met de pincode
  vault = out;
  const B = await dev(); await B.goto(BASE + 'start.html'); await B.waitForTimeout(700);
  ok(await B.locator('#gh-pin').isVisible() && (await B.getAttribute('#gh-pinval', 'inputmode')) === 'numeric', 'met vault.json verschijnt een pinveld met cijfertoetsenbord');
  await B.fill('#gh-pinval', '000000'); await B.click('#gh-pingo'); await B.waitForTimeout(4000);
  ok((await B.textContent('#gh-msg')).includes('Pincode klopt niet') && await B.evaluate(() => localStorage.getItem('gh-sync-config') === null), 'verkeerde pincode: melding en niet gekoppeld');
  await B.fill('#gh-pinval', PIN); await B.click('#gh-pingo'); await B.waitForTimeout(5000);
  const cfg = await B.evaluate(() => JSON.parse(localStorage.getItem('gh-sync-config') || 'null'));
  ok(cfg && cfg.repo === REPO && cfg.token === TOKEN, 'juiste pincode: gekoppeld met de juiste repo en token');
  await B.goto(BASE + 'route.html'); await B.waitForTimeout(800); await B.click('#gear'); await B.waitForTimeout(300);
  ok((await B.textContent('#gh-status')).includes('Verbonden met ' + REPO), 'Route knijperwagen is daarna meteen verbonden');
  ok(A.errs.length + N.errs.length + B.errs.length === 0, 'geen scriptfouten ' + A.errs.concat(N.errs, B.errs).join('|'));
  await b.close(); server.close();
})();
