// Behoud van bestaande gegevens: projecten, routes, logboek en foto's blijven ongewijzigd na het openen van elke pagina en na opnieuw laden.
// Oude formaten (zonder nieuwere velden) blijven geldig. Alleen kijken verandert niets.
const { chromium, launchOptions, ok, ROOT, LEAFLET_JS, LEAFLET_CSS, autoOpen } = require('./helpers.js');
const { devices } = require('playwright');
const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); const dd = new Date(); const YD = iso(new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() - 1, 12)); const OLD = iso(new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() - 40, 12));
const SEED = {
  'gww.projects': [{ v: 1, id: 'p1', nr: 'IB1', name: 'Eerste', who: 'Piet', phone: '0612345678', note: 'n', lat: 52.09, lon: 5.12, addr: 'Domplein 1', created: 1000, modified: 2000 }, { v: 1, id: 'imp-abc-12', nr: '', name: 'Alleen naam', created: 1000, modified: 1500 }],
  'locdelen.projects': [{ nr: 'IB1', name: 'Eerste', addr: 'Domplein 1', note: '', via: '', arrive: '', plabel: '', lat: 52.09, lon: 5.12, ts: 1700000000000 }, { nr: 'IB2', name: 'Oud project zonder extra velden', lat: 51.9, lon: 4.4, ts: 1600000000000 }],
  'gww.log': [{ v: 1, id: 'l-old', projectId: 'p1', date: OLD, work: 'Oud formaat', equipment: ['Dumper', 'Kraan'], created: 1, modified: 1 },
    { v: 1, id: 'l1', projectId: 'p1', date: YD, work: 'Sleuf', other: 'x', equipment: ['G'], crew: [{ partner: 'B', count: 3, hours: 8 }], machines: [{ item: 'G', partner: 'V', hours: 7 }], stagnation: [{ cause: 'Weer', hours: 2, note: 'r' }], deliveries: [{ what: 'Zand', qty: '24 ton', bon: '1' }], extra: { on: true, who: 'J', how: 'Mondeling', note: 'e' }, safety: { toolbox: true, lmra: false, incident: false, note: '' }, weather: { temp: 9, desc: 'Regen', wind: 14, rain: 1, src: 'auto' }, created: 5, modified: 6 }],
  'knijperwagen-route-v2': { datum: '2099-01-02', note: 'Let op', stops: [{ acties: ['LADEN'], voorz: 'bij', plaats: 'R3S', project: 'IB1', tijdv: 'om', tijd: '6.00', items: '1 bigbag', link: 'https://maps.app.goo.gl/x' }, { acties: ['LOSSEN', 'LADEN'], plaats: 'HOF', items: 'Zand' }, { actie: 'GEMENGD', plaats: 'Oud formaat' }] },
  'knijperwagen-routes-v2': { '2026-11-20': { datum: '2026-11-20', note: '', stops: [{ acties: ['OPHALEN'], plaats: 'Berkel', items: 'x' }] } },
  'knijperwagen-mem-v2': { places: { r3s: { p: 'R3S', t: 1700000000000, pr: 'IB1', nx: { hof: 2 } } }, items: [{ t: 'zand', p: '', ts: 1700000000000 }], cnt: {} },
  'locdelen.who': 'Piet Uitvoerder', 'locdelen.phone': '0612345678', 'gww.tombstones': { 'projects/oud': 1700000000000 },
};
const keys = Object.keys(SEED);
(async () => {
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext(devices['iPhone 13']);
  await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
  await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
  await ctx.addInitScript(([seed]) => { if (localStorage.getItem('__s')) return; localStorage.setItem('__s', '1'); localStorage.setItem('knijperwagen-tipX', '1'); localStorage.setItem('start.tipX', '1');
    Object.keys(seed).forEach(k => localStorage.setItem(k, typeof seed[k] === 'string' ? seed[k] : JSON.stringify(seed[k]))); }, [SEED]);
  const p = autoOpen(await ctx.newPage()); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  const snap = () => p.evaluate((keys) => { const o = {}; keys.forEach(k => { o[k] = localStorage.getItem(k); }); return o; }, keys);
  await p.goto(ROOT + 'start.html'); await p.waitForTimeout(400);
  const before = await snap();
  // alleen kijken: elke pagina en toestand openen zonder iets te wijzigen
  const looks = [['start.html', null], ['index.html', null], ['index.html#project=' + encodeURIComponent('ib1|eerste'), null], ['route.html', null], ['route.html', async () => { await p.click('#hist-open'); await p.waitForTimeout(300); }],
    ['route.html', async () => { await p.evaluate(() => document.querySelector('#stops .stop .hd').click()); }], ['projecten.html', null], ['projecten.html', async () => { await p.click('.row[data-id="p1"]'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); }],
    ['logboek.html', null], ['logboek.html#/p/p1', null], ['logboek.html#/p/p1/' + YD, null], ['logboek.html#/p/p1/' + OLD, null], ['logboek.html#/p/p1', async () => { await p.click('#weekBtn'); await p.waitForTimeout(300); }], ['vault.html', null]];
  for (const [f, fn] of looks) { await p.goto(ROOT + f); await p.waitForTimeout(450); if (fn) await fn(); await p.waitForTimeout(250); }
  await p.goto(ROOT + 'start.html'); await p.waitForTimeout(300);
  const after = await snap();
  const changed = keys.filter(k => before[k] !== after[k]);
  ok(changed.length === 0 && p.errs.length === 0, `alleen kijken (${looks.length} pagina's en toestanden): ${keys.length} opslagsleutels blijven byte voor byte gelijk (${changed.join(', ') || 'geen wijziging'}) ${p.errs.join('|')}`);
  // oude formaten worden gewoon getoond
  await p.goto(ROOT + 'logboek.html#/p/p1/' + OLD); await p.waitForTimeout(500);
  ok(await p.inputValue('#work') === 'Oud formaat' && await p.locator('#list-machines .rowitem', { hasText: 'Kraan' }).count() === 1, 'oud logboekformaat (alleen materieelnamen): wordt getoond');
  await p.goto(ROOT + 'route.html'); await p.waitForTimeout(500);
  ok(await p.locator('#stops .stop').count() === 3 && /Oud formaat/.test(await p.textContent('#stops .stop >> nth=2')) && /Laden/.test(await p.textContent('#stops .stop >> nth=1')) && /Lossen/.test(await p.textContent('#stops .stop >> nth=1')), 'oude route (actie GEMENGD) en twee acties in één stop: worden juist getoond');
  await p.goto(ROOT + 'index.html'); await p.waitForTimeout(500);
  ok((await p.locator('#plist .proj').count()) === 2 && /Oud project zonder extra velden/.test(await p.textContent('#plist')), 'projectenlijst van Locatie delen: ook het project zonder extra velden staat erin');
  // foto's: bewaard in IndexedDB, blijven na opnieuw laden en na wisselen van dag
  await p.goto(ROOT + 'logboek.html#/p/p1/' + YD); await p.waitForTimeout(500);
  const b64 = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d'); g.fillStyle = 'rgb(180,200,80)'; g.fillRect(0, 0, 800, 600); return c.toDataURL('image/jpeg', 0.9).split(',')[1]; });
  await p.setInputFiles('#shot', { name: 'f.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b64, 'base64') });
  await p.waitForSelector('#thumbs button', { timeout: 15000, state: 'attached' }); await p.waitForTimeout(300);
  const logAfterPhoto = await p.evaluate(() => JSON.parse(localStorage.getItem('gww.log')).find(x => x.id === 'l1'));
  ok(logAfterPhoto.work === 'Sleuf' && logAfterPhoto.crew.length === 1 && logAfterPhoto.safety.toolbox === true, 'foto toevoegen laat de rest van de dag ongemoeid');
  await p.reload(); await p.waitForTimeout(700);
  ok(await p.locator('#thumbs button').count() === 1, 'foto blijft na opnieuw laden');
  await p.goto(ROOT + 'logboek.html#/p/p1/' + OLD); await p.waitForTimeout(400); await p.goto(ROOT + 'logboek.html#/p/p1/' + YD); await p.waitForTimeout(500);
  ok(await p.locator('#thumbs button').count() === 1 && await p.textContent('#sum-photos') === '1 foto', 'foto blijft na wisselen van dag en terug');
  await p.goto(ROOT + 'logboek.html#/p/p1'); await p.waitForTimeout(400);
  ok(/1 foto/.test(await p.textContent('#dlist .day >> nth=0')), 'de dagenlijst toont de foto');
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
