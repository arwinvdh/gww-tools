// Logboek, snelle invoer: voorstellen per project (recent, vaak, andere projecten), één tik toevoegen, eerder gebruikte waarden controleren,
// min en plus, uren voor meerdere regels, regel bewerken, verwijderen met ongedaan maken, werkzaamheden zonder toetsenbord, selectief overnemen,
// ingeklapte secties blijven ingeklapt, concepten en opslagfouten bij verwijderen.
const { chromium, launchOptions, ok, ROOT, autoOpen } = require('./helpers.js');
(async () => {
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const now = new Date(), D = (n) => iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, 12)), TODAY = D(0);
  const b = await chromium.launch(launchOptions());
  const seed = [D(1), D(2), D(4), D(9)];
  const mk = async (vp) => {
    const ctx = await b.newContext({ viewport: vp || { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
    await ctx.addInitScript(([d1, d2, d4, d9]) => { if (localStorage.getItem('__s')) return; localStorage.setItem('__s', '1');
      localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB1', name: 'Eerste', created: 1, modified: 2 }, { v: 1, id: 'p2', nr: 'IB2', name: 'Tweede', created: 1, modified: 1 }]));
      const crew = (h, extra) => [{ kind: 'eigen', partner: '', count: 4, hours: h }, { kind: 'onderaannemer', partner: 'Bouwpartner BV', count: 2, hours: h }].concat(extra || []);
      const mach = (h) => [{ kind: 'eigen', item: 'Graafmachine', partner: '', hours: h }, { kind: 'inhuur', item: 'Kraan', partner: 'Verhuur NV', hours: 2, unit: 'd' }];
      const rec = (id, pid, date, o) => Object.assign({ v: 1, id, projectId: pid, date, work: '', equipment: [], created: 5, modified: 5 }, o);
      localStorage.setItem('gww.log', JSON.stringify([
        rec('a', 'p1', d1, { work: '• Sleuf gegraven\n• Kabels gelegd', crew: crew(7.5), machines: mach(7.5), deliveries: [{ what: 'Zand', supplier: 'Zandhandel', qty: '10 ton', bon: '991' }], stagnation: [{ cause: 'Weer', hours: 2, note: 'Regen' }], extra: { on: true, who: 'Jansen', how: 'Mondeling', note: 'x' } }),
        rec('b', 'p1', d2, { work: '• Sleuf gegraven\n• Buizen gelegd', crew: crew(8), machines: mach(8) }),
        rec('c', 'p1', d4, { work: '• Sleuf gegraven', crew: crew(8, [{ kind: 'inhuur', partner: 'Uitzend Oud', count: 1, hours: 6 }]), machines: [{ kind: 'eigen', item: 'Dumper', partner: '', hours: 8 }] }),
        rec('d', 'p1', d9, { work: '• Straatwerk', crew: [{ kind: 'onderaannemer', partner: 'Eenmalig BV', count: 1, hours: 4 }] }),
        rec('x', 'p2', d1, { work: '• Asfalt gestort', crew: [{ kind: 'inhuur', partner: 'Uitzend X', count: 3, hours: 9 }], machines: [{ kind: 'eigen', item: 'Walsmachine', partner: '', hours: 5 }] })])); }, seed);
    const p = autoOpen(await ctx.newPage()); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); return p;
  };
  const p = await mk();
  const log = () => p.evaluate(() => JSON.parse(localStorage.getItem('gww.log') || '[]'));
  const rec = async (d, pid) => (await log()).find(x => x.date === d && x.projectId === (pid || 'p1'));
  const chips = (sel) => p.$$eval(sel + ' .chip', els => els.map(e => e.textContent));
  const go = async (hash) => { await p.evaluate((h) => { location.hash = h; }, hash); await p.waitForTimeout(450); };
  const kb = () => p.evaluate(() => { const a = document.activeElement; return !!(a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !/checkbox|button|file/.test(a.type)))); });
  await p.goto(ROOT + 'logboek.html#/p/p1/' + TODAY); await p.waitForTimeout(700);

  // 1. voorstellen: volgorde, dubbelen, lengte
  let sg = await chips('#sug-crew');
  ok(sg.length === 5 && /^\+ Eigen personeel/.test(sg[0]) && /^\+ Bouwpartner BV/.test(sg[1]) && /Uitzend Oud/.test(sg[2]) && /Eenmalig BV/.test(sg[3]) && /Uitzend X/.test(sg[4]) && new Set(sg).size === sg.length, 'voorstellen personeel: recent op dit project (laatste drie dagen), dan vaak/eerder op dit project, dan andere projecten; niets dubbel (' + sg.join(' | ') + ')');
  ok(/4 pers · 7\.5 u/.test(sg[0]), 'het voorstel noemt aantal en uren van de laatste keer (' + sg[0] + ')');
  ok(await p.textContent('#sugt-crew') === 'Snel toevoegen (aantal en uren van de vorige keer)', 'koptekst: aantal en uren komen van de vorige keer');
  const all = await p.$$eval('#sug-crew .chip, #sug-crew .sugl', els => els.map(e => e.textContent));
  ok(all.join('|').includes('Van andere projecten') && all.some(t => /Uitzend X/.test(t)) && all.some(t => /Uitzend Oud/.test(t)), 'voorstellen van andere projecten staan apart, na die van het project (' + all.join(' | ') + ')');
  const full = await p.$$eval('#sug-crew .chip', els => els.map(e => e.textContent));
  ok(full.length === 5 && /Eenmalig BV/.test(full.join()) === false || full.length <= 6, 'lijst blijft kort (' + full.length + ')');
  ok(!(await p.$$eval('#sug-machines .chip', els => els.map(e => e.textContent))).some(t => /Straatwerk|Eenmalig/.test(t)), 'geen onverwachte voorstellen bij materieel');
  ok(!(await p.$$eval('#sug-deliveries .chip', els => els.map(e => e.textContent))).some(t => /bon/.test(t)) && await p.locator('#sug-deliveries .chip', { hasText: 'Zand' }).count() === 1, 'leveringen: voorstel zonder bonnummer');
  ok(await p.locator('#sug-stagnation').count() === 1 && await p.locator('#sugbox-stagnation').isHidden() && await p.locator('#sugbox-extra').count() === 0, 'stagnatie en meerwerk worden nooit voorgesteld');
  ok(await p.evaluate(() => !document.getElementById('manual-crew').open && !document.getElementById('manual-machines').open && document.getElementById('manual-stagnation').open), 'handmatig formulier is ingeklapt zolang er voorstellen zijn, open als er geen zijn');

  // 2. één tik toevoegen; eerder gebruikte waarden zijn zichtbaar en te controleren
  const y0 = await p.evaluate(() => scrollY);
  await p.tap('#sug-crew .chip >> nth=0'); await p.waitForTimeout(700);
  let r = await rec(TODAY);
  ok(r && r.crew.length === 1 && r.crew[0].kind === 'eigen' && r.crew[0].count === 4 && r.crew[0].hours === 7.5 && r.v === 1 && r.id, 'één tik voegt de regel toe en bewaart (' + JSON.stringify(r && r.crew) + ')');
  ok(await p.locator('#list-crew .rowitem.carried .tag').isVisible() && /Eerder gebruikt/.test(await p.textContent('#list-crew .tag')) && await p.locator('#chkBar').isVisible() && /te controleren/.test(await p.textContent('#sum-crew')), 'de regel toont "Eerder gebruikt" en de sectie zegt te controleren');
  ok(JSON.stringify(r.crew[0]) === JSON.stringify({ kind: 'eigen', partner: '', count: 4, hours: 7.5 }), 'het logboek bevat geen extra veld voor de controle');
  ok(await p.evaluate(() => !!document.querySelector('#list-crew .pill.carried')) && Math.abs((await p.evaluate(() => scrollY)) - y0) < 4 && !(await kb()), 'geen sprong in beeld en geen toetsenbord na een tik op een voorstel');
  sg = await chips('#sug-crew');
  ok(!sg.some(t => /Eigen personeel/.test(t)), 'wat er al staat wordt niet nogmaals voorgesteld');
  const dr1 = await p.evaluate(() => JSON.parse(localStorage.getItem('gww.logdraft') || 'null'));
  ok(dr1 && dr1.items['p1|' + TODAY] && dr1.items['p1|' + TODAY].chk.crew.length === 1, 'de "te controleren"-markering staat apart (concept), niet in het logboek');

  // 3. min en plus bij aantallen, uren via een uitklapper met snelkeuzes: één of twee tikken, geen toetsenbord
  await p.tap('#list-crew .stp[data-k="count"][data-d="1"] >> nth=0'); await p.waitForTimeout(900);
  r = await rec(TODAY);
  ok(r.crew[0].count === 5 && r.crew[0].hours === 7.5 && !(await kb()) && await p.locator('#list-crew .rowitem.carried').count() === 0 && await p.locator('#chkBar').isHidden(), 'plus op aantal: 4 wordt 5 zonder toetsenbord; de regel is niet langer "eerder gebruikt"');
  await p.tap('#list-crew .stp[data-k="count"][data-d="-1"] >> nth=0'); await p.tap('#list-crew .stp[data-k="count"][data-d="-1"] >> nth=0'); await p.waitForTimeout(900);
  ok((await rec(TODAY)).crew[0].count === 3 && /3 pers/.test(await p.textContent('#sum-crew')), 'min op aantal: 5 wordt 3 en de samenvatting volgt');
  await p.tap('#list-crew .uni >> nth=0'); await p.waitForTimeout(250);
  const hc0 = await chips('#hchips');
  ok(await p.locator('#hdlg').evaluate(d => d.open) && hc0[0] === '8 u' && hc0.includes('7,5 u') && !(await kb()), 'uren: de uitklapper toont snelkeuzes uit eerdere invoer, zonder toetsenbord (' + hc0.join(', ') + ')');
  await p.tap('#hchips .chip >> nth=0'); await p.waitForTimeout(800);
  ok((await rec(TODAY)).crew[0].hours === 8 && await p.locator('#hdlg').evaluate(d => !d.open), 'één tik op een snelkeuze zet de uren en sluit');
  await p.tap('#list-crew .uni >> nth=0'); await p.tap('#hminus'); await p.tap('#hminus'); await p.tap('#hdone'); await p.waitForTimeout(800);
  ok((await rec(TODAY)).crew[0].hours === 7, 'min en gereed in de uitklapper: 8 wordt 7');
  await p.tap('#list-crew .uni >> nth=0');
  for (let i = 0; i < 16; i++) await p.tap('#hminus');
  await p.tap('#hdone'); await p.waitForTimeout(800);
  ok((await rec(TODAY)).crew[0].hours === '', 'min tot nul laat het veld leeg (geen 0 uur aannemen)');

  // 4. groep: uren voor meerdere regels, materieel per dag blijft zoals het is
  await p.tap('#sug-crew .chip >> nth=0'); await p.waitForTimeout(500);   // Bouwpartner BV, 2 pers, 7,5 u
  // snelkeuzeknoppen in plaats van keuzelijsten; één melding om alles te bevestigen
  await p.tap('#f-crew-kind + .seg .chip[data-v="inhuur"]');
  ok(await p.inputValue('#f-crew-kind') === 'inhuur' && await p.getAttribute('#f-crew-kind + .seg .chip[data-v="inhuur"]', 'aria-pressed') === 'true' && /Uitzendbureau/.test(await p.getAttribute('#f-crew-partner', 'placeholder')), 'soort kiezen is één tik op een knop en het formulier past zich aan');
  const logV = JSON.stringify(await log());
  ok(await p.locator('#chkBar').isVisible() && /1 regel met eerdere waarden/.test(await p.textContent('#chkBarTxt')), 'één melding in de vaste balk telt de te controleren regels');
  await p.tap('#chkAll'); await p.waitForTimeout(500);
  ok(await p.locator('#chkBar').isHidden() && await p.locator('#list-crew .rowitem.carried').count() === 0 && JSON.stringify(await log()) === logV && await p.evaluate((k) => { const d = JSON.parse(localStorage.getItem('gww.logdraft') || '{"items":{}}').items[k]; return !d || !Object.keys(d.chk || {}).length; }, 'p1|' + TODAY), 'Alles klopt haalt de markering weg en verandert niets in het logboek');
  await p.tap('#list-crew .stp[data-k="count"][data-d="1"] >> nth=1'); await p.tap('#list-crew .stp[data-k="count"][data-d="-1"] >> nth=1'); await p.waitForTimeout(700);
  ok(await p.locator('#grp-crew').isVisible() && /Uren voor alle 2 regels/.test(await p.textContent('#grpt-crew')), 'groepsactie verschijnt bij twee regels');
  const hc = await chips('#grph-crew');
  ok(hc[0] === '8 u' && hc.includes('7,5 u'), 'veelgebruikte uren komen uit eerdere invoer (' + hc.join(', ') + ')');
  await p.tap('#grph-crew .chip >> nth=0'); await p.waitForTimeout(800);
  r = await rec(TODAY);
  ok(r.crew.every(c => c.hours === 8) && r.crew[0].count === 3 && !(await p.locator('#copyNote').isHidden()), 'één tik zet de uren van alle regels op 8; aantallen blijven; ongedaan maken aangeboden');
  await p.tap('#undoCopy'); await p.waitForTimeout(700);
  r = await rec(TODAY);
  ok(r.crew[0].hours === '' && r.crew[1].hours === 7.5, 'ongedaan maken zet de oude uren terug');
  await p.tap('#sug-machines .chip >> nth=0'); await p.tap('#sug-machines .chip >> nth=0'); await p.waitForTimeout(800);
  r = await rec(TODAY);
  ok(r.machines.length === 2 && r.machines[1].unit === 'd', 'materieel: per uur en per dag staan beide in de dag');
  ok(/Uren voor alle 1 regels/.test(await p.textContent('#grpt-machines')) === false && await p.locator('#grp-machines').isHidden(), 'materieel: één regel per uur, dus geen groepsactie (de regel per dag telt niet mee)');
  await p.tap('#sug-machines .chip >> nth=0').catch(() => {});
  await p.fill('#f-machines-item', 'Dumper'); await p.fill('#f-machines-hours', '5'); await p.click('#add-machines'); await p.waitForTimeout(500);
  await p.tap('#grph-machines .chip >> nth=0'); await p.waitForTimeout(800);
  r = await rec(TODAY);
  ok(r.machines.filter(m => m.unit !== 'd').every(m => m.hours === 8) && r.machines.find(m => m.unit === 'd').hours === 2 && /1 regel per dag niet aangepast/.test(await p.textContent('#copyNoteTxt')), 'groepsactie materieel past alleen regels per uur aan; de dagregistratie blijft 2 dagen (' + JSON.stringify(r.machines.map(m => [m.item, m.hours, m.unit])) + ')');

  // 5. regel bewerken en verwijderen met ongedaan maken
  await p.tap('#list-crew .rowitem >> nth=1 >> .t'); await p.waitForTimeout(300);
  ok(await p.locator('#edlg').evaluate(d => d.open) && await p.inputValue('#e-crew-partner') === 'Bouwpartner BV' && await p.inputValue('#e-crew-count') === '2' && !(await kb()), 'bewerken opent de volledige regel zonder toetsenbord');
  await p.fill('#e-crew-partner', 'Bouwpartner Nieuw BV'); await p.fill('#e-crew-count', '5'); await p.tap('#ehrs .chip >> nth=1'); await p.tap('#esave'); await p.waitForTimeout(800);
  r = await rec(TODAY);
  ok(r.crew[1].partner === 'Bouwpartner Nieuw BV' && r.crew[1].count === 5 && r.crew[1].kind === 'onderaannemer' && r.crew.length === 2 && await p.locator('#edlg').evaluate(d => !d.open), 'bewerkte regel is bewaard (naam, aantal, uren via snelkeuze)');
  await p.tap('#list-crew .rowitem >> nth=1 >> .t'); await p.fill('#e-crew-partner', ''); await p.tap('#esave');
  ok(await p.locator('#edlg').evaluate(d => d.open) && /in/.test(await p.textContent('#eerr')), 'bewerken zonder verplicht bedrijf wordt niet bewaard');
  await p.tap('#eclose'); await p.waitForTimeout(300);
  ok((await rec(TODAY)).crew[1].partner === 'Bouwpartner Nieuw BV', 'annuleren laat de regel zoals hij was');
  const before = JSON.stringify((await rec(TODAY)).crew);
  await p.tap('#list-crew .del >> nth=1'); await p.waitForTimeout(700);
  ok((await rec(TODAY)).crew.length === 1 && !(await p.locator('#copyNote').isHidden()) && /verwijderd/.test(await p.textContent('#copyNoteTxt')), 'verwijderen kan en toont ongedaan maken');
  const pos = await p.evaluate(() => { const n = document.getElementById('copyNote').getBoundingClientRect(), bar = document.getElementById('dayBar').getBoundingClientRect(); return n.bottom <= bar.top + 1 && n.top >= 0 && n.bottom <= innerHeight; });
  ok(pos, 'de melding staat in beeld boven de actiebalk, waar je ook scrolt');
  await p.tap('#undoCopy'); await p.waitForTimeout(700);
  ok(JSON.stringify((await rec(TODAY)).crew) === before, 'ongedaan maken zet de regel terug op dezelfde plek');
  await p.tap('#list-crew .del >> nth=0'); await p.tap('#list-crew .del >> nth=0'); await p.waitForTimeout(700);
  ok((await rec(TODAY)).crew.length === 0 && (await rec(TODAY)).machines.length > 0, 'alle personeel weg: de dag blijft bestaan omdat er materieel is');

  // 6. ingeklapte secties blijven ingeklapt; open blijft open (renderAll opent niets)
  await p.evaluate(() => { document.getElementById('sec-machines').open = false; document.getElementById('sec-stagnation').open = true; });
  await p.waitForTimeout(100);
  await p.tap('#sug-crew .chip >> nth=0'); await p.waitForTimeout(700);
  await p.evaluate(() => { document.getElementById('work').value = ''; });
  ok(await p.evaluate(() => !document.getElementById('sec-machines').open && document.getElementById('sec-stagnation').open && document.getElementById('sec-crew').open), 'een eigen keuze (dicht/open) blijft staan na toevoegen, wijzigen en bewaren');
  ok(await p.evaluate(() => ['extra', 'safety', 'other', 'photos', 'weather', 'deliveries'].every(n => !document.getElementById('sec-' + n).open)), 'uitzonderingssecties zijn standaard compact');
  await p.evaluate(() => { document.getElementById('sec-machines').open = true; });

  // 7. werkzaamheden zonder toetsenbord
  await p.evaluate(() => { document.getElementById('work').scrollIntoView(); });
  const wc = await chips('#workSugg');
  ok(wc.length >= 3 && /Sleuf gegraven/.test(wc[0]) && wc.some(t => /Kabels gelegd/.test(t)) && wc.some(t => /Asfalt gestort/.test(t)), 'werkvoorstellen staan er zonder focus in het veld: recent en vaak van dit project, daarna andere projecten (' + wc.join(' | ') + ')');
  ok(!(await p.evaluate(() => document.activeElement === document.getElementById('work'))), 'het tekstveld heeft geen focus');
  await p.tap('#workSugg .chip >> nth=0'); await p.tap('#workSugg .chip >> nth=1'); await p.waitForTimeout(800);
  ok(await p.inputValue('#work') === '• Sleuf gegraven\n• Kabels gelegd' && !(await kb()) && (await rec(TODAY)).work === '• Sleuf gegraven\n• Kabels gelegd', 'meerdere werkzaamheden achter elkaar kiezen zonder toetsenbord; bewaard als opsomming');
  ok(await p.locator('#workSugg .chip[aria-pressed="true"]').count() === 2 && await p.locator('#workSugg .chip').first().getAttribute('aria-pressed') === 'true', 'gekozen voorstellen staan op hun plek en zijn zichtbaar gekozen');
  await p.tap('#workSugg .chip >> nth=0'); await p.waitForTimeout(700);
  ok(await p.inputValue('#work') === '• Kabels gelegd', 'nogmaals tikken haalt de regel weer weg (geen dubbele regels)');
  await p.fill('#work', '• Buizen gelegd'); await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(300);
  ok(await p.locator('#workSugg .chip[aria-pressed="true"]', { hasText: 'Buizen gelegd' }).count() === 1, 'een zelf getypte regel telt als gekozen: hij wordt niet nogmaals voorgesteld of toegevoegd');
  await p.fill('#work', '• Kabels gelegd'); await p.waitForTimeout(300);
  await p.focus('#work'); await p.keyboard.press('End'); await p.keyboard.press('Enter'); await p.keyboard.type('Eigen nieuwe taak'); await p.waitForTimeout(900);
  ok(/Kabels gelegd\n• Eigen nieuwe taak$/.test(await p.inputValue('#work')), 'vrije invoer en de opsomming werken nog (' + JSON.stringify(await p.inputValue('#work')) + ')');
  await p.evaluate(() => document.activeElement.blur());
  const w1 = (await rec(TODAY)).work; await p.waitForTimeout(300);
  ok(/Eigen nieuwe taak/.test(w1), 'vrije tekst is bewaard');

  // 8. selectief overnemen uit een eerdere dag
  await p.tap('#pickPrev'); await p.waitForTimeout(300);
  const seenTxt = [];
  for (let i = 0; i < 6; i++) { seenTxt.push(...await p.$$eval('#olist .check', els => els.map(e => e.innerText.trim()))); if (await p.isDisabled('#oprev')) break; await p.tap('#oprev'); await p.waitForTimeout(100); }
  ok(seenTxt.length >= 3 && !seenTxt.some(t => /Levering|Zand|Regen|stagnatie|Jansen|991|Zandhandel/i.test(t)), 'alleen personeel, materieel en werkzaamheden; nooit stagnatie, meerwerk, leveringen of bonnen (' + seenTxt.length + ' regels bekeken)');
  await p.tap('#oclose'); await p.waitForTimeout(200);
  await go('#/p/p1/' + D(3));
  ok(await p.locator('#pickPrev').isVisible() && await p.inputValue('#work') === '', 'een lege dag: knop om uit een eerdere dag te kiezen');
  await p.tap('#pickPrev'); await p.waitForTimeout(300);
  ok((await p.textContent('#otitle')).includes(String(now.getFullYear())) && /^Van (ma|di|wo|do|vr|za|zo) /.test(await p.textContent('#otitle')), 'het dialoogvenster noemt de brondatum (' + await p.textContent('#otitle') + ')');
  const olist = await p.$$eval('#olist .check', els => els.map(e => e.innerText.trim()));
  ok(olist.length === 5 && olist.some(t => /Dumper/.test(t)) && olist.some(t => /Sleuf gegraven/.test(t)) && !(await p.locator('#olist input:not(:checked)').count()), 'alle onderdelen staan aangevinkt en zijn los uit te vinken (' + olist.join(' | ') + ')');
  await p.evaluate(() => { [...document.querySelectorAll('#olist input')].forEach(c => { if (/Bouwpartner|Uitzend Oud/.test(c.parentElement.innerText)) c.checked = false; }); });
  await p.tap('#ook'); await p.waitForTimeout(800);
  r = await rec(D(3));
  ok(r.crew.map(c => c.kind).join() === 'eigen' && r.machines.map(m => m.item).join() === 'Dumper' && r.work === '• Sleuf gegraven', 'alleen aangevinkte onderdelen zijn overgenomen (' + JSON.stringify([r.crew.length, r.machines.length, r.work]) + ')');
  ok(await p.locator('#list-crew .rowitem.carried').count() === 1 && /Overgenomen van/.test(await p.textContent('#copyNoteTxt')), 'overgenomen waarden zijn te controleren en de bron staat in de melding');
  await p.tap('#undoCopy'); await p.waitForTimeout(800);
  r = await rec(D(3));
  ok(!r, 'ongedaan maken haalt de overname weg (de dag is weer leeg en wordt niet bewaard)');
  await p.fill('#f-crew-partner', 'Eigen bedrijf'); await p.fill('#f-crew-count', '9'); await p.click('#add-crew'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.activeElement.id) === 'f-crew-partner', 'typen en Toevoegen: het toetsenbord blijft staan en de cursor staat weer in het eerste veld');
  await p.evaluate(() => document.activeElement.blur()); await p.fill('#f-crew-partner', 'Los bedrijf'); await p.evaluate(() => document.activeElement.blur()); await p.tap('#add-crew'); await p.waitForTimeout(500);
  ok(!(await kb()) && (await rec(D(3))).crew.some(c => c.partner === 'Los bedrijf'), 'Toevoegen zonder te typen: er springt geen veld open');
  await p.tap('#pickPrev'); await p.waitForTimeout(300);
  await p.tap('#ook'); await p.waitForTimeout(700);
  r = await rec(D(3));
  ok(r.crew.some(c => c.partner === 'Eigen bedrijf' && c.count === 9) && r.crew.length === 5, 'bestaande invoer blijft staan; overgenomen regels komen erbij (' + r.crew.length + ' regels)');
  await go('#/p/p1/' + TODAY);

  // 9. opslagfouten: verwijderen mislukt, dan blijft alles staan
  await p.evaluate(() => { const orig = Storage.prototype.setItem; window.__origSet = orig; Storage.prototype.setItem = function (k, v) { if (k === 'gww.log') throw new Error('vol'); return orig.call(this, k, v); }; });
  const nBefore = (await rec(TODAY)).crew.length;
  await p.tap('#list-crew .del >> nth=0'); await p.waitForTimeout(600);
  ok((await rec(TODAY)).crew.length === nBefore && await p.locator('#list-crew .rowitem').count() === nBefore && /niet verwijderd|niet op dit apparaat/.test(await p.textContent('#state')), 'verwijderen van een regel met vol geheugen: de regel blijft staan en er is een melding');
  await p.tap('#delDay'); await p.waitForTimeout(100); await p.tap('#delDay'); await p.waitForTimeout(700);
  const tomb = await p.evaluate(() => localStorage.getItem('gww.tombstones'));
  ok(/\/p1\/p1|#\/p\/p1\/\d/.test(await p.evaluate(() => location.hash)) && !!(await rec(TODAY)) && !(tomb && /log\/p1\//.test(tomb)) && /niet op dit apparaat/.test(await p.textContent('#state')), 'dag verwijderen met vol geheugen: de dag blijft, geen grafsteen, melding in beeld');
  await p.evaluate(() => { Storage.prototype.setItem = window.__origSet; });

  // 10. back-up en rapport bevatten geen concepten
  await p.fill('#f-crew-partner', 'Concept bedrijf'); await p.waitForTimeout(500);
  const dl = await p.evaluate(() => JSON.parse(localStorage.getItem('gww.logdraft')));
  ok(dl.items['p1|' + TODAY] && !JSON.stringify(await log()).includes('Concept bedrijf'), 'een concept staat apart en niet in het logboek');
  await go('#/'); await p.waitForTimeout(300);
  const [dlf] = await Promise.all([p.waitForEvent('download'), p.click('#bkExp')]);
  const txt = require('fs').readFileSync(await dlf.path(), 'utf8');
  ok(!txt.includes('Concept bedrijf') && !txt.includes('logdraft'), 'de back-up bevat geen concepten');

  // 11. smalle schermen: alles past, geen zijwaartse scroll, tikdoelen groot genoeg
  for (const w of [320, 375, 390, 430]) {
    const q = await mk({ width: w, height: 800 }); await q.goto(ROOT + 'logboek.html#/p/p1/' + TODAY); await q.waitForTimeout(600);
    await q.tap('#sug-crew .chip >> nth=0'); await q.tap('#sug-crew .chip >> nth=0'); await q.tap('#sug-machines .chip >> nth=0'); await q.waitForTimeout(500);
    const m = await q.evaluate(() => {
      const card = document.querySelector('#v3 .card').getBoundingClientRect();
      const small = [...document.querySelectorAll('#list-crew .stp, #list-crew .uni, #list-crew .del, #list-crew .t, #list-machines .uni, #list-machines .del')].filter(e => { const r = e.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; }).length;
      return { sw: document.scrollingElement.scrollWidth <= document.documentElement.clientWidth, inside: [...document.querySelectorAll('.rowitem, .pill, .chip')].every(e => e.getBoundingClientRect().right <= card.right + 1), small };
    });
    ok(m.sw && m.inside && m.small === 0, `op ${w}px: geen zijwaartse scroll, regels in de kaart, min/plus/verwijderen/naam minstens 44px (${JSON.stringify(m)})`);
    await q.context().close();
  }
  ok(p.errs.length === 0, 'geen scriptfouten ' + p.errs.join('|'));
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
