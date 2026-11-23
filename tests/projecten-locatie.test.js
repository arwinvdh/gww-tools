// Locatie per project: instellen in Projecten, weer in het logboek en startpunt in Locatie delen.
// Elk onderdeel heeft een eigen browsercontext met eigen beginwaarden, zodat ze elkaar niet beïnvloeden.
const { chromium, launchOptions, ok, ROOT, LEAFLET_JS, LEAFLET_CSS } = require('./helpers.js');
(async () => {
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const TODAY = iso(new Date());
  const b = await chromium.launch(launchOptions());
  const meteo = [];
  const until = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise(r => setTimeout(r, 200)); } return false; };

  // een nieuwe pagina met nagebootste PDOK, Open-Meteo en kaartbestanden en eigen beginwaarden
  async function fresh(projects, locdelen) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, permissions: ['geolocation'], geolocation: { latitude: 51.5, longitude: 4.5, accuracy: 10 } });
    await ctx.route(u => !u.href.startsWith('file:'), async (r) => {
      const url = r.request().url(), cors = { 'access-control-allow-origin': '*' };
      if (/leaflet/.test(url)) return r.fulfill({ path: /\.js$/.test(url) ? LEAFLET_JS : LEAFLET_CSS });
      if (/locatieserver.*\/free/.test(url)) return r.fulfill({ contentType: 'application/json', headers: cors, body: JSON.stringify({ response: { docs: [{ weergavenaam: 'Domplein 1, 3512JC Utrecht', centroide_ll: 'POINT(5.12140 52.09070)' }] } }) });
      if (/locatieserver.*\/reverse/.test(url)) return r.fulfill({ contentType: 'application/json', headers: cors, body: JSON.stringify({ response: { docs: [{ weergavenaam: 'Westblaak 10, Rotterdam' }] } }) });
      if (/open-meteo/.test(url)) {
        const sp = new URL(url).searchParams; meteo.push(sp.get('latitude') + ',' + sp.get('longitude'));
        const date = sp.get('start_date'), time = Array.from({ length: 24 }, (_, i) => date + 'T' + String(i).padStart(2, '0') + ':00');
        return r.fulfill({ contentType: 'application/json', headers: cors, body: JSON.stringify({ hourly: { time, temperature_2m: time.map(() => 8), precipitation: time.map(() => 0), wind_speed_10m: time.map(() => 10), weather_code: time.map(() => 3) } }) });
      }
      return r.abort();
    });
    await ctx.addInitScript(([pr, ld]) => {
      if (localStorage.getItem('gww.projects') !== null) return;   /* alleen de eerste keer: de opslag is gedeeld tussen de bestanden */
      localStorage.setItem('gww.projects', JSON.stringify(pr));
      if (ld) localStorage.setItem('locdelen.projects', JSON.stringify(ld));
    }, [projects, locdelen]);
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    p.proj = (id) => p.evaluate((id) => JSON.parse(localStorage.getItem('gww.projects')).find(x => x.id === id), id);
    return p;
  }
  const P = [{ v: 1, id: 'p1', nr: 'IB1', name: 'Eerste', created: 1, modified: 2 }, { v: 1, id: 'p2', nr: 'IB2', name: 'Tweede', created: 1, modified: 1 }];
  const LD = [{ nr: 'IB1', name: 'Eerste', lat: 52.37, lon: 4.9, addr: 'Damrak 1, Amsterdam' }, { nr: 'IB9', name: 'Nieuw', lat: 51.9, lon: 4.4, addr: 'Coolsingel 1, Rotterdam' }];

  // 1. instellen in Projecten
  let p = await fresh(P, LD);
  await p.goto(ROOT + 'projecten.html'); await p.waitForTimeout(500);
  await p.click('.row[data-id="p1"]'); await p.waitForTimeout(200);
  ok(/Nog geen locatie/.test(await p.textContent('#locText')) && await p.locator('#locClear').isHidden(), 'dialoog: nog geen locatie en geen wisknop');
  await p.fill('#locQ', 'Domplein'); await p.click('#locGo'); await p.waitForSelector('#locRes .row');
  await p.click('#locRes .row');
  ok(await until(async () => (await p.proj('p1')).lat === 52.0907), 'adres zoeken: locatie bewaard bij het project');
  let r = await p.proj('p1');
  ok(r.lon === 5.1214 && r.addr === 'Domplein 1, 3512JC Utrecht' && /Domplein 1/.test(await p.textContent('#locText')) && await p.locator('#locClear').isVisible(), 'adres zoeken: ook adres, tekst en wisknop kloppen');
  await p.click('#locHere');
  ok(await until(async () => (await p.proj('p1')).addr === 'Westblaak 10, Rotterdam'), 'huidige locatie: coördinaten en adres van de plek waar je staat');
  r = await p.proj('p1');
  ok(Math.abs(r.lat - 51.5) < 0.001 && Math.abs(r.lon - 4.5) < 0.001, 'huidige locatie: de coördinaten van het toestel');
  await p.click('#locFromLd');
  ok(await until(async () => (await p.proj('p1')).lat === 52.37), 'uit Locatie delen: locatie van het project met dezelfde naam overgenomen');
  r = await p.proj('p1');
  ok(r.lon === 4.9 && r.addr === 'Damrak 1, Amsterdam', 'uit Locatie delen: ook lengtegraad en adres');
  await p.click('#locClear');
  ok(await until(async () => (await p.proj('p1')).lat === undefined), 'wissen haalt de locatie weg');
  await p.click('#ecancel');
  await p.click('.row[data-id="p2"]'); await p.click('#locFromLd'); await p.waitForTimeout(200);
  ok(/Geen locatie gevonden/.test(await p.textContent('#locMsg')) && (await p.proj('p2')).lat === undefined, 'zonder overeenkomst: duidelijke melding en niets gewijzigd');
  ok(p.errs.length === 0, 'projecten: geen scriptfouten ' + p.errs.join('|'));
  await p.context().close();

  // 2. eerste keer overnemen uit Locatie delen neemt de locatie mee
  const c2 = await b.newContext({ viewport: { width: 390, height: 900 } }); await c2.route(u => !u.href.startsWith('file:'), r2 => r2.abort());
  await c2.addInitScript((ld) => { localStorage.setItem('locdelen.projects', JSON.stringify(ld)); }, [LD[1]]);
  const q = await c2.newPage(); await q.goto(ROOT + 'projecten.html');
  await until(async () => (await q.evaluate(() => JSON.parse(localStorage.getItem('gww.projects') || '[]'))).length === 1);
  const imp = await q.evaluate(() => JSON.parse(localStorage.getItem('gww.projects'))[0]);
  ok(imp.lat === 51.9 && imp.lon === 4.4 && imp.addr === 'Coolsingel 1, Rotterdam', 'overnemen uit Locatie delen neemt de locatie mee');
  await c2.close();

  // 3. het weer in het logboek gebruikt de projectlocatie, anders het toestel
  const PL = [{ v: 1, id: 'p1', nr: 'IB1', name: 'Eerste', lat: 52.37, lon: 4.9, addr: 'Damrak 1', created: 1, modified: 2 }, { v: 1, id: 'p2', nr: 'IB2', name: 'Tweede', created: 1, modified: 1 }];
  p = await fresh(PL, null);
  await p.goto(ROOT + 'logboek.html#/p/p1/' + TODAY);
  ok(await until(() => meteo.length > 0 && meteo[meteo.length - 1] === '52.370,4.900'), 'logboek: weer wordt opgehaald voor de projectlocatie (' + meteo.join(' | ') + ')');
  await p.evaluate((d) => { location.hash = '#/p/p2/' + d; }, TODAY);
  ok(await until(() => meteo[meteo.length - 1] === '51.500,4.500'), 'logboek: zonder projectlocatie valt het weer terug op de positie van het toestel (' + meteo[meteo.length - 1] + ')');
  ok(p.errs.length === 0, 'logboek: geen scriptfouten ' + p.errs.join('|'));
  await p.context().close();

  // 4. Locatie delen start op de projectlocatie
  p = await fresh(PL, null);
  await p.goto(ROOT + 'index.html#gp=p1');
  await p.waitForFunction(() => /52\.37/.test(document.getElementById('coords').textContent), null, { timeout: 15000 }).catch(() => {});
  const v = await p.evaluate(() => ({ nr: document.getElementById('nr').value, coords: document.getElementById('coords').textContent, addr: document.getElementById('addr').value }));
  ok(v.nr === 'IB1' && /52\.37/.test(v.coords) && v.addr === 'Damrak 1', 'Locatie delen: opent met het project en de pin op de projectlocatie (' + v.coords + ', ' + v.addr + ')');
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
