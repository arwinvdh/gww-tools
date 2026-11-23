// Locatie delen: zoeken, GPS, pin verplaatsen, projectlocatie, ongeldige invoer, geen internet, samenvatting (pin / adres / link),
// alle deelacties en de indeling op zes schermbreedtes.
const { chromium, launchOptions, ok, ROOT, LEAFLET_JS, LEAFLET_CSS } = require('./helpers.js');
const { devices } = require('playwright');
const TILE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4//8/AwAI/AL+XJ/P2QAAAABJRU5ErkJggg==', 'base64');
const doc = (t, st, n, pc, pl, lon, lat) => ({ type: t, straatnaam: st, huisnummer: n, postcode: pc, woonplaatsnaam: pl, weergavenaam: st + (n ? ' ' + n : '') + ', ' + pc + ' ' + pl, centroide_ll: `POINT(${lon} ${lat})` });
const json = (r, body) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
(async () => {
  const b = await chromium.launch(launchOptions());
  let freeDocs = [doc('adres', 'Domplein', '1', '3512JC', 'Utrecht', 5.1214, 52.0907), doc('adres', 'Domplein', '1A', '3512JC', 'Utrecht', 5.1215, 52.0908), doc('weg', 'Domplein', '', '3512JC', 'Utrecht', 5.12, 52.09)];
  let revDoc = { ...doc('adres', 'Domplein', '1', '3512JC', 'Utrecht', 5.1214, 52.0907), afstand: 4 };
  let offline = false;
  const mk = async (dev, opts) => {
    const ctx = await b.newContext({ ...dev, ...(opts || {}) });
    await ctx.route(u => !u.href.startsWith('file:'), r => {
      if (offline) return r.abort();
      const u = new URL(r.request().url());
      if (u.hostname === 'api.pdok.nl' && /\/free$/.test(u.pathname)) return json(r, { response: { docs: freeDocs } });
      if (u.hostname === 'api.pdok.nl' && /\/reverse$/.test(u.pathname)) return json(r, { response: { docs: u.searchParams.get('type') === 'adres' && revDoc ? [revDoc] : [] } });
      if (u.hostname === 'nominatim.openstreetmap.org') return json(r, /reverse/.test(u.pathname) ? {} : []);
      if (/pdok|arcgisonline|openstreetmap/.test(r.request().url()) && /\.(png|jpe?g)|\/tile\//.test(r.request().url())) return r.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: TILE });
      return r.abort();
    });
    await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    return p;
  };
  const open = async (dev, opts, hash) => { const p = await mk(dev, opts); await p.goto(ROOT + 'index.html' + (hash || '')); await p.waitForTimeout(700); await p.evaluate(() => { const t = document.getElementById('tip'); if (t) t.hidden = true; }); return p; };
  const txt = (p, id) => p.textContent('#' + id).then(t => t.replace(/\s+/g, ' ').trim());

  // --- adres zoeken: resultaten, kiezen, samenvatting ---
  let p = await open(devices['iPhone 13']);
  await p.fill('#q', 'Domplein 1 Utrecht'); await p.click('#go'); await p.waitForTimeout(700);
  const res = await p.$$eval('#results button', els => els.map(e => ({ t: e.textContent, h: Math.round(e.getBoundingClientRect().height) })));
  ok(res.length === 3 && res.every(x => x.h >= 44), 'zoeken: drie resultaten, elk minstens 44px hoog (' + res.map(x => x.h).join(',') + ')');
  await p.click('#results button >> nth=0'); await p.waitForTimeout(900);
  ok(await txt(p, 'lsPin') === '52.0907, 5.1214' && await txt(p, 'lsAddr') === 'Domplein 1, 3512 JC Utrecht' && /Pin op de kaart/.test(await txt(p, 'lsLink')), 'kiezen: samenvatting toont pin, gevonden adres en link (' + await txt(p, 'lsPin') + ' | ' + await txt(p, 'lsAddr') + ')');
  const vis = await p.evaluate(() => { const m = document.getElementById('map').getBoundingClientRect(), s = document.getElementById('locsum').getBoundingClientRect(), bar = document.querySelector('.bar').getBoundingClientRect(); return { mapIn: m.top >= 0 && m.bottom <= bar.top, sumIn: s.bottom <= bar.top + 1, nrFocus: document.activeElement && document.activeElement.id === 'nr' }; });
  ok(vis.mapIn && vis.sumIn && !vis.nrFocus, 'telefoon: na kiezen staan kaart en samenvatting in beeld, boven de actiebalk (' + JSON.stringify(vis) + ')');
  // zelf aangepast adres wordt zo benoemd; Aanpassen springt naar het adresveld
  await p.fill('#addr', 'Domplein 1 (ingang Domkerk)'); await p.waitForTimeout(200);
  ok(/zelf ingevuld/.test(await txt(p, 'lsAddr')), 'eigen adres: samenvatting zegt dat het zelf is ingevuld');
  await p.click('#lsEdit'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.activeElement.id) === 'addr', 'Aanpassen zet de cursor in het adresveld');
  // pin verplaatsen: tikken op de kaart verandert de pin, de coördinaten komen uit de kaart
  const before = await txt(p, 'lsPin');
  await p.click('#map', { position: { x: 60, y: 60 } }); await p.waitForTimeout(700);
  const after = await txt(p, 'lsPin');
  ok(after !== before && /^\d+\.\d+, \d+\.\d+$/.test(after), 'pin verplaatsen: samenvatting volgt de nieuwe pin (' + before + ' -> ' + after + ')');
  ok((await txt(p, 'status')).startsWith('Pin') || /pin/i.test(await txt(p, 'status')), 'pin verplaatsen: melding bij de zoekbalk (' + await txt(p, 'status') + ')');

  // --- bericht: leesbaar en volledig ---
  await p.fill('#nr', 'IB1'); await p.fill('#name', 'Reconstructie Zuidpoort'); await p.waitForTimeout(300);
  const msg = await p.evaluate(() => document.getElementById('preview').innerText);
  const lines = msg.split('\n').map(x => x.trim()).filter(Boolean);
  ok(/^🏗️ IB1 · Reconstructie Zuidpoort$/.test(lines[0]) && lines.some(l => /^📍 /.test(l)) && /^https:\/\/www\.google\.com\/maps\?q=\d+\.\d+,\d+\.\d+$/.test(lines[lines.length - 1]), 'bericht: titel, adres met pin-teken en de link als laatste regel (' + lines.join(' / ') + ')');
  ok(await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById('preview')).fontSize) >= 15), 'bericht: voorbeeld in minstens 15px');

  // --- alle deelacties ---
  await p.close(); await p.context().close();
  p = await open({ viewport: { width: 1100, height: 900 } }, { acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  await p.fill('#q', '52.0907, 5.1214'); await p.click('#go'); await p.waitForTimeout(900);
  await p.fill('#nr', 'IB1'); await p.fill('#name', 'Zuidpoort'); await p.waitForTimeout(300);
  await p.click('#copy'); await p.waitForTimeout(400);
  ok(/Gekopieerd/.test(await p.textContent('#toast')) && /maps\?q=52\.0907,5\.1214/.test(await p.evaluate(() => navigator.clipboard.readText())), 'delen: Kopieer bericht zet tekst en link op het klembord');
  await p.evaluate(() => { window.__open = []; window.open = function (u) { window.__open.push(u); return null; }; });
  await p.click('#wa');
  const wa = decodeURIComponent((await p.evaluate(() => window.__open))[0] || '');
  ok(/^https:\/\/wa\.me\/\?text=/.test(wa) && wa.includes('Zuidpoort') && wa.includes('maps?q=52.0907,5.1214'), 'delen: Deel tekst opent WhatsApp met het volledige bericht');
  const [d1] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }).catch(() => null), p.click('#dl')]);
  ok(d1 && /\.jpg$/.test(d1.suggestedFilename()), 'delen: Bewaar afbeelding geeft een .jpg (' + (d1 && d1.suggestedFilename()) + ')');
  await p.waitForTimeout(500);
  const [d2] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }).catch(() => null), p.click('#img')]);
  ok(d2 && /\.jpg$/.test(d2.suggestedFilename()) && /Afbeelding opgeslagen/.test(await p.textContent('#toast').catch(() => '')), 'delen: Deel afbeelding (zonder deelmenu) slaat de afbeelding op en kopieert het bericht');
  await p.context().close();

  // --- projectlocatie overnemen (#gp): coördinaten blijven exact ---
  const pg = await mk(devices['iPhone 13']);
  await pg.context().addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB7', name: 'Met locatie', lat: 52.123456, lon: 5.654321, addr: 'Nieuwstraat 5, 3511 AB Utrecht', created: 1, modified: 2 }])); } });
  await pg.goto(ROOT + 'index.html#gp=p1'); await pg.waitForTimeout(900);
  const dr = await pg.evaluate(() => JSON.parse(localStorage.getItem('locdelen.draft') || '{}'));
  ok(await txt(pg, 'lsPin') === '52.123456, 5.654321' && dr.lat === 52.123456 && dr.lon === 5.654321 && /Nieuwstraat 5/.test(await txt(pg, 'lsAddr')), 'projectlocatie: pin, adres en project overgenomen, coördinaten exact (' + await txt(pg, 'lsPin') + ')');
  ok(/IB7/.test(await pg.evaluate(() => document.getElementById('preview').innerText)), 'projectlocatie: nummer staat in het bericht');
  await pg.context().close();

  // --- ongeldige invoer ---
  p = await open(devices['iPhone 13']);
  await p.fill('#q', '123.4, 400.5'); await p.click('#go'); await p.waitForTimeout(300);
  ok(/kloppen niet/.test(await txt(p, 'status')) && await p.locator('#locsum').isHidden(), 'ongeldige coördinaten: duidelijke melding, geen pin');
  await p.fill('#q', 'a'); await p.click('#go'); await p.waitForTimeout(200);
  ok(/minstens 2 tekens/.test(await txt(p, 'status')), 'te korte zoekopdracht: melding');
  freeDocs = [];
  await p.fill('#q', 'Qqzzqqxx 99'); await p.click('#go'); await p.waitForTimeout(900);
  ok(/Niets gevonden voor "Qqzzqqxx 99"/.test(await txt(p, 'status')) && await p.locator('#locsum').isHidden(), 'niets gevonden: melding noemt de zoekopdracht en geeft een uitweg (' + await txt(p, 'status') + ')');
  await p.context().close();
  freeDocs = [doc('adres', 'Domplein', '1', '3512JC', 'Utrecht', 5.1214, 52.0907), doc('adres', 'Domplein', '1A', '3512JC', 'Utrecht', 5.1215, 52.0908)];

  // --- GPS: nauwkeurig, onnauwkeurig, geweigerd ---
  p = await open(devices['iPhone 13'], { permissions: ['geolocation'], geolocation: { latitude: 52.0907, longitude: 5.1214, accuracy: 12 } });
  await p.click('#me'); await p.waitForTimeout(900);
  ok(await txt(p, 'lsPin') === '52.0907, 5.1214' && /ongeveer 12 m/.test(await txt(p, 'status')) && await p.locator('#status.ok').count() === 1, 'GPS: pin op de positie, melding met nauwkeurigheid (' + await txt(p, 'status') + ')');
  await p.context().setGeolocation({ latitude: 52.1, longitude: 5.2, accuracy: 180 }); await p.click('#me'); await p.waitForTimeout(900);
  ok(/niet erg nauwkeurig/.test(await txt(p, 'status')) && await p.locator('#status.err').count() === 1, 'GPS: onnauwkeurig geeft een waarschuwing (' + await txt(p, 'status') + ')');
  await p.context().close();
  p = await open(devices['iPhone 13']);
  await p.click('#me'); await p.waitForTimeout(900);
  ok(/Locatie staat uit/.test(await txt(p, 'status')) && await p.locator('#status.err').count() === 1 && !(await p.evaluate(() => document.getElementById('me').classList.contains('busy'))), 'GPS geweigerd: uitleg waar je het aanzet, knop niet meer bezig (' + await txt(p, 'status') + ')');
  await p.context().close();

  // --- geen internet ---
  p = await open(devices['iPhone 13']);
  offline = true; await p.context().setOffline(true);
  await p.fill('#q', 'Domplein 1'); await p.click('#go'); await p.waitForTimeout(800);
  ok(/Geen verbinding/.test(await txt(p, 'status')), 'offline: zoeken zegt dat er geen verbinding is (' + await txt(p, 'status') + ')');
  await p.fill('#q', '52.0907, 5.1214'); await p.click('#go'); await p.waitForTimeout(1200);
  ok(await txt(p, 'lsPin') === '52.0907, 5.1214' && /Geen adres/.test(await txt(p, 'lsAddr')) && /Geen verbinding/.test(await txt(p, 'addrNoteTxt')), 'offline: coördinaten werken, de samenvatting zegt dat het adres ontbreekt en waarom');
  ok(await p.isEnabled('#copy') && /maps\?q=52\.0907,5\.1214/.test(await p.evaluate(() => document.getElementById('preview').innerText)), 'offline: het bericht met link blijft beschikbaar');
  await p.context().close(); offline = false;

  // --- indeling op zes breedtes ---
  for (const w of [375, 390, 430, 768, 1024, 1440]) {
    const q = await open({ viewport: { width: w, height: w >= 768 ? 900 : 780 }, hasTouch: w < 768, isMobile: w < 768 });
    await q.fill('#q', 'Domplein 1 Utrecht'); await q.click('#go'); await q.waitForTimeout(600); await q.click('#results button >> nth=0'); await q.waitForTimeout(900);
    const r = await q.evaluate(() => {
      const card = document.getElementById('locsum').closest('.card').getBoundingClientRect(), s = document.getElementById('locsum').getBoundingClientRect(), bar = document.querySelector('.bar').getBoundingClientRect();
      const lab = document.querySelector('#img'), rg = document.createRange(); rg.selectNodeContents(lab);
      return { sw: document.scrollingElement.scrollWidth <= document.documentElement.clientWidth, inside: s.left >= card.left - 1 && s.right <= card.right + 1, qw: Math.round(document.getElementById('q').getBoundingClientRect().width), lines: rg.getClientRects().length, barH: Math.round(bar.height) };
    });
    ok(r.sw && r.inside && r.qw >= 250 && (w < 375 || r.lines === 1) && q.errs.length === 0, `indeling op ${w}px: geen zijwaartse scroll, samenvatting in de kaart, zoekveld ${r.qw}px, "Deel afbeelding" op ${r.lines} regel(s), geen fouten`);
    await q.context().close();
  }
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
