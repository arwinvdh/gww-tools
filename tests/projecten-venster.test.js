// Projecten: scanbare lijst, projectvenster (telefoon schermvullend, daarboven een venster), bewerken, annuleren,
// terug uit een tool, toetsenbord en het project dat zichtbaar blijft in Route.
const { chromium, launchOptions, ok, ROOT, LEAFLET_JS, LEAFLET_CSS } = require('./helpers.js');
const { devices } = require('playwright');
const PROJ = [
  { v: 1, id: 'p1', nr: 'IB888', name: 'Reconstructie Zuidpoort', who: 'Piet', phone: '0612345678', note: 'Inrit via de poort', lat: 52.0907, lon: 5.1214, addr: 'Domplein 1, Utrecht', created: 1, modified: 3 },
  { v: 1, id: 'p2', nr: 'IB999', name: 'HOF Berkel', created: 1, modified: 2 }];
(async () => {
  const b = await chromium.launch(launchOptions());
  const mk = async (dev, projects) => {
    const ctx = await b.newContext(dev);
    await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
    await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
    await ctx.addInitScript((pr) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (pr) localStorage.setItem('gww.projects', JSON.stringify(pr)); else localStorage.setItem('gww.projects', '[]'); } }, projects);
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    return p;
  };
  const read = p => p.evaluate(() => JSON.parse(localStorage.getItem('gww.projects')));

  // --- lijst ---
  let p = await mk(devices['iPhone 13'], PROJ); await p.goto(ROOT + 'projecten.html'); await p.waitForTimeout(500);
  const l = await p.evaluate(() => ({ rows: [...document.querySelectorAll('#list .row')].map(r => r.innerText.replace(/\s+/g, ' ').trim()),
    listTop: document.getElementById('list').getBoundingClientRect().top, addTop: document.querySelector('.addcard').getBoundingClientRect().top }));
  ok(l.rows[0] === 'IB888 · Reconstructie Zuidpoort Domplein 1, Utrecht' && l.rows[1] === 'IB999 · HOF Berkel Geen locatie', 'lijst: nummer, naam en locatie (of Geen locatie) per project (' + l.rows.join(' | ') + ')');
  ok(l.listTop < l.addTop, 'lijst: met projecten staat de lijst boven het formulier Nieuw project');
  const pe = await mk(devices['iPhone 13'], null); await pe.goto(ROOT + 'projecten.html'); await pe.waitForTimeout(400);
  ok(await pe.evaluate(() => document.querySelector('.addcard').getBoundingClientRect().top < document.getElementById('empty').getBoundingClientRect().top + 400 && !document.getElementById('empty').hidden), 'lijst: zonder projecten staat de lege toestand met het formulier');
  await pe.context().close();

  // --- telefoon: schermvullend venster met kop, secties en vaste voet ---
  await p.click('.row[data-id="p1"]'); await p.waitForTimeout(400);
  const d = await p.evaluate(() => {
    const dl = document.getElementById('dlg').getBoundingClientRect(), f = document.querySelector('.dfoot').getBoundingClientRect();
    const open = document.getElementById('h-open').getBoundingClientRect().top, data = document.getElementById('h-data').getBoundingClientRect().top;
    const del = document.getElementById('edel'), foot = document.querySelector('.dfoot');
    return { w: Math.round(dl.width), h: Math.round(dl.height), vw: innerWidth, vh: innerHeight, footBottom: Math.round(f.bottom), openFirst: open < data,
      delInFoot: foot.contains(del), title: document.getElementById('etitle').textContent, sub: document.getElementById('esub').textContent, hash: location.hash,
      tiles: [...document.querySelectorAll('.launch a')].map(a => a.getAttribute('href') + ' ' + Math.round(a.getBoundingClientRect().height)).join(),
      cancel: document.getElementById('ecancel').textContent, saveP: document.getElementById('esave').classList.contains('primary'), sw: document.scrollingElement.scrollWidth <= document.documentElement.clientWidth };
  });
  ok(d.w === d.vw && d.h === d.vh && d.footBottom <= d.vh, `telefoon: projectvenster vult het scherm en de voet blijft zichtbaar (${d.w}x${d.h} van ${d.vw}x${d.vh})`);
  ok(d.title === 'IB888 · Reconstructie Zuidpoort' && d.sub === 'Domplein 1, Utrecht', 'venster: kop toont het actieve project met locatie (' + d.title + ' / ' + d.sub + ')');
  ok(d.openFirst && /index\.html#gp=p1 \d+,route\.html#gp=p1 \d+,logboek\.html#gp=p1 \d+/.test(d.tiles), 'venster: eerst Openen met dit project, daarna Projectgegevens (' + d.tiles + ')');
  ok(d.tiles.split(',').every(t => +t.split(' ')[1] >= 44), 'venster: tegels om een tool te openen minstens 44px hoog');
  ok(!d.delInFoot && d.saveP && d.cancel === 'Sluiten', 'venster: Verwijderen staat apart onder de gegevens, Opslaan is primair, Sluiten secundair');
  ok(d.hash === '#p=p1' && d.sw, 'venster: adres bevat #p=id, geen zijwaartse scroll');

  // annuleren: gewijzigd formulier toont Annuleren en bewaart niets
  await p.fill('#ename', 'Tijdelijk'); await p.waitForTimeout(100);
  ok(await p.textContent('#ecancel') === 'Annuleren', 'bewerken: na een wijziging heet de knop Annuleren');
  await p.click('#ecancel'); await p.waitForTimeout(200);
  let st = await read(p);
  ok(st.find(x => x.id === 'p1').name === 'Reconstructie Zuidpoort' && !(await p.evaluate(() => document.getElementById('dlg').open)) && await p.evaluate(() => location.hash) === '', 'annuleren: niets bewaard, venster dicht, adres opgeschoond');
  // opslaan
  await p.click('.row[data-id="p1"]'); await p.fill('#ename', 'Nieuwe naam'); await p.fill('#ewho', 'Kees'); await p.click('#esave'); await p.waitForTimeout(200);
  st = await read(p); const e = st.find(x => x.id === 'p1');
  ok(e.name === 'Nieuwe naam' && e.who === 'Kees' && e.nr === 'IB888' && e.lat === 52.0907 && /Nieuwe naam/.test(await p.textContent('#list')), 'opslaan: gegevens bewaard, id en locatie ongewijzigd, lijst bijgewerkt');
  // leeg opslaan: melding, venster blijft open
  await p.click('.row[data-id="p2"]'); await p.fill('#enr', ''); await p.fill('#ename', ''); await p.click('#esave'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('dlg').open && !document.getElementById('emsg').hidden) && /nummer of een naam/.test(await p.textContent('#emsg')), 'opslaan zonder nummer en naam: melding en venster blijft open');
  await p.click('#ecancel'); await p.waitForTimeout(150);
  // verwijderen: twee tikken, valt vanzelf terug
  await p.click('.row[data-id="p2"]'); await p.click('#edel'); await p.waitForTimeout(100);
  ok(/Zeker weten/.test(await p.textContent('#edel')) && (await read(p)).length === 2, 'verwijderen: eerste tik vraagt bevestiging, niets is weg');
  await p.waitForTimeout(4400);
  ok(await p.textContent('#edel') === 'Verwijderen', 'verwijderen: zonder tweede tik valt de knop na 4 seconden terug');
  await p.click('#edel'); await p.click('#edel'); await p.waitForTimeout(200);
  ok((await read(p)).length === 1, 'verwijderen: twee tikken verwijderen het project');

  // --- terug uit een tool opent het projectvenster weer ---
  await p.click('.row[data-id="p1"]'); await p.waitForTimeout(200);
  await p.click('#goRoute'); await p.waitForTimeout(800);
  const ctxText = await p.evaluate(() => { const c = document.getElementById('ctxProject'); return c && !c.hidden ? c.textContent : ''; });
  ok(/^Project: IB888 · /.test(ctxText), 'Route: het actieve project blijft zichtbaar boven de route (' + ctxText + ')');
  await p.click('.brand .back'); await p.waitForTimeout(800);
  ok(/projecten\.html/.test(p.url()) && await p.evaluate(() => document.getElementById('dlg').open && document.getElementById('etitle').textContent.startsWith('IB888')), 'terug uit een tool: Projecten opent het project weer');
  await p.reload(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('dlg').open), 'adres #p=id opent het projectvenster direct');
  const bad = await mk(devices['iPhone 13'], PROJ); await bad.goto(ROOT + 'projecten.html#p=bestaatniet'); await bad.waitForTimeout(400);
  ok(await bad.evaluate(() => !document.getElementById('dlg').open && location.hash === ''), 'onbekend project in het adres: geen venster en geen fout');
  await bad.context().close();

  // --- toetsenbord: verkleind scherm (Android) houdt de voet in beeld en het veld bereikbaar ---
  const k = await mk({ ...devices['iPhone 13'] }, PROJ); await k.goto(ROOT + 'projecten.html'); await k.waitForTimeout(400);
  await k.click('.row[data-id="p1"]'); await k.setViewportSize({ width: 390, height: 380 }); await k.waitForTimeout(300);
  await k.focus('#enote'); await k.waitForTimeout(600);
  const kb = await k.evaluate(() => { const f = document.querySelector('.dfoot').getBoundingClientRect(), n = document.getElementById('enote').getBoundingClientRect(), dl = document.getElementById('dlg').getBoundingClientRect();
    return { footBottom: Math.round(f.bottom), vh: innerHeight, fieldAbove: n.bottom <= f.top + 1 && n.top >= 0, dlH: Math.round(dl.height) }; });
  ok(kb.footBottom <= kb.vh && kb.dlH <= kb.vh && kb.fieldAbove, `toetsenbord: voet in beeld en het veld ligt erboven (${JSON.stringify(kb)})`);
  await k.context().close();

  // --- tablet en desktop: gewoon venster, niet schermvullend ---
  for (const [name, vp] of [['tablet 768', { width: 768, height: 900 }], ['desktop 1440', { width: 1440, height: 900 }], ['laag 1024x600', { width: 1024, height: 600 }]]) {
    const q = await mk({ viewport: vp }, PROJ); await q.goto(ROOT + 'projecten.html'); await q.waitForTimeout(400);
    await q.click('.row[data-id="p1"]'); await q.waitForTimeout(300);
    const r = await q.evaluate(() => { const dl = document.getElementById('dlg').getBoundingClientRect(), f = document.querySelector('.dfoot').getBoundingClientRect(), body = document.getElementById('ebody');
      return { w: Math.round(dl.width), top: Math.round(dl.top), bottom: Math.round(dl.bottom), vh: innerHeight, footIn: f.bottom <= innerHeight, scroll: body.scrollHeight > body.clientHeight, centered: Math.abs((dl.left + dl.right) / 2 - innerWidth / 2) < 2 }; });
    ok(r.w <= 545 && r.centered && r.top >= 0 && r.bottom <= r.vh && r.footIn, `${name}: venster hoogstens 34rem breed, gecentreerd en volledig in beeld (${r.w}px, ${r.top}-${r.bottom} van ${r.vh})`);
    await q.context().close();
  }
  ok(p.errs.length === 0, 'geen scriptfouten ' + p.errs.join('|'));
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
