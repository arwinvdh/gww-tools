// Locatie delen met twee locaties: bericht met twee links, genummerde pins, afbeelding met beide pins, opslaan en terugzetten.
const { chromium, ROOT, LEAFLET_JS, LEAFLET_CSS, launchOptions, ok } = require('./helpers.js');
const TILE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4//8/AwAI/AL+XJ/P2QAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, acceptDownloads: true });
  await ctx.route(u => !u.href.startsWith('file:'), r => {
    const u = r.request().url();
    if (/pdok|arcgisonline|openstreetmap/.test(u) && /\.(png|jpe?g)|\/tile\//.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: TILE });
    return r.abort();
  });
  await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  p.on('dialog', d => d.accept());
  await p.goto(ROOT + 'index.html'); await p.waitForTimeout(600);
  await p.evaluate(() => { document.getElementById('tip').hidden = true; });
  const preview = () => p.evaluate(() => document.getElementById('preview').textContent);
  const go = async (q) => { await p.fill('#q', q); await p.click('#go'); await p.waitForTimeout(500); };

  await go('51.995961, 4.476169');
  ok(await p.locator('#p2add').isVisible() && await p.locator('#curseg').isHidden(), 'na locatie 1 verschijnt de knop Tweede locatie');
  await p.fill('#nr', 'IB25060'); await p.fill('#name', 'HOF Berkel'); await p.fill('#addr', 'Oudelandselaan 1, 2651 AB Berkel en Rodenrijs');
  await p.click('#p2add');
  ok(await p.locator('#curseg').isVisible() && await p.locator('#p2del').isVisible() && await p.locator('#p2add').isHidden(), 'na tikken op Tweede locatie: keuze 1/2 en Weghalen zichtbaar');
  ok(!(await preview()).includes('2️⃣'), 'zolang locatie 2 geen plek heeft, staat ze niet in het bericht');
  await go('51.9975, 4.4790');
  await p.fill('#addr2', 'Zuidpoort 5, 2651 AC Berkel en Rodenrijs');
  await p.evaluate(() => { document.getElementById('more').open = true; });
  await p.fill('#plabel', 'Inrit werkterrein'); await p.fill('#plabel2', 'Meldpunt');
  await p.waitForTimeout(300);
  const t = await preview();
  const links = (t.match(/https:\/\/www\.google\.com\/maps\?q=[\d.,]+/g) || []);
  ok(links.length === 2 && links[0] !== links[1], 'bericht bevat twee verschillende Maps-links (' + links.join(' | ') + ')');
  ok(/1️⃣ Inrit werkterrein/.test(t) && /2️⃣ Meldpunt/.test(t) && /Zuidpoort 5/.test(t) && !t.includes('Locatie in Google Maps:'), 'bericht: twee genummerde blokken met label en adres, geen losse link onderaan');
  ok(/Inrit werkterrein\*?\nOudelandselaan 1\n2651 AB Berkel en Rodenrijs\nhttps:\/\/www\.google\.com\/maps\?q=51\.995961,4\.476169\n\n/.test(t), 'bericht: adres en link van locatie 1 staan bij elkaar met een lege regel erna (' + JSON.stringify(t.slice(0, 160)) + ')');
  ok(await p.locator('#addr2').isVisible() && await p.locator('#plabel2').isVisible() && await p.locator('#plabel').isVisible(), 'adres- en labelveld voor locatie 2, en het label van locatie 1, zijn zichtbaar zonder iets uit te klappen');
  const pn = await p.evaluate(() => [...document.querySelectorAll('.leaflet-marker-icon .pin .pn')].map(e => e.textContent));
  ok(pn.sort().join() === '1,2', 'kaart toont twee genummerde pins (' + pn.join(',') + ')');

  // wissel tussen de twee: zoeken zet dan de gekozen locatie
  await p.click('#curseg button[data-c="1"]'); await go('51.9961, 4.4765');
  const t2 = await preview();
  ok(/q=51\.9961,4\.4765/.test(t2) && /q=51\.9975,4\.479\b/.test(t2), 'terug naar locatie 1 verplaatst alleen locatie 1');

  // afbeelding met beide pins
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 45000 }), p.click('#dl')]);
  const file = await dl.path(); const buf = require('fs').readFileSync(file);
  const info = await p.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, step = 4, gw = Math.ceil(c.width / step), gh = Math.ceil(c.height / step), mask = new Uint8Array(gw * gh);
    for (let y = 0; y < c.height; y += step) for (let x = 0; x < c.width; x += step) { const i = (y * c.width + x) * 4; if (d[i] > 190 && d[i + 1] < 90 && d[i + 2] < 90) mask[(y / step) * gw + x / step] = 1; }
    const comps = [], seen = new Uint8Array(gw * gh);
    for (let k = 0; k < mask.length; k++) if (mask[k] && !seen[k]) {
      const st = [k]; seen[k] = 1; let n = 0, sx = 0, sy = 0;
      while (st.length) { const q = st.pop(), qx = q % gw, qy = (q / gw) | 0; n++; sx += qx; sy += qy;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const m = ny * gw + nx; if (mask[m] && !seen[m]) { seen[m] = 1; st.push(m); } } }
      if (n > 60) comps.push({ n, x: sx / n * step, y: sy / n * step });
    }
    return { w: img.width, h: img.height, comps };
  }, buf.toString('base64'));
  ok(info.w === 1192 && info.h === 1472, 'afbeelding heeft het vaste formaat (' + info.w + 'x' + info.h + ')');
  ok(info.comps.length === 2, 'afbeelding bevat twee pins (' + info.comps.length + ' rode vlakken)');
  const inBand = info.comps.every(c => c.y > 56 + 380 && c.y < 56 + 1110 && c.x > 100 && c.x < 1100);
  ok(inBand, 'beide pins liggen in het vrije vlak tussen kaartje en onderbalk (' + info.comps.map(c => Math.round(c.x) + ',' + Math.round(c.y)).join(' | ') + ')');

  // twee pins vlak bij elkaar (ongeveer 25 m): de kaart zoomt in zodat de nummers leesbaar blijven
  await p.click('#curseg button[data-c="2"]'); await go('51.99618, 4.47638');
  const [dl2] = await Promise.all([p.waitForEvent('download', { timeout: 45000 }), p.click('#dl')]);
  const buf2 = require('fs').readFileSync(await dl2.path());
  const near = await p.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, step = 4, gw = Math.ceil(c.width / step), gh = Math.ceil(c.height / step), mask = new Uint8Array(gw * gh);
    for (let y = 0; y < c.height; y += step) for (let x = 0; x < c.width; x += step) { const i = (y * c.width + x) * 4; if (d[i] > 190 && d[i + 1] < 90 && d[i + 2] < 90) mask[(y / step) * gw + x / step] = 1; }
    const comps = [], seen = new Uint8Array(gw * gh);
    for (let k = 0; k < mask.length; k++) if (mask[k] && !seen[k]) {
      const st = [k]; seen[k] = 1; let n = 0, sx = 0, sy = 0;
      while (st.length) { const q = st.pop(), qx = q % gw, qy = (q / gw) | 0; n++; sx += qx; sy += qy;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const m = ny * gw + nx; if (mask[m] && !seen[m]) { seen[m] = 1; st.push(m); } } }
      if (n > 60) comps.push({ x: sx / n * step, y: sy / n * step });
    }
    return comps;
  }, buf2.toString('base64'));
  const dist = near.length === 2 ? Math.hypot(near[0].x - near[1].x, near[0].y - near[1].y) : 0;
  ok(near.length === 2 && dist >= 150, 'pins die vlak bij elkaar liggen worden uit elkaar gezoomd (afstand ' + Math.round(dist) + ' px, ' + near.length + ' vlakken)');
  await p.click('#curseg button[data-c="2"]'); await go('51.9975, 4.4790');

  // opslaan en terugzetten
  await p.click('#wa'); await p.waitForTimeout(400);
  await p.reload(); await p.waitForTimeout(700); await p.evaluate(() => { document.getElementById('tip').hidden = true; });
  ok(await p.evaluate(() => document.querySelectorAll('.leaflet-marker-icon .pin .pn').length === 2) && await p.inputValue('#addr2') === 'Zuidpoort 5, 2651 AC Berkel en Rodenrijs', 'na herladen staat locatie 2 er nog (concept)');
  await p.click('#new'); await p.waitForTimeout(300);
  ok(await p.locator('#curseg').isHidden() && await p.evaluate(() => document.querySelectorAll('.leaflet-marker-icon .pin').length === 0), 'Nieuwe locatie haalt ook locatie 2 weg');
  await p.click('#chips .chip'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.querySelectorAll('.leaflet-marker-icon .pin .pn').length === 2) && await p.inputValue('#plabel2') === 'Meldpunt', 'bewaard project zet beide locaties en labels terug');
  await p.click('#p2del'); await p.waitForTimeout(300);
  const t3 = await preview();
  ok(!(await p.locator('#addr2').isVisible()) && t3.includes('Locatie in Google Maps:') && !t3.includes('2️⃣'), 'Locatie 2 weghalen: bericht is weer het gewone met één link');
  ok(p.errs.length === 0, 'geen scriptfouten ' + p.errs.join('|'));
  await b.close();
})();
