// Logboek: weer rond 12:00, personeel en materieel van partners, stagnatie, leveringen, meerwerk, veiligheid en overig.
const { chromium, launchOptions, ok, ROOT } = require('./helpers.js');
const JSPDF = require.resolve('jspdf/dist/jspdf.umd.min.js');
(async () => {
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, acceptDownloads: true, permissions: ['geolocation'], geolocation: { latitude: 52.09, longitude: 5.12, accuracy: 10 } });
  await ctx.route(u => !u.href.startsWith('file:'), async (r) => {
    const url = r.request().url();
    if (/jspdf/.test(url)) return r.fulfill({ path: JSPDF, contentType: 'application/javascript' });
    if (/open-meteo/.test(url)) {
      const date = new URL(url).searchParams.get('start_date');
      const time = Array.from({ length: 24 }, (_, i) => date + 'T' + String(i).padStart(2, '0') + ':00');
      const body = { hourly: { time, temperature_2m: time.map((_, i) => (i === 12 ? 9.4 : 5)), precipitation: time.map(() => 0.1), wind_speed_10m: time.map((_, i) => (i === 12 ? 14.2 : 3)), weather_code: time.map((_, i) => (i === 12 ? 61 : 3)) } };
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    }
    return r.abort();
  });
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1');
    localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB1', name: 'Eerste', created: 1, modified: 2 }]));
    localStorage.setItem('gww.log', JSON.stringify([{ v: 1, id: 'old', projectId: 'p1', date: '2026-01-02', work: 'Oud formaat', equipment: ['Dumper'], created: 1, modified: 1 }])); } });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = iso(new Date());
  const log = () => p.evaluate(() => JSON.parse(localStorage.getItem('gww.log') || '[]'));
  const rec = async (date) => (await log()).find(x => x.date === date);
  const open = (name) => p.evaluate((n) => { document.getElementById('sec-' + n).open = true; }, name);
  await p.goto(ROOT + 'logboek.html#/p/p1/' + today); await p.waitForTimeout(1200);
  const goDay = async (d) => { await p.evaluate((x) => { location.hash = '#/p/p1/' + x; }, d); await p.waitForTimeout(500); };

  // 1. weer rond 12:00, automatisch
  ok(await p.inputValue('#wxTemp') === '9' && await p.inputValue('#wxDesc') === 'Regen', 'weer: temperatuur en weertype van 12:00 zijn automatisch ingevuld (' + await p.inputValue('#wxTemp') + ', ' + await p.inputValue('#wxDesc') + ')');
  const info = await p.textContent('#wxInfo');
  ok(/wind 14 km\/u/.test(info) && /neerslag die dag 2,4 mm/.test(info) && /automatisch/.test(info), 'weer: wind, neerslag van de dag en bron staan erbij (' + info + ')');
  await p.fill('#work', 'Sleuf gegraven'); await p.waitForTimeout(800);
  let r = await rec(today);
  ok(r && r.weather && r.weather.src === 'auto' && r.weather.temp === 9 && r.weather.rain === 2.4, 'weer wordt met de dag bewaard');
  await p.fill('#wxTemp', '11'); await p.press('#wxTemp', 'Tab'); await p.waitForTimeout(800);
  r = await rec(today);
  ok(r.weather.temp === 11 && r.weather.src === 'handmatig', 'zelf aanpassen kan en wordt als handmatig bewaard');

  // 2 en 3. personeel en materieel van partners
  await p.selectOption('#f-crew-kind', 'onderaannemer'); await p.fill('#f-crew-partner', 'Bouwpartner BV'); await p.fill('#f-crew-count', '3'); await p.fill('#f-crew-hours', '8'); await p.click('#add-crew');
  await p.selectOption('#f-machines-kind', 'inhuur'); await p.fill('#f-machines-item', 'Graafmachine 14 ton'); await p.fill('#f-machines-partner', 'Machineverhuur NV'); await p.fill('#f-machines-hours', '7.5'); await p.click('#add-machines');
  await p.waitForTimeout(800);
  r = await rec(today);
  ok(r.crew.length === 1 && r.crew[0].partner === 'Bouwpartner BV' && r.crew[0].count === 3 && r.crew[0].hours === 8, 'personeel: partner, aantal en uren bewaard');
  ok(r.machines[0].item === 'Graafmachine 14 ton' && r.machines[0].partner === 'Machineverhuur NV' && r.machines[0].hours === 7.5 && r.equipment.join() === 'Graafmachine 14 ton', 'materieel: item, partner en uren bewaard; namen ook in het oude veld');
  ok(/3 pers · 24 manuren/.test(await p.textContent('#sum-crew')) && /Bouwpartner BV/.test(await p.textContent('#list-crew')) && await p.inputValue('#list-crew .pill input >> nth=0') === '3' && await p.inputValue('#list-crew .pill input >> nth=1') === '8', 'personeel: samenvatting met manuren, aantal en uren staan in de regel');

  // 4. zelfde als vorige dag
  await goDay('2026-12-31');
  ok(await p.locator('#copyPrev').isVisible() && /Zelfde personeel en materieel als/.test(await p.textContent('#copyPrev')), 'zelfde als vorige dag: knop verschijnt op een nieuwe dag');
  await p.click('#copyPrev'); await p.waitForTimeout(800);
  r = await rec('2026-12-31');
  ok(r && r.crew.length === 1 && r.machines.length === 1, 'zelfde als vorige dag: personeel en materieel zijn overgenomen');
  ok(await p.locator('#copyPrev').isHidden(), 'de knop verdwijnt zodra er personeel of materieel staat');

  // oud formaat blijft werken
  await goDay('2026-01-02');
  ok(await p.locator('#list-machines .rowitem', { hasText: 'Dumper' }).count() === 1, 'een regel uit het oude formaat (alleen materieelnamen) wordt gewoon getoond');

  // 5 t/m 9: stagnatie, leveringen, meerwerk, veiligheid, overig
  await goDay('2026-12-31');
  await open('stagnation'); await p.selectOption('#f-stagnation-cause', 'Kabels en leidingen'); await p.fill('#f-stagnation-hours', '2'); await p.fill('#f-stagnation-note', 'KLIC afwijkend'); await p.click('#add-stagnation');
  await open('deliveries'); await p.fill('#f-deliveries-what', 'Menggranulaat'); await p.fill('#f-deliveries-qty', '24 ton'); await p.fill('#f-deliveries-bon', '1234'); await p.click('#add-deliveries');
  await open('extra'); await p.check('#exOn'); await p.fill('#exWho', 'Toezichthouder'); await p.selectOption('#exHow', 'Mondeling'); await p.fill('#exNote', 'Extra stempelen');
  await open('safety'); await p.check('#saTool'); await p.check('#saLmra'); await p.check('#saInc'); await p.fill('#saNote', 'Bijna-ongeval met kraan');
  await open('other'); await p.fill('#other', 'Opdrachtgever op bezoek'); await p.waitForTimeout(1000);
  r = await rec('2026-12-31');
  ok(r.stagnation[0].cause === 'Kabels en leidingen' && r.stagnation[0].hours === 2 && /2 u/.test(await p.textContent('#sum-stagnation')), 'stagnatie: oorzaak, uren en samenvatting');
  ok(r.deliveries[0].what === 'Menggranulaat' && r.deliveries[0].qty === '24 ton' && r.deliveries[0].bon === '1234', 'leveringen: wat, hoeveelheid en bonnummer');
  ok(r.extra.on && r.extra.who === 'Toezichthouder' && r.extra.how === 'Mondeling' && r.extra.note === 'Extra stempelen', 'meerwerk: wie, hoe en omschrijving');
  ok(r.safety.toolbox && r.safety.lmra && r.safety.incident && r.safety.note === 'Bijna-ongeval met kraan' && /incident/.test(await p.textContent('#sum-safety')), 'veiligheid: toolbox, LMRA, incident en toelichting');
  ok(r.other === 'Opdrachtgever op bezoek', 'overig wordt bewaard');
  // verwijderen van een regel
  await p.click('#list-stagnation .del'); await p.waitForTimeout(700);
  ok((await rec('2026-12-31')).stagnation.length === 0 && /geen/.test(await p.textContent('#sum-stagnation')), 'een regel verwijderen werkt (stagnatie staat weer op geen)');
  await goDay('2026-01-02'); await goDay('2026-12-31');
  ok(await p.inputValue('#other') === 'Opdrachtgever op bezoek' && await p.isChecked('#saInc') && await p.isChecked('#exOn'), 'terug naar de dag: alles staat er nog');

  // pdf met alle onderdelen
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#report')]);
  const buf = require('fs').readFileSync(await dl.path());
  ok(buf.slice(0, 5).toString() === '%PDF-', 'het dagrapport wordt gemaakt met alle onderdelen');
  ok(await p.evaluate(() => document.scrollingElement.scrollWidth <= document.documentElement.clientWidth) && p.errs.length === 0, 'geen zijwaartse scroll en geen scriptfouten ' + p.errs.join('|'));
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
