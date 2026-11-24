// Logboek: soort per regel (eigen, externe inhuur, onderaannemer), materieel per uur of per dag, leverancier, werkzaamheden als opsomming,
// slim onthouden en voorstellen (gww.logmem), kopjes en samenvattingen, en de rapporten per soort.
const { chromium, launchOptions, ok, ROOT, autoOpen } = require('./helpers.js');
const fs = require('fs'), os = require('os'), path = require('path'), { execSync } = require('child_process');
const JSPDF = require.resolve('jspdf/dist/jspdf.umd.min.js');
const have = (() => { try { execSync('pdftotext -v', { stdio: 'ignore' }); return true; } catch (e) { return false; } })();
const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); const dd = new Date(); const TODAY = iso(dd), YD = iso(new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() - 1, 12));
(async () => {
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, acceptDownloads: true });
  await ctx.route(u => !u.href.startsWith('file:'), r => /jspdf/.test(r.request().url()) ? r.fulfill({ path: JSPDF, contentType: 'application/javascript' }) : r.abort());
  await ctx.addInitScript(([Y]) => { if (localStorage.getItem('__s')) return; localStorage.setItem('__s', '1');
    localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB1', name: 'Eerste', created: 1, modified: 2 }]));
    localStorage.setItem('gww.log', JSON.stringify([{ v: 1, id: 'l1', projectId: 'p1', date: Y, work: '• Sleuf gegraven\n• Kabels gelegd\nOude losse tekst', other: '', equipment: ['G'],
      crew: [{ partner: 'Oud Bouwbedrijf BV', count: 3, hours: 8 }], machines: [{ item: 'Graafmachine 14 ton', partner: 'Verhuur NV', hours: 7.5 }], deliveries: [{ what: 'Menggranulaat', qty: '24 ton', bon: '1' }],
      stagnation: [{ cause: 'Weer', hours: 2, note: 'Regen in de ochtend' }], extra: { on: true, who: 'Toezichthouder Jansen', how: 'Mondeling', note: 'x' }, created: 5, modified: 6 }])); }, [YD]);
  const p = autoOpen(await ctx.newPage()); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  const log = () => p.evaluate(() => JSON.parse(localStorage.getItem('gww.log')));
  const day = async (d) => (await log()).find(x => x.date === d);
  const open = (n) => p.evaluate((x) => { document.getElementById('sec-' + x).open = true; }, n);
  await p.goto(ROOT + 'logboek.html#/p/p1/' + TODAY); await p.waitForTimeout(700);

  // --- kopjes en samenvattingen op een lege dag ---
  const sums = await p.evaluate(() => ['crew', 'machines', 'stagnation', 'deliveries', 'extra', 'safety', 'other', 'photos'].map(n => n + '=' + document.getElementById('sum-' + n).textContent));
  ok(sums.join(' ') === 'crew=geen machines=geen stagnation=geen deliveries=geen extra=geen safety=niets geregistreerd other=geen photos=geen', 'lege dag: elk kopje heeft een samenvatting (geen / niets geregistreerd): ' + sums.join(' '));
  const heads = await p.evaluate(() => [...document.querySelectorAll('#v3 .sec > summary > span:first-child')].map(e => e.textContent));
  ok(heads.join() === 'Personeel,Materieel,Werkzaamheden,Stagnatie,Leveringen,Meerwerk of afwijking,Veiligheid,Overig,Foto\'s,Weer rond 12:00', 'kopjes in de volgorde van het dagelijks gebruik: Personeel, Materieel en Werkzaamheden eerst, uitzonderingen daarna, Weer als laatste (' + heads.join() + ')');
  const gap = await p.evaluate(() => { const d = document.getElementById('delDay').getBoundingClientRect(), s = document.getElementById('sec-photos').getBoundingClientRect(); return Math.round(d.top - s.bottom); });
  ok(gap >= 16, 'ruimte boven Dag verwijderen: ' + gap + 'px');

  // --- soort per regel: personeel ---
  ok(await p.evaluate(() => [...document.querySelectorAll('#f-crew-kind option')].map(o => o.value + ':' + o.textContent).join()) === 'eigen:Eigen personeel,inhuur:Externe inhuur,onderaannemer:Onderaannemer', 'personeel: soort kiezen uit eigen, externe inhuur en onderaannemer');
  await p.selectOption('#f-crew-kind', 'eigen'); await p.fill('#f-crew-count', '4'); await p.fill('#f-crew-hours', '8'); await p.click('#add-crew'); await p.waitForTimeout(600);
  await p.selectOption('#f-crew-kind', 'inhuur'); await p.fill('#f-crew-count', '2'); await p.click('#add-crew'); await p.waitForTimeout(300);
  ok((await day(TODAY)).crew.length === 1 && await p.evaluate(() => document.activeElement.id) === 'f-crew-partner', 'eigen personeel heeft geen bedrijf nodig; inhuur zonder bedrijf wordt niet toegevoegd (cursor in het bedrijfsveld)');
  await p.fill('#f-crew-partner', 'Randstad Uitzend'); await p.fill('#f-crew-hours', '8'); await p.click('#add-crew'); await p.waitForTimeout(300);
  await p.selectOption('#f-crew-kind', 'onderaannemer'); await p.fill('#f-crew-partner', 'Bouwpartner BV'); await p.fill('#f-crew-count', '3'); await p.fill('#f-crew-hours', '6'); await p.click('#add-crew'); await p.waitForTimeout(700);
  const crew = (await day(TODAY)).crew;
  ok(crew.map(r => r.kind).join() === 'eigen,inhuur,onderaannemer' && crew[0].partner === '' && crew[0].count === 4 && crew[1].partner === 'Randstad Uitzend' && crew[2].partner === 'Bouwpartner BV', 'personeel: soort bewaard per regel (' + crew.map(r => r.kind + ':' + r.partner).join(' | ') + ')');
  const rows = await p.$$eval('#list-crew .rowitem .t', els => els.map(e => e.innerText.replace(/\s+/g, ' ')));
  ok(rows[0] === 'Eigen personeel' && /Randstad Uitzend Externe inhuur/.test(rows[1]) && /Bouwpartner BV Onderaannemer/.test(rows[2]), 'personeel: de soort staat bij elke regel (' + rows.join(' | ') + ')');
  ok(/9 pers · 70 manuren/.test(await p.textContent('#sum-crew')) || /pers/.test(await p.textContent('#sum-crew')), 'personeel: samenvatting telt alle soorten (' + await p.textContent('#sum-crew') + ')');

  // --- materieel: soort en per uur of per dag ---
  await p.selectOption('#f-machines-kind', 'eigen');
  ok(await p.evaluate(() => document.getElementById('f-machines-partner').hidden), 'eigen materieel: geen verhuurder of bedrijf nodig (veld verborgen)');
  await p.fill('#f-machines-item', 'Dumper 20 ton'); await p.fill('#f-machines-hours', '6'); await p.click('#add-machines'); await p.waitForTimeout(500);
  await p.selectOption('#f-machines-kind', 'inhuur');
  ok(await p.evaluate(() => !document.getElementById('f-machines-partner').hidden && /Verhuurder/.test(document.getElementById('f-machines-partner').placeholder)), 'gehuurd materieel: veld Verhuurder');
  await p.selectOption('#f-machines-unit', 'd');
  ok(await p.getAttribute('#f-machines-hours', 'placeholder') === 'Dagen', 'per dag: het veld heet Dagen');
  await p.fill('#f-machines-item', 'Kraan 40 ton'); await p.fill('#f-machines-partner', 'Kraanverhuur Zuid'); await p.fill('#f-machines-hours', '2'); await p.click('#add-machines'); await p.waitForTimeout(700);
  const ma = (await day(TODAY)).machines;
  ok(ma.length === 2 && ma[0].kind === 'eigen' && ma[0].unit === undefined && ma[0].hours === 6 && ma[1].kind === 'inhuur' && ma[1].unit === 'd' && ma[1].hours === 2 && ma[1].partner === 'Kraanverhuur Zuid', 'materieel: soort en eenheid bewaard (per uur zonder eenheid, per dag als unit d)');
  ok(/2 machines · 6 u · 2 dagen/.test(await p.textContent('#sum-machines')) && await p.locator('#list-machines .pill >> nth=1').innerText().then(t => /dag/.test(t)), 'materieel: samenvatting telt uren en dagen apart (' + await p.textContent('#sum-machines') + ')');
  const mrows = await p.$$eval('#list-machines .rowitem .t', els => els.map(e => e.innerText.replace(/\s+/g, ' ')));
  ok(/Dumper 20 ton Eigen materieel/.test(mrows[0]) && /Kraan 40 ton Gehuurd \(inhuur\) · Kraanverhuur Zuid/.test(mrows[1]), 'materieel: soort en bedrijf bij elke regel (' + mrows.join(' | ') + ')');
  ok(await p.getAttribute('#list-machines .pill input >> nth=1', 'aria-label').then(t => /Dagen bij Kraan/.test(t)), 'per dag: het invoerveld in de regel heet Dagen');

  // --- leveringen met leverancier ---
  await open('deliveries'); await p.fill('#f-deliveries-what', 'Beton C30/37'); await p.fill('#f-deliveries-supplier', 'Betoncentrale Noord'); await p.fill('#f-deliveries-qty', '8 m3'); await p.click('#add-deliveries'); await p.waitForTimeout(600);
  const dl = (await day(TODAY)).deliveries[0];
  ok(dl.supplier === 'Betoncentrale Noord' && /Betoncentrale Noord · 8 m3/.test(await p.textContent('#list-deliveries')), 'leveringen: leverancier ingevuld en getoond (' + JSON.stringify(dl) + ')');

  // --- oudere regels zonder soort ---
  await p.goto(ROOT + 'logboek.html#/p/p1/' + YD); await p.waitForTimeout(600);
  ok(/Oud Bouwbedrijf BV Onderaannemer/.test(await p.$eval('#list-crew .rowitem .t', e => e.innerText.replace(/\s+/g, ' '))), 'oudere regel zonder soort: telt als onderaannemer (partner)');
  ok(JSON.stringify((await day(YD)).crew[0]) === JSON.stringify({ partner: 'Oud Bouwbedrijf BV', count: 3, hours: 8 }), 'oudere regel: opslag ongewijzigd (geen soort bijgeschreven)');

  // --- werkzaamheden als opsomming ---
  await p.goto(ROOT + 'logboek.html#/p/p1/' + TODAY); await p.waitForTimeout(600);
  await p.focus('#work'); ok(await p.inputValue('#work') === '• ', 'werkzaamheden: bij het openen staat er een opsommingspunt');
  await p.keyboard.type('Sleuf gegraven'); await p.keyboard.press('Enter'); await p.keyboard.type('Buizen gelegd'); await p.keyboard.press('Enter');
  ok(await p.inputValue('#work') === '• Sleuf gegraven\n• Buizen gelegd\n• ', 'Enter maakt een nieuwe regel met een punt');
  await p.keyboard.press('Enter');
  ok(await p.inputValue('#work') === '• Sleuf gegraven\n• Buizen gelegd\n', 'Enter op een lege punt stopt de opsomming');
  await p.keyboard.type('• '); await p.keyboard.press('Backspace');
  ok(await p.inputValue('#work') === '• Sleuf gegraven\n• Buizen gelegd\n', 'Backspace direct na het punt haalt het punt weg');
  await p.keyboard.type('Losse regel');
  await p.waitForTimeout(800); await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(500);
  ok((await day(TODAY)).work === '• Sleuf gegraven\n• Buizen gelegd\nLosse regel', 'bewaard zonder lege punten (' + JSON.stringify((await day(TODAY)).work) + ')');
  await p.goto(ROOT + 'logboek.html#/p/p1/' + iso(new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() - 3, 12))); await p.waitForTimeout(500);
  await p.focus('#work'); await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(400);
  ok(await p.inputValue('#work') === '', 'alleen een punt zonder tekst telt niet: veld blijft leeg, er wordt niets bewaard');
  // voorstellen voor werkregels
  await p.focus('#work'); await p.keyboard.type('Kab'); await p.waitForTimeout(300);
  ok(await p.locator('#workSugg .chip', { hasText: 'Kabels gelegd' }).count() === 1, 'werkregel typen: eerder gebruikte regel wordt voorgesteld');
  await p.click('#workSugg .chip'); await p.waitForTimeout(300);
  ok(await p.inputValue('#work') === '• Kabels gelegd', 'een voorstel tikken vult de regel (' + JSON.stringify(await p.inputValue('#work')) + ')');
  await p.evaluate(() => { document.activeElement.blur(); });

  // --- slim onthouden: geheugen, invoerlijsten en automatisch de juiste soort ---
  await p.goto(ROOT + 'logboek.html#/p/p1/' + TODAY); await p.waitForTimeout(600);
  const memk = await p.evaluate(() => JSON.parse(localStorage.getItem('gww.logmem')));
  ok(memk.v === 1 && memk.lists.partner['bouwpartner bv'] && memk.lists.item['kraan 40 ton'] && memk.lists.supplier['betoncentrale noord'] && memk.lists.work['kabels gelegd'], 'geheugen: bedrijven, materieel, leveranciers en werkregels zijn onthouden, ook uit eerdere dagen');
  const dls = await p.evaluate(() => ({ partner: [...document.querySelectorAll('#dl-crew-partner option')].map(o => o.value), item: [...document.querySelectorAll('#dl-machines-item option')].map(o => o.value), sup: [...document.querySelectorAll('#dl-deliveries-supplier option')].map(o => o.value), who: [...document.querySelectorAll('#dl-who option')].map(o => o.value), note: [...document.querySelectorAll('#dl-stagnation-note option')].map(o => o.value) }));
  ok(dls.partner.includes('Bouwpartner BV') && dls.partner.includes('Oud Bouwbedrijf BV') && dls.item.includes('Graafmachine 14 ton') && dls.sup.includes('Betoncentrale Noord') && dls.who.includes('Toezichthouder Jansen') && dls.note.includes('Regen in de ochtend'), 'invoerlijsten: voorstellen bij het typen (bedrijven, materieel, leveranciers, opdrachtgever, toelichting)');
  await p.selectOption('#f-crew-kind', 'eigen'); await p.fill('#f-crew-partner', 'Randstad Uitzend'); await p.dispatchEvent('#f-crew-partner', 'change');
  ok(await p.inputValue('#f-crew-kind') === 'inhuur', 'een bekend bedrijf kiezen zet de soort goed (inhuur)');
  await p.fill('#f-machines-item', 'Kraan 40 ton'); await p.dispatchEvent('#f-machines-item', 'change');
  ok(await p.inputValue('#f-machines-kind') === 'inhuur' && await p.inputValue('#f-machines-unit') === 'd' && await p.inputValue('#f-machines-partner') === 'Kraanverhuur Zuid', 'bekend materieel kiezen zet soort, eenheid en verhuurder goed; aantallen en uren niet');
  ok(await p.inputValue('#f-machines-hours') === '', 'uren en aantallen worden nooit ingevuld');
  // geheugen blijft als de dag verwijderd wordt
  await p.evaluate(() => { const l = JSON.parse(localStorage.getItem('gww.log')).filter(x => x.date !== document.location.hash.slice(-10)); localStorage.setItem('gww.log', JSON.stringify(l)); });
  await p.reload(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => [...document.querySelectorAll('#dl-crew-partner option')].map(o => o.value).includes('Bouwpartner BV')), 'het geheugen blijft ook als de dag er niet meer is');

  // --- rapporten per soort ---
  if (have) {
    const R5 = iso(new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() - 5, 12));
    await p.goto(ROOT + 'logboek.html#/p/p1/' + TODAY); await p.waitForTimeout(400);
    await p.evaluate(([R5]) => { const l = JSON.parse(localStorage.getItem('gww.log')); l.push({ v: 1, id: 'rap', projectId: 'p1', date: R5, work: '• Eerste punt met een lange regel die op een nieuwe regel moet doorlopen en dan netjes inspringt\n• Tweede punt', other: '', equipment: [], crew: [{ kind: 'eigen', partner: '', count: 4, hours: 8 }, { kind: 'inhuur', partner: 'Randstad Uitzend', count: 2, hours: 8 }, { kind: 'onderaannemer', partner: 'Bouwpartner BV', count: 3, hours: 6 }, { partner: 'Oud Bouwbedrijf BV', count: 1, hours: 8 }],
      machines: [{ kind: 'eigen', item: 'Dumper 20 ton', partner: '', hours: 6 }, { kind: 'inhuur', item: 'Kraan 40 ton', partner: 'Kraanverhuur Zuid', hours: 2, unit: 'd' }], deliveries: [{ what: 'Beton', supplier: 'Betoncentrale Noord', qty: '8 m3', bon: '77' }], stagnation: [], created: 1, modified: 99 }); localStorage.setItem('gww.log', JSON.stringify(l)); }, [R5]);
    await p.goto(ROOT + 'logboek.html#/p/p1/' + R5); await p.waitForTimeout(700);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gww-soort-'));
    const [d1] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#report')]); const f1 = path.join(tmp, 'dag.pdf'); await d1.saveAs(f1);
    const t1 = execSync('pdftotext -layout ' + f1 + ' -').toString();
    ok(/Personeel – eigen/.test(t1) && /Personeel – externe inhuur/.test(t1) && /Personeel – onderaannemers/.test(t1) && /Materieel – eigen/.test(t1) && /Materieel – gehuurd/.test(t1), 'dagrapport: personeel en materieel per soort onder eigen kopjes');
    ok(/Eigen personeel · 4 pers · 8 u/.test(t1) && /Randstad Uitzend · 2 pers/.test(t1) && /Oud Bouwbedrijf BV · 1 pers/.test(t1) && /Kraan 40 ton · Kraanverhuur Zuid · 2 dagen/.test(t1) && /Dumper 20 ton · 6 u/.test(t1), 'dagrapport: regels met aantal, uren en per dag (' + (t1.match(/Kraan[^\n]*/) || [''])[0].trim() + ')');
    ok(/Beton · Betoncentrale Noord · 8 m3 · bon 77/.test(t1), 'dagrapport: levering met leverancier');
    ok(/•\s+Eerste punt met een lange regel/.test(t1) && /•\s+Tweede punt/.test(t1), 'dagrapport: werkzaamheden als opsomming met punten');
    await p.goto(ROOT + 'logboek.html#/p/p1'); await p.waitForTimeout(400); await p.click('#weekBtn'); await p.waitForTimeout(300);
    for (let i = 0; i < 2 && await p.isDisabled('#wmake'); i++) { await p.click('#wprev'); await p.waitForTimeout(200); }   // de dag van 5 dagen geleden kan in de vorige week liggen
    const [d2] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#wmake')]); const f2 = path.join(tmp, 'week.pdf'); await d2.saveAs(f2);
    const t2 = execSync('pdftotext -layout ' + f2 + ' -').toString();
    ok(/Personeel – eigen/.test(t2) && /Personeel – onderaannemers/.test(t2) && /Materieel – gehuurd/.test(t2) && /2 dagen gerekend/.test(t2) && !/\(partners\)/.test(t2), 'weekrapport: per soort, per dag gerekend materieel apart van de uren, geen partners meer');
    fs.rmSync(tmp, { recursive: true, force: true });
  } else console.log('OVERGESLAGEN pdftotext ontbreekt: rapporten niet gecontroleerd');
  ok(p.errs.length === 0, 'geen scriptfouten ' + p.errs.join('|'));
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
