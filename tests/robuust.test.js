// Robuustheid: kapotte of vreemde opslag, opslag die niet werkt, en ongeldige adressen (deep links). Nooit een foutmelding of lege pagina.
const { chromium, launchOptions, ok, ROOT, LEAFLET_JS, LEAFLET_CSS } = require('./helpers.js');
const { devices } = require('playwright');
const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); const dd = new Date(); const YD = iso(new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() - 1, 12));
const VALID = { 'gww.projects': [{ v: 1, id: 'p1', nr: 'IB1', name: 'Eerste', lat: 52.09, lon: 5.12, addr: 'x', created: 1, modified: 2 }], 'locdelen.projects': [{ nr: 'IB1', name: 'Eerste', lat: 52.09, lon: 5.12 }],
  'gww.log': [{ v: 1, id: 'l1', projectId: 'p1', date: YD, work: 'x', equipment: ['Dumper'], crew: [{ partner: 'B', count: 3, hours: 8 }], machines: [{ item: 'G', partner: '', hours: 7 }], stagnation: [{ cause: 'Weer', hours: 2 }], extra: { on: false }, safety: {}, created: 5, modified: 6 }],
  'knijperwagen-route-v2': { datum: '2099-01-02', note: 'n', stops: [{ acties: ['LADEN'], plaats: 'R3S', items: 'x' }] }, 'knijperwagen-routes-v2': { '2026-11-20': { datum: '2026-11-20', stops: [{ plaats: 'A' }] } },
  'knijperwagen-mem-v2': { places: { r3s: { p: 'R3S', t: 1 } }, items: [{ t: 'zand', p: '', ts: 1 }], cnt: {} }, 'locdelen.draft': { lat: 52.09, lon: 5.12, nr: 'IB1' } };
const BAD = { garbage: '{{{x', nul: 'null', num: '42', str: '"tekst"', obj: '{"a":1}', arr: '[1,"x",null,{"nr":5}]', nulls: '[null,null]', deep: '{"stops":"nee","datum":5,"note":{}}', stops: '{"stops":[null,5,"x",{"acties":"LADEN","plaats":7,"items":[1,2]}]}', places: '{"places":[],"items":"x"}', badlog: '[{"projectId":"p1","date":"nietdatum","crew":"x","machines":5,"stagnation":{},"extra":"x","safety":7,"weather":"x"}]' };
const PAGES = ['start.html', 'index.html', 'route.html', 'projecten.html', 'logboek.html', 'logboek.html#/p/p1', 'logboek.html#/p/p1/' + YD];
(async () => {
  const b = await chromium.launch(launchOptions());
  const mk = async (init, arg) => {
    const ctx = await b.newContext(devices['iPhone 13']);
    await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
    await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
    await ctx.addInitScript(init, arg);
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    return p;
  };
  const rejInit = () => { window.__rej = []; window.addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason && e.reason.message || e.reason))); localStorage.setItem('knijperwagen-tipX', '1'); };

  // --- 1. elke opslagsleutel kapot of vreemd, terwijl de rest in orde is ---
  const found = [];
  for (const key of Object.keys(VALID)) for (const [bn, bv] of Object.entries(BAD)) {
    const p = await mk(([valid, key, bv]) => { Object.keys(valid).forEach(k => localStorage.setItem(k, JSON.stringify(valid[k]))); localStorage.setItem(key, bv); window.__rej = []; window.addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason && e.reason.message || e.reason))); localStorage.setItem('knijperwagen-tipX', '1'); }, [VALID, key, bv]);
    for (const f of PAGES) {
      p.errs.length = 0; await p.goto(ROOT + f); await p.waitForTimeout(250);
      const rej = await p.evaluate(() => window.__rej || []);
      if (p.errs.length || rej.length) found.push(key + '=' + bn + ' @ ' + f + ': ' + [...p.errs, ...rej].join(' | ').slice(0, 80));
    }
    await p.context().close();
  }
  ok(found.length === 0, `kapotte opslag: ${Object.keys(VALID).length} sleutels x ${Object.keys(BAD).length} varianten op ${PAGES.length} pagina's zonder fouten (${found.slice(0, 4).join(' || ') || 'geen'})`);

  // --- 2. alle opslag weg of ongeldig: pagina's starten leeg en bruikbaar ---
  let p = await mk(rejInit);
  const empty = [];
  for (const f of [...PAGES, 'vault.html', 'visie.html']) { p.errs.length = 0; await p.goto(ROOT + f); await p.waitForTimeout(250); if (p.errs.length || !(await p.evaluate(() => document.body.innerText.length > 20))) empty.push(f); }
  ok(empty.length === 0, 'lege opslag: alle pagina\'s starten zonder fouten en met inhoud (' + (empty.join(', ') || 'geen afwijkingen') + ')');
  await p.context().close();

  // --- 3. opslag die niet werkt (privémodus of vol): geen crash, wel een melding ---
  const broken = () => { Storage.prototype.setItem = function () { throw new DOMException('vol', 'QuotaExceededError'); }; window.__rej = []; window.addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason && e.reason.message || e.reason))); };
  p = await mk(broken);
  const bad3 = [];
  for (const f of ['start.html', 'index.html', 'route.html', 'projecten.html', 'logboek.html']) { p.errs.length = 0; await p.goto(ROOT + f); await p.waitForTimeout(300); if (p.errs.length) bad3.push(f + ' ' + p.errs[0]); }
  ok(bad3.length === 0, 'opslag vol: pagina\'s laden zonder fouten (' + (bad3.join(', ') || 'geen') + ')');
  await p.goto(ROOT + 'route.html'); await p.fill('#s1-plaats', 'Ergens'); await p.waitForTimeout(500);
  ok(await p.locator('#storeWarn').isVisible() && p.errs.length === 0, 'opslag vol: Route toont een blijvende melding dat bewaren niet lukt en blijft werken');
  await p.goto(ROOT + 'index.html'); await p.fill('#q', '52.0907, 5.1214'); await p.click('#go'); await p.waitForTimeout(500); await p.fill('#nr', 'IB1'); await p.waitForTimeout(400);
  ok(await p.locator('#storeWarn').isVisible() && /52\.0907/.test(await p.evaluate(() => document.getElementById('preview').innerText)) && p.errs.length === 0, 'opslag vol: Locatie delen zegt het en het bericht blijft bruikbaar');
  await p.goto(ROOT + 'projecten.html'); await p.fill('#nr', 'IB2'); await p.click('#add'); await p.waitForTimeout(300);
  ok(/Opslaan lukt niet/.test(await p.textContent('#addmsg')) && await p.inputValue('#nr') === 'IB2', 'opslag vol: Projecten zegt dat opslaan niet lukt en wist het formulier niet');
  await p.goto(ROOT + 'logboek.html#/p/p1'); await p.waitForTimeout(300); await p.context().close();
  // lezen mislukt (opslag geblokkeerd): ook dan geen crash
  p = await mk(() => { Storage.prototype.getItem = function () { throw new DOMException('geblokkeerd', 'SecurityError'); }; Storage.prototype.setItem = function () { throw new DOMException('geblokkeerd', 'SecurityError'); }; });
  const bad4 = [];
  for (const f of ['start.html', 'index.html', 'route.html', 'projecten.html', 'logboek.html', 'vault.html']) { p.errs.length = 0; await p.goto(ROOT + f); await p.waitForTimeout(300); if (p.errs.length) bad4.push(f + ' ' + p.errs[0].slice(0, 60)); }
  ok(bad4.length === 0, 'opslag geblokkeerd (lezen en schrijven): pagina\'s laden zonder fouten (' + (bad4.join(', ') || 'geen') + ')');
  await p.context().close();

  // --- 4. ongeldige adressen en deep links ---
  p = await mk(([valid]) => { Object.keys(valid).forEach(k => localStorage.setItem(k, JSON.stringify(valid[k]))); window.__rej = []; window.addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason && e.reason.message || e.reason))); localStorage.setItem('knijperwagen-tipX', '1'); }, [VALID]);
  const links = ['index.html#gp=bestaatniet', 'index.html#gp=', 'index.html#project=%E0%A4%A', 'index.html?lat=abc&lon=def', 'index.html?lat=999&lon=999', 'index.html?lat=52.1&lon=5.1&n=%E0%A4%A',
    'route.html#gp=bestaatniet', 'route.html#route=2026-99-99', 'route.html#route=nietdatum', 'route.html#gp=%E0%A4%A', 'projecten.html#p=bestaatniet', 'projecten.html#p=%E0%A4%A', 'projecten.html#p=',
    'logboek.html#/p/bestaatniet', 'logboek.html#/p/p1/2026-13-45', 'logboek.html#/p/p1/niets', 'logboek.html#/x/y/z', 'logboek.html#gp=bestaatniet', 'logboek.html#/p/%E0%A4%A', 'start.html#iets'];
  const bad5 = [];
  for (const l of links) { p.errs.length = 0; await p.goto(ROOT + l).catch(() => {}); await p.waitForTimeout(350); const rej = await p.evaluate(() => window.__rej || []).catch(() => []); if (p.errs.length || rej.length) bad5.push(l + ' ' + [...p.errs, ...rej][0].slice(0, 60)); }
  ok(bad5.length === 0, `${links.length} ongeldige adressen: geen fouten (${bad5.join(' || ') || 'geen'})`);
  await p.goto(ROOT + 'logboek.html#/p/p1/2026-13-45'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.body.innerText.length > 20), 'ongeldige datum in het logboek-adres: pagina blijft bruikbaar');
  await p.context().close();
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
