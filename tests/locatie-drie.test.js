// Locatie delen met drie locaties en vrije labels.
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
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(ROOT + 'index.html'); await p.waitForTimeout(600);
  await p.evaluate(() => { document.getElementById('tip').hidden = true; });
  const preview = () => p.evaluate(() => document.getElementById('preview').textContent);
  const go = async (q) => { await p.fill('#q', q); await p.click('#go'); await p.waitForTimeout(500); };
  const pins = () => p.evaluate(() => [...document.querySelectorAll('.leaflet-marker-icon .pin .pn')].map(e => e.textContent).sort().join());

  await go('51.995961, 4.476169');
  await p.fill('#nr', 'IB25060'); await p.fill('#name', 'HOF Berkel'); await p.fill('#addr', 'Oudelandselaan 1, 2651 AB Berkel en Rodenrijs');
  ok((await p.textContent('#p2add')).includes('Tweede'), 'knop heet eerst "+ Tweede locatie"');
  await p.click('#p2add'); await go('51.9975, 4.4790'); await p.fill('#addr2', 'Zuidpoort 5, 2651 AC Berkel en Rodenrijs');
  ok((await p.textContent('#p2add')).includes('Derde') && await p.locator('#p2add').isVisible(), 'na twee locaties heet de knop "+ Derde locatie"');
  await p.click('#p2add');
  ok(await p.locator('#curseg button').count() === 3 && await p.locator('#p2del').textContent() === 'Annuleren', 'tijdens het toevoegen: drie keuzeknoppen en Annuleren');
  await p.click('#p2del');
  ok(await p.locator('#curseg button').count() === 2 && await p.locator('#p2add').isVisible(), 'Annuleren haalt de lege derde plek weg');
  await p.click('#p2add'); await go('51.9962, 4.4812'); await p.fill('#addr3', 'Noordkade 12, 2651 AD Berkel en Rodenrijs');
  ok(await p.locator('#p2add').isHidden() && await p.locator('#curseg button').count() === 3, 'bij drie locaties is er geen knop om er nog een toe te voegen');
  ok(await pins() === '1,2,3', 'kaart toont drie genummerde pins (' + await pins() + ')');

  // vrije labels
  await p.fill('#plabel', 'Inrit'); await p.fill('#plabel2', 'Poort noord (code 4821)'); await p.fill('#plabel3', 'Kantine bouwteam'); await p.waitForTimeout(300);
  const t = await preview();
  const links = t.match(/https:\/\/www\.google\.com\/maps\?q=[\d.,]+/g) || [];
  ok(links.length === 3 && new Set(links).size === 3, 'bericht bevat drie verschillende Maps-links');
  ok(/1️⃣ Inrit\*?\n/.test(t) && /2️⃣ Poort noord \(code 4821\)\*?\n/.test(t) && /3️⃣ Kantine bouwteam\*?\n/.test(t), 'bericht toont de vrij getypte labels bij 1, 2 en 3');
  ok(!t.includes('Locatie in Google Maps:') && (t.match(/\n\n/g) || []).length >= 3 && !/\n\n\n/.test(t), 'geen losse link onderaan en nooit twee lege regels achter elkaar');
  ok((await p.getAttribute('#plabel3', 'list')) === 'dl-label' && await p.locator('#dl-label option').count() >= 5, 'labelveld is vrij te typen met suggesties');

  // afbeelding met drie pins
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 45000 }), p.click('#dl')]);
  const buf = require('fs').readFileSync(await dl.path());
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
      if (n > 60) comps.push({ x: sx / n * step, y: sy / n * step });
    }
    return { w: img.width, h: img.height, comps };
  }, buf.toString('base64'));
  ok(info.w === 1192 && info.h === 1472 && info.comps.length === 3, 'afbeelding heeft het vaste formaat en drie pins (' + info.w + 'x' + info.h + ', ' + info.comps.length + ' rode vlakken)');
  ok(info.comps.every(c => c.y > 56 + 380 && c.y < 56 + 1110 && c.x > 100 && c.x < 1100), 'alle drie de pins liggen in het vrije vlak (' + info.comps.map(c => Math.round(c.x) + ',' + Math.round(c.y)).join(' | ') + ')');

  // middelste weghalen: de derde schuift op naar 2
  await p.click('#curseg button[data-c="2"]'); await p.click('#p2del'); await p.waitForTimeout(400);
  const t2 = await preview();
  ok(await p.locator('#curseg button').count() === 2 && await pins() === '1,2', 'na weghalen van locatie 2: twee locaties en pins 1,2');
  ok(/2️⃣ Kantine bouwteam/.test(t2) && !t2.includes('Poort noord') && !t2.includes('3️⃣') && /Noordkade 12/.test(t2), 'locatie 3 is nu locatie 2, met label en adres (' + JSON.stringify(t2.split('\n').filter(l => /Kantine|Noordkade/.test(l))) + ')');
  ok(await p.inputValue('#addr2') === 'Noordkade 12, 2651 AD Berkel en Rodenrijs' && await p.inputValue('#plabel3') === '' && await p.locator('#loc3f').isHidden(), 'velden schuiven mee en het derde blok verdwijnt');

  // opnieuw naar drie, opslaan en terugzetten
  await p.click('#p2add'); await go('51.9962, 4.4812'); await p.fill('#addr3', 'Noordkade 12, 2651 AD Berkel en Rodenrijs'); await p.fill('#plabel3', 'Kantine bouwteam');
  await p.click('#wa'); await p.waitForTimeout(400);
  await p.click('#new'); await p.waitForTimeout(300);
  ok(await pins() === '' && await p.locator('#curseg').isHidden(), 'Nieuwe locatie haalt alle locaties weg');
  await p.click('#chips .chip'); await p.waitForTimeout(800);
  ok(await pins() === '1,2,3' && await p.inputValue('#plabel2') === 'Kantine bouwteam' && await p.inputValue('#plabel3') === 'Kantine bouwteam' && await p.inputValue('#plabel') === 'Inrit', 'bewaard project zet drie locaties met vrije labels terug');
  await p.reload(); await p.waitForTimeout(700); await p.evaluate(() => { document.getElementById('tip').hidden = true; });
  ok(await pins() === '1,2,3', 'na herladen staan alle drie de locaties er nog (concept)');
  // zonder tweede locatie staat het label weer bij de aanwijzingen
  await p.click('#curseg button[data-c="3"]'); await p.click('#p2del'); await p.click('#curseg button[data-c="2"]'); await p.click('#p2del'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('plabelF').parentNode.classList.contains('more-in')), 'met één locatie staat het labelveld weer bij de aanwijzingen');
  ok(p.errs.length === 0, 'geen scriptfouten ' + p.errs.join('|'));
  await b.close();
})();
