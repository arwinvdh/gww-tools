// Locatie delen: de afbeelding houdt overal genoeg marge (geen tekst of label tegen de rand, bronvermelding vrij van de adressen).
const { chromium, ROOT, LEAFLET_JS, LEAFLET_CSS, launchOptions, ok } = require('./helpers.js');
const TILE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4//8/AwAI/AL+XJ/P2QAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const b = await chromium.launch(launchOptions());
  async function render(locs, labels, addrs, name) {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, acceptDownloads: true });
    await ctx.route(u => !u.href.startsWith('file:'), r => {
      const u = r.request().url();
      if (/pdok|arcgisonline|openstreetmap/.test(u) && /\.(png|jpe?g)|\/tile\//.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: TILE });
      return r.abort();
    });
    await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
    const p = await ctx.newPage(); await p.goto(ROOT + 'index.html'); await p.waitForTimeout(500);
    await p.evaluate(() => { document.getElementById('tip').hidden = true; for (const [id, v] of [['myName', 'Arwin van den Hoek'], ['myPhone', '06-12735041']]) { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input')); } });
    await p.fill('#q', locs[0]); await p.click('#go'); await p.waitForTimeout(400);
    await p.evaluate(() => { document.getElementById('more').open = true; });
    await p.fill('#nr', 'IB25060'); await p.fill('#name', name); await p.fill('#addr', addrs[0]); await p.fill('#plabel', labels[0]);
    for (let i = 1; i < locs.length; i++) {
      await p.click('#p2add'); await p.fill('#q', locs[i]); await p.click('#go'); await p.waitForTimeout(400);
      await p.fill('#addr' + (i + 1), addrs[i]); await p.fill('#plabel' + (i + 1), labels[i]);
    }
    await p.waitForTimeout(300);
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 45000 }), p.click('#dl')]);
    const b64 = require('fs').readFileSync(await dl.path()).toString('base64');
    const m = await p.evaluate(async ([b64, BH]) => {
      const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const M = 56, W = 1080, H = 1360, T = H - BH, px = (x, y) => g.getImageData(M + x, M + y, 1, 1).data;
      const barRef = px(W / 2, H - 10), mapRef = px(W / 2, 200);
      const dev = (x0, x1, y0, y1, ref) => { let mx = 0; const d = g.getImageData(M + x0, M + y0, x1 - x0, y1 - y0).data; for (let i = 0; i < d.length; i += 4) mx = Math.max(mx, Math.abs(d[i] - ref[0]), Math.abs(d[i + 1] - ref[1]), Math.abs(d[i + 2] - ref[2])); return mx; };
      // laagste rode punt (pinpunt) in het kaartvlak
      const mid = g.getImageData(M, M + 400, W, T - 400 + 30).data; let lowest = 0;
      for (let y = 0; y < T - 400 + 30; y++) for (let x = 0; x < W; x += 2) { const i = (y * W + x) * 4; if (mid[i] > 190 && mid[i + 1] < 90 && mid[i + 2] < 90) lowest = Math.max(lowest, y + 400); }
      const areas = []; { const gw = W, gh = T - 400 + 30, seen = new Uint8Array(gw * gh), isRed = (x, y) => { const i = (y * gw + x) * 4; return mid[i] > 190 && mid[i + 1] < 90 && mid[i + 2] < 90; };
        for (let y = 0; y < gh; y += 2) for (let x = 0; x < gw; x += 2) if (isRed(x, y) && !seen[y * gw + x]) { const st = [[x, y]]; seen[y * gw + x] = 1; let n = 0;
          while (st.length) { const [qx, qy] = st.pop(); n++; for (const [dx, dy] of [[2,0],[-2,0],[0,2],[0,-2]]) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh || seen[ny * gw + nx] || !isRed(nx, ny)) continue; seen[ny * gw + nx] = 1; st.push([nx, ny]); } }
          if (n > 150) areas.push(n); } }
      return {
        areas, creditDev: dev(W - 520, W - 36, H - 34, H - 10, barRef),
        barSides: Math.max(dev(0, 30, T + 14, H - 62, barRef), dev(W - 30, W, T + 14, H - 62, barRef)),
        barBottom: dev(60, W - 60, H - 12, H - 4, barRef),
        mapSides: Math.max(dev(0, 40, 440, T - 24, mapRef), dev(W - 40, W, 440, T - 24, mapRef)),
        gapAbovePin: T - lowest
      };
    }, [b64, locs.length > 2 ? 330 : locs.length > 1 ? 290 : 250]);
    await ctx.close(); return m;
  }
  const LONG = 'Nieuwbouw woonwijk Zuidpoort fase 2 kavel 14 t/m 22';
  const l40 = 'Poort noord met slagboom en portier 4821';   // 40 tekens
  const addr = (n) => 'Burgemeester Oudelandselaan ' + n + ', 2651 AB Berkel en Rodenrijs';

  let m = await render(['51.995961, 4.476169'], [l40], [addr(1)], LONG);
  ok(m.barSides <= 14 && m.barBottom <= 14 && m.mapSides <= 14, 'één locatie, lange teksten: niets tegen de rand (zijkant balk ' + m.barSides + ', onderkant ' + m.barBottom + ', kaart ' + m.mapSides + ')');
  m = await render(['51.9960, 4.4730', '51.9962, 4.4830'], [l40, l40], [addr(1), addr(2)], LONG);
  ok(m.barSides <= 14 && m.barBottom <= 14 && m.mapSides <= 14, 'twee locaties ver uit elkaar met lange labels: niets tegen de rand (' + m.barSides + ', ' + m.barBottom + ', ' + m.mapSides + ')');
  ok(m.gapAbovePin >= 50, 'twee locaties: de pinpunten staan minstens 50 px boven de balk (' + m.gapAbovePin + ')');
  m = await render(['51.9960, 4.4730', '51.9975, 4.4780', '51.9962, 4.4830'], [l40, l40, l40], [addr(1), addr(2), addr(3)], LONG);
  ok(m.barSides <= 14 && m.barBottom <= 14 && m.mapSides <= 14, 'drie locaties ver uit elkaar met lange labels en adressen: niets tegen de rand (' + m.barSides + ', ' + m.barBottom + ', ' + m.mapSides + ')');
  ok(m.gapAbovePin >= 50, 'drie locaties (hogere balk): de pinpunten staan minstens 50 px boven de balk (' + m.gapAbovePin + ')');
  // jouw situatie: pin 2 en 3 dicht onder elkaar, pin 1 ver links; het label van pin 3 mag pin 2 niet afdekken
  m = await render(['51.82654, 4.80650', '51.82744, 4.81670', '51.82644, 4.81710'], ['Inrit Schapendrift', 'Directiekeet', 'Inrit Goudreinet'], ['Aan de Schapedrift ter hoogte van Moerbei', 'Naast Kleipeer 22', 'Nabij Kleipeer 24'], 'BRM Ons Dorp');
  ok(m.areas.length === 3 && Math.min.apply(null, m.areas) >= 0.7 * Math.max.apply(null, m.areas), 'geen enkele pin is afgedekt door een label (oppervlakten ' + m.areas.join(', ') + ')');
  ok(m.creditDev <= 14, 'geen bronvermelding meer rechtsonder in de afbeelding (afwijking ' + m.creditDev + ')');
  ok(m.barSides <= 14 && m.barBottom <= 14 && m.mapSides <= 14 && m.gapAbovePin >= 50, 'ook hier marges in orde (' + m.barSides + ', ' + m.barBottom + ', ' + m.mapSides + ', ' + m.gapAbovePin + ')');
  await b.close();
})();
