// Project kiezen uit de gedeelde lijst (tegel Projecten) in Locatie delen en Route knijperwagen.
const { chromium, launchOptions, ok, ROOT, LEAFLET_JS, LEAFLET_CSS } = require('./helpers.js');
(async () => {
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
  await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
  const LIST = [{ v: 1, id: 'a1', nr: 'IB777', name: 'Gedeeld project', created: 1, modified: 2 }];
  await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('gww.projects', JSON.stringify(l)); } }, LIST);

  // Locatie delen: kiezen vult nummer en naam in en bewaart verder niets extra
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(ROOT + 'index.html'); await p.waitForTimeout(600);
  ok(await p.locator('#pickBox').isVisible(), 'Locatie delen: "Project kiezen" staat er zodra er projecten zijn');
  await p.selectOption('#pick', 'a1'); await p.waitForTimeout(200);
  const v = await p.evaluate(() => ({ nr: document.getElementById('nr').value, name: document.getElementById('name').value, pick: document.getElementById('pick').value, keys: Object.keys(localStorage).sort().join() }));
  ok(v.nr === 'IB777' && v.name === 'Gedeeld project' && v.pick === '', 'Locatie delen: kiezen vult projectnummer en naam in (' + v.nr + ' / ' + v.name + ')');
  ok(!/gww\.projects.*gww\./.test(v.keys) && p.errs.length === 0, 'Locatie delen: geen scriptfouten ' + p.errs.join('|'));
  const empty = await b.newContext({ viewport: { width: 390, height: 800 } }); await empty.route(u => !u.href.startsWith('file:'), r => r.abort());
  await empty.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
  const pe = await empty.newPage(); await pe.goto(ROOT + 'index.html'); await pe.waitForTimeout(500);
  ok(await pe.locator('#pickBox').isHidden(), 'Locatie delen: zonder projecten blijft de keuze verborgen');

  // Route: het gedeelde project staat tussen de projectvoorstellen
  const r = await ctx.newPage(); r.errs = []; r.on('pageerror', e => r.errs.push(e.message));
  await r.goto(ROOT + 'route.html'); await r.waitForTimeout(600);
  await r.fill('#s1-plaats', 'Ergens'); await r.evaluate(() => document.querySelector('#s1-project').focus()); await r.waitForTimeout(300);
  const chips = await r.evaluate(() => [...document.querySelectorAll('.stop.open .sugg:not([hidden]) .chip')].map(c => c.textContent));
  ok(chips.some(t => t.startsWith('IB777')), 'Route: het gedeelde project staat bij de projectvoorstellen (' + chips.join(' | ') + ')');
  ok(r.errs.length === 0, 'Route: geen scriptfouten ' + r.errs.join('|'));
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
