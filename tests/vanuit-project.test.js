// Werken vanuit Projecten: een project openen in Locatie delen of Route knijperwagen.
const { chromium, launchOptions, ok, ROOT, LEAFLET_JS, LEAFLET_CSS } = require('./helpers.js');
(async () => {
  const b = await chromium.launch(launchOptions());
  const mk = async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
    await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
    await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
    await ctx.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1');
      localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB888', name: 'Vanuit project', who: 'Piet Uitvoerder', phone: '0612345678', note: 'Inrit via de poort', created: 1, modified: 2 }]));
      localStorage.setItem('locdelen.who', 'Mijn Eigen Naam'); localStorage.setItem('locdelen.phone', '0600000000'); } });
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); return p;
  };
  // Projecten: dialoog met gegevens en knoppen naar de tools
  let p = await mk(); await p.goto(ROOT + 'projecten.html'); await p.waitForTimeout(400);
  await p.click('.row[data-id="p1"]'); await p.waitForTimeout(200);
  const d = await p.evaluate(() => ({ who: document.getElementById('ewho').value, phone: document.getElementById('ephone').value, note: document.getElementById('enote').value,
    loc: document.getElementById('goLoc').getAttribute('href'), route: document.getElementById('goRoute').getAttribute('href') }));
  ok(d.who === 'Piet Uitvoerder' && d.phone === '0612345678' && d.note === 'Inrit via de poort', 'Projecten: uitvoerder, telefoon en notitie staan in het project');
  ok(d.loc === 'index.html#gp=p1' && d.route === 'route.html#gp=p1', 'Projecten: knoppen openen de tools met dit project (' + d.loc + ', ' + d.route + ')');
  await p.fill('#ewho', 'Kees'); await p.click('#esave'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => { const l = JSON.parse(localStorage.getItem('gww.projects'))[0]; return l.id === 'p1' && l.who === 'Kees'; }), 'Projecten: bewerken bewaart de gegevens, het id blijft gelijk');
  // Locatie delen: project ingevuld, eigen gegevens in het tandwiel blijven bewaard
  p = await mk(); await p.goto(ROOT + 'index.html#gp=p1'); await p.waitForTimeout(700);
  const v = await p.evaluate(() => ({ nr: document.getElementById('nr').value, name: document.getElementById('name').value, note: document.getElementById('note').value,
    who: document.getElementById('myName').value, lsWho: localStorage.getItem('locdelen.who'), lsPhone: localStorage.getItem('locdelen.phone'), hash: location.hash }));
  ok(v.nr === 'IB888' && v.name === 'Vanuit project' && v.note === 'Inrit via de poort', 'Locatie delen: opent met nummer, naam en notitie van het project');
  ok(v.who === 'Piet Uitvoerder' && v.lsWho === 'Mijn Eigen Naam' && v.lsPhone === '0600000000', 'Locatie delen: uitvoerder staat in het veld, maar je eigen bewaarde gegevens zijn niet overschreven');
  ok(v.hash === '' && p.errs.length === 0, 'Locatie delen: geen scriptfouten ' + p.errs.join('|'));
  // Route: project staat bovenaan de voorstellen
  p = await mk(); await p.goto(ROOT + 'route.html#gp=p1'); await p.waitForTimeout(600);
  await p.fill('#s1-plaats', 'Ergens'); await p.evaluate(() => document.querySelector('#s1-project').focus()); await p.waitForTimeout(300);
  const chips = await p.evaluate(() => [...document.querySelectorAll('.stop.open .sugg:not([hidden]) .chip')].map(c => c.textContent));
  ok(chips[0] && chips[0].startsWith('IB888'), 'Route: het gekozen project staat bovenaan de voorstellen (' + chips.join(' | ') + ')');
  ok(p.errs.length === 0, 'Route: geen scriptfouten ' + p.errs.join('|'));
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
