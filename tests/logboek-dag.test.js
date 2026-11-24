// Logboek, dagregistratie: aantal en uren in de regel, overzicht per sectie, bewaarstatus, overnemen van de vorige dag,
// half ingevulde regels, dagnavigatie, dag- en weekoverzicht, lege/gedeeltelijke/uitgebreide dagen en bestaande registraties.
const { chromium, launchOptions, ok, ROOT, autoOpen } = require('./helpers.js');
(async () => {
  const b = await chromium.launch(launchOptions());
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const now = new Date(), TODAY = iso(now), YEST = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12)), OLD = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 20, 12));
  const mk = async (vp) => {
    const ctx = await b.newContext({ viewport: vp || { width: 390, height: 900 } });
    await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
    await ctx.addInitScript(([Y, O]) => { if (!localStorage.getItem('__s')) { localStorage.setItem('__s', '1');   /* in localStorage: sessionStorage ging na reload soms verloren en dan werd opnieuw gezaaid */
      localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB1', name: 'Eerste', created: 1, modified: 2 }]));
      localStorage.setItem('gww.log', JSON.stringify([
        { v: 1, id: 'l1', projectId: 'p1', date: Y, work: 'Gisteren sleuf gegraven', equipment: ['Graafmachine'], crew: [{ partner: 'Bouwpartner BV', count: 3, hours: 8 }], machines: [{ item: 'Graafmachine', partner: 'Verhuur NV', hours: 7.5 }], created: 5, modified: 5 },
        { v: 1, id: 'l0', projectId: 'p1', date: O, work: 'Oud formaat', equipment: ['Dumper'], created: 1, modified: 1 }])); } }, [YEST, OLD]);
    const p = autoOpen(await ctx.newPage()); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); return p;
  };
  const p = await mk();
  const log = () => p.evaluate(() => JSON.parse(localStorage.getItem('gww.log') || '[]'));
  const rec = async (d) => (await log()).find(x => x.date === d);
  const hash = () => p.evaluate(() => location.hash);
  const open = (n) => p.evaluate((x) => { document.getElementById('sec-' + x).open = true; }, n);
  const goDay = async (d) => { await p.evaluate((x) => { location.hash = '#/p/p1/' + x; }, d); await p.waitForTimeout(500); };

  // 1. bestaande registratie blijft intact, ook na heen en weer lopen zonder te wijzigen
  await p.goto(ROOT + 'logboek.html#/p/p1/' + YEST); await p.waitForTimeout(700);
  const before = JSON.stringify(await rec(YEST));
  ok(/Automatisch bewaard (om|op) /.test(await p.textContent('#state')), 'bewaarstatus: een bestaande dag toont wanneer hij laatst bewaard is (' + await p.textContent('#state') + ')');
  await p.click('#nextDay'); await p.waitForTimeout(400); await p.click('#prevDay'); await p.waitForTimeout(500);
  ok(JSON.stringify(await rec(YEST)) === before, 'bestaande registratie: heen en weer lopen zonder wijziging schrijft niets (modified blijft)');
  ok(await p.inputValue('#work') === 'Gisteren sleuf gegraven' && (await p.textContent('#daySum')).includes('3 pers · 24 manuren · 1 machine'), 'dagregel bovenaan: aantallen en manuren van de bestaande dag (' + await p.textContent('#daySum') + ')');
  // oud formaat (alleen materieelnamen)
  await goDay(OLD);
  ok(await p.locator('#list-machines .rowitem', { hasText: 'Dumper' }).count() === 1 && (await p.textContent('#daySum')).includes('1 machine'), 'oud formaat: materieelnaam wordt getoond en geteld');

  // 2. nieuwe, lege dag: niets bewaard, duidelijke status, vorige dag aangeboden
  await goDay(TODAY);
  ok(/Wordt automatisch bewaard/.test(await p.textContent('#state')) && !(await rec(TODAY)), 'lege dag: status zegt dat het vanzelf bewaard wordt, er wordt niets opgeslagen');
  ok(/Zelfde personeel en materieel als/.test(await p.textContent('#copyPrev')), 'lege dag: Zelfde als vorige dag wordt aangeboden');
  ok(/^‹ /.test(await p.textContent('#prevDay')) && await p.textContent('#nextDay') === 'Vandaag' && await p.isDisabled('#nextDay'), 'dagnavigatie: knoppen noemen de dag (' + await p.textContent('#prevDay') + ' / ' + await p.textContent('#nextDay') + ')');

  // 3. gedeeltelijk ingevuld: personeel zelf invoeren, daarna alleen het materieel overnemen
  await p.fill('#f-crew-partner', 'Eigen partner'); await p.fill('#f-crew-count', '2'); await p.fill('#f-crew-hours', '6'); await p.click('#add-crew'); await p.waitForTimeout(800);
  let r = await rec(TODAY);
  ok(r && r.crew.length === 1 && r.crew[0].count === 2 && r.crew[0].hours === 6 && /Automatisch bewaard om \d\d:\d\d/.test(await p.textContent('#state')), 'gedeeltelijk ingevuld: bewaard met tijdstip (' + await p.textContent('#state') + ')');
  ok(/^Zelfde materieel als/.test(await p.textContent('#copyPrev')), 'alleen materieel is leeg: de knop biedt alleen materieel aan (' + await p.textContent('#copyPrev') + ')');
  await p.click('#copyPrev'); await p.waitForTimeout(800);
  r = await rec(TODAY);
  ok(r.crew.length === 1 && r.crew[0].partner === 'Eigen partner' && r.machines.length === 1 && r.machines[0].item === 'Graafmachine' && !(await p.locator('#copyNote').isHidden()), 'overnemen: alleen het lege deel is overgenomen, eigen personeel blijft staan, melding om te controleren');
  await p.click('#undoCopy'); await p.waitForTimeout(800);
  r = await rec(TODAY);
  ok(r.machines.length === 0 && r.crew.length === 1 && await p.locator('#copyNote').isHidden(), 'ongedaan maken zet de overname terug');
  await p.click('#copyPrev'); await p.waitForTimeout(600);

  // 4. uren aanpassen in de regel zelf, zonder verwijderen; het veld houdt de cursor tijdens het typen
  const hrs = p.locator('#list-machines .pill input');
  await hrs.click({ clickCount: 3 }); await p.keyboard.type('11.5'); await p.waitForTimeout(1000);
  const still = await p.evaluate(() => document.activeElement && document.activeElement.dataset.rowInput === '1');
  r = await rec(TODAY);
  ok(still && r.machines[0].hours === 11.5 && r.machines[0].item === 'Graafmachine', 'uren in de regel aanpassen: bewaard, veld behoudt de cursor');
  ok(/1 machine · 11,5 u/.test(await p.textContent('#sum-machines')) && /2 pers · 12 manuren/.test(await p.textContent('#sum-crew')), 'samenvattingen: machines en uren, personen en manuren (' + await p.textContent('#sum-machines') + ' | ' + await p.textContent('#sum-crew') + ')');
  const cnt = p.locator('#list-crew .pill input >> nth=0');
  await cnt.fill('4'); await p.waitForTimeout(900);
  ok((await rec(TODAY)).crew[0].count === 4 && /4 pers · 24 manuren/.test(await p.textContent('#sum-crew')), 'aantal personen in de regel aanpassen werkt en de manuren volgen');
  await p.fill('#f-crew-hours', ''); // niets aannemen: een regel zonder uren telt geen manuren
  await p.fill('#f-crew-partner', 'Zonder uren'); await p.fill('#f-crew-count', '5'); await p.click('#add-crew'); await p.waitForTimeout(700);
  ok(/9 pers · 24 manuren/.test(await p.textContent('#sum-crew')), 'regel zonder uren: aantal telt mee, manuren niet aangenomen (' + await p.textContent('#sum-crew') + ')');

  // 5. half ingevulde regel: zichtbaar, en niet kwijt bij weggaan (concept per project, dag en sectie; nooit in het logboek)
  await p.fill('#f-crew-partner', 'Halve regel');
  ok(await p.locator('#pend-crew').isVisible() && /niet toegevoegd/.test(await p.textContent('#sum-crew')), 'half ingevuld: melding en samenvatting laten zien dat het nog niet is toegevoegd');
  await p.click('#saveBack'); await p.waitForTimeout(500);
  const dr = await p.evaluate(() => JSON.parse(localStorage.getItem('gww.logdraft') || 'null'));
  ok(/#\/p\/p1$/.test(await hash()) && !(await rec(TODAY)).crew.some(c => c.partner === 'Halve regel') && dr && dr.items['p1|' + TODAY] && dr.items['p1|' + TODAY].forms.crew.partner === 'Halve regel', 'Opslaan en terug gaat meteen door zonder waarschuwing; de halve regel is een concept en niet in het logboek');
  await p.evaluate(() => { location.hash = '#/p/p1'; }); await p.waitForTimeout(300);
  ok(/concept/.test(await p.$eval('#dlist .day', e => e.innerText)), 'de dagenlijst laat zien dat er een concept is');
  await goDay(TODAY);
  ok(await p.inputValue('#f-crew-partner') === 'Halve regel' && /Concept hervat/.test(await p.textContent('#pend-crew')), 'terug op de dag: het concept is hervat en staat nog niet in de lijst');
  await p.click('#prevDay'); await p.waitForTimeout(500);
  ok(new RegExp(YEST).test(await hash()) && await p.inputValue('#f-crew-partner') === '', 'Vorige dag gaat meteen door; bij de andere dag zijn de toevoegvelden leeg (het concept hoort bij zijn eigen dag)');
  await goDay(TODAY); await p.reload(); await p.waitForTimeout(600);
  ok(await p.inputValue('#f-crew-partner') === 'Halve regel', 'na herladen is het concept er nog');
  await p.fill('#f-crew-partner', ''); await p.waitForTimeout(500);
  ok(await p.evaluate((k) => { const d = JSON.parse(localStorage.getItem('gww.logdraft') || 'null'); return !d || !d.items[k]; }, 'p1|' + TODAY) && await p.locator('#pend-crew').isHidden(), 'het veld leegmaken haalt het concept weg');

  // 6. dagen- en weekoverzicht
  await p.evaluate(() => { location.hash = '#/p/p1'; }); await p.waitForTimeout(500);
  const rows = await p.$$eval('#dlist .day', els => els.map(e => e.innerText.replace(/\s+/g, ' ')));
  ok(rows.length === 3 && /3 pers · 24 manuren · 1 machine/.test(rows[1]) && /Gisteren sleuf gegraven/.test(rows[1]), 'dagenlijst: cijfers en eerste regel werkzaamheden per dag (' + rows[1] + ')');
  await p.click('#weekBtn'); await p.waitForTimeout(400);
  const wk = await p.$$eval('#wweek .r', els => els.map(e => e.innerText.replace(/\s+/g, ' ')));
  ok(wk.length === 7 && wk.some(x => /geen invoer/.test(x)) && wk.some(x => /pers/.test(x)), 'weekoverzicht: zeven dagen met cijfers of geen invoer (' + wk.join(' | ') + ')');
  await p.click('#wclose'); await p.waitForTimeout(200);

  // 7. foto's als sectie met aantal
  await goDay(TODAY);
  const b64 = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d'); g.fillStyle = 'rgb(200,200,60)'; g.fillRect(0, 0, 800, 600); return c.toDataURL('image/jpeg', 0.9).split(',')[1]; });
  await p.setInputFiles('#shot', { name: 'f.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b64, 'base64') });
  await p.waitForSelector('#thumbs button', { timeout: 15000, state: 'attached' }); await p.waitForTimeout(300);
  ok(await p.textContent('#sum-photos') === '1 foto' && (await p.textContent('#daySum')).includes('1 foto'), 'foto\'s: sectie en dagregel tonen het aantal');

  // 8. uitgebreide dag op een smal scherm: geen overloop, tikvlakken, lange partnernaam
  await open('stagnation'); await p.selectOption('#f-stagnation-cause', 'Weer'); await p.fill('#f-stagnation-hours', '2'); await p.click('#add-stagnation');
  await p.fill('#f-crew-partner', 'Een erg lange naam van een onderaannemer in de grond-, weg- en waterbouw B.V.'); await p.fill('#f-crew-count', '12'); await p.fill('#f-crew-hours', '8.5'); await p.click('#add-crew'); await p.waitForTimeout(800);
  const m = await p.evaluate(() => { const card = document.querySelector('#v3 .card').getBoundingClientRect(), pills = [...document.querySelectorAll('#list-crew .pill')];
    return { sw: document.scrollingElement.scrollWidth <= document.documentElement.clientWidth, inside: [...document.querySelectorAll('#list-crew .rowitem')].every(r => r.getBoundingClientRect().right <= card.right + 1), minPill: Math.min(...pills.map(x => x.getBoundingClientRect().height)) }; });
  ok(m.sw && m.inside && m.minPill >= 44, `uitgebreide dag op 390px: geen zijwaartse scroll, regels binnen de kaart, aantal en uren minstens 44px hoog (${JSON.stringify(m)})`);
  ok(p.errs.length === 0, 'geen scriptfouten ' + p.errs.join('|'));
  await p.context().close();

  // 9. desktop en kleinste telefoon
  for (const vp of [{ width: 1440, height: 900 }, { width: 320, height: 700 }]) {
    const q = await mk(vp); await q.goto(ROOT + 'logboek.html#/p/p1/' + YEST); await q.waitForTimeout(700);
    const r2 = await q.evaluate(() => ({ sw: document.scrollingElement.scrollWidth <= document.documentElement.clientWidth, bar: document.getElementById('dayBar').getBoundingClientRect().bottom <= innerHeight + 1 }));
    ok(r2.sw && r2.bar && q.errs.length === 0, `dagscherm op ${vp.width}px: geen zijwaartse scroll, actiebalk in beeld, geen fouten`);
    await q.context().close();
  }
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
