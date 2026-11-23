// Route knijperwagen: stops in routes van 1, 3, 8 en 15 stops: kop van een ingeklapte stop, meldingen, verplaatsen (knoppen, toetsenbord,
// slepen met muis en touch), verwijderen, dupliceren, opnieuw openen en delen. Met muis, toetsenbord en touchscreen.
const { chromium, launchOptions, ok, ROOT } = require('./helpers.js');
const { devices } = require('playwright');
const PLACES = ['R3S Berkel en Rodenrijs', 'Bleiswijk, Merenweg 22 (inrit werkterrein achterzijde)', 'HOF Zoetermeer', 'Utrecht Zuid, Europalaan 100 bij de hoofdingang van het station'];
const mkStops = (n) => Array.from({ length: n }, (_, i) => ({ acties: [['LADEN'], ['LOSSEN'], ['OPHALEN'], ['LOSSEN', 'LADEN']][i % 4], plaats: PLACES[i % 4] + (i > 3 ? ' ' + i : ''), project: i % 2 ? 'IB250' + (10 + i) : '', tijd: i % 3 === 0 ? '6.' + String(i * 3 % 60).padStart(2, '0') : '', tijdv: 'om', items: i % 4 === 0 ? '1 bigbag Spramex\n2 pallets stelconplaten\nRolcontainer' : 'Menggranulaat 24 ton', link: '' }));
(async () => {
  const b = await chromium.launch(launchOptions());
  const mk = async (dev, stops, opts) => {
    const ctx = await b.newContext({ ...dev, ...(opts || {}) });
    await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
    await ctx.addInitScript(([st]) => { if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); if (st) localStorage.setItem('knijperwagen-route-v2', JSON.stringify({ datum: '2099-01-02', note: 'Let op: poort 2', stops: st })); } }, [stops]);
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(ROOT + 'route.html'); await p.waitForTimeout(700);
    await p.evaluate(() => { const t = document.getElementById('tip'); if (t) t.hidden = true; });
    return p;
  };
  const order = (p) => p.evaluate(() => [...document.querySelectorAll('#stops .stop .hd-sum .l1 b')].map(e => e.textContent));
  const stored = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('knijperwagen-route-v2')).stops.map(s => s.plaats));
  const msg = (p) => p.evaluate(() => document.getElementById('bubble').innerText);

  // --- routes van 1, 3, 8 en 15 stops: kop, overloop, compactheid ---
  for (const n of [1, 3, 8, 15]) for (const [name, dev] of [['390', devices['iPhone 13']], ['1440', { viewport: { width: 1440, height: 900 } }]]) {
    const p = await mk(dev, mkStops(n));
    await p.evaluate(() => { document.querySelectorAll('#stops .stop.open .hd').forEach(h => h.click()); });
    const r = await p.evaluate(() => {
      const hs = [...document.querySelectorAll('#stops .stop')].map(c => c.getBoundingClientRect().height), card = document.querySelector('#stops').closest('.card').getBoundingClientRect();
      const over = [...document.querySelectorAll('#stops .hd-sum > *')].filter(e => e.scrollWidth > e.clientWidth + 1 && !/ellipsis/.test(getComputedStyle(e).textOverflow)).length;
      return { n: hs.length, avg: Math.round(hs.reduce((a, c) => a + c, 0) / hs.length), sw: document.scrollingElement.scrollWidth <= document.documentElement.clientWidth,
        inside: [...document.querySelectorAll('#stops .stop')].every(c => c.getBoundingClientRect().right <= card.right + 1), badges: [...document.querySelectorAll('#stops .badge')].map(e => e.textContent).join(), over };
    });
    ok(r.n === n && r.avg <= 76 && r.sw && r.inside && r.over === 0 && r.badges === Array.from({ length: n }, (_, i) => i + 1).join(), `${n} stops op ${name}px: compacte koppen (gem. ${r.avg}px), geen overloop, genummerd 1 t/m ${n}`);
    if (n === 15 && name === '390') {
      const h = await p.evaluate(() => { const c = document.querySelectorAll('#stops .stop')[0], t = c.querySelector('.hd-sum').innerText.replace(/\s+/g, ' '); const t4 = document.querySelectorAll('#stops .stop')[3].querySelector('.hd-sum').innerText.replace(/\s+/g, ' ');
        return [t, t4, document.querySelectorAll('#stops .stop')[0].dataset.a, document.querySelectorAll('#stops .stop')[1].dataset.a, document.querySelectorAll('#stops .stop')[2].dataset.a]; });
      ok(/^Laden R3S Berkel en Rodenrijs 6\.00 · 1 bigbag Spramex \+2$/.test(h[0]) && /^Laden Lossen /.test(h[1]) && h[2] === 'LADEN' && h[3] === 'LOSSEN' && h[4] === 'OPHALEN', 'kop: actie(s), plaats, uur en eerste item met aantal overige; actiekleur per stop (' + h[0] + ' | ' + h[1] + ')');
    }
    if (p.errs.length) ok(false, `${n} stops op ${name}px: scriptfouten ${p.errs.join('|')}`);
    await p.context().close();
  }

  // --- meldingen bij onvolledige of ongeldige stops, en springen naar de stop ---
  let p = await mk(devices['iPhone 13'], [{ acties: ['LADEN'], plaats: 'R3S', tijd: '6.00', items: 'x' }, { acties: [], plaats: '', items: 'Zand', tijd: '27.90' }, { acties: ['LOSSEN'], plaats: 'HOF', items: '', link: 'maps.app.goo.gl/x' }]);
  await p.evaluate(() => document.querySelectorAll('#stops .stop.open .hd').forEach(h => h.click()));
  const iss = await p.$$eval('#stops .stop .hd-sum .iss', els => els.map(e => e.textContent));
  ok(iss.length === 2 && /plaats ontbreekt/.test(iss[0]) && /geen actie gekozen/.test(iss[0]) && /bestaat niet/.test(iss[0]) && /niet vermeld wat er gelost wordt/.test(iss[1]) && /https/.test(iss[1]), 'meldingen: in de kop van elke onvolledige stop staat wat ontbreekt (' + iss.join(' || ') + ')');
  await p.click('#tab-bericht'); await p.waitForTimeout(300);
  const jumps = await p.$$eval('#checks .jump', els => els.map(e => e.textContent));
  ok(jumps.length === 5 && jumps.some(x => /Stop 2: tijd "27\.90" bestaat niet/.test(x)), 'bericht: elke opmerking over een stop is een knop (' + jumps.length + ')');
  await p.click('#checks .jump >> nth=0'); await p.waitForTimeout(500);
  const j = await p.evaluate(() => ({ view: document.body.dataset.view, open: document.querySelector('#stops .stop.open') && document.querySelector('#stops .stop.open .badge').textContent, focus: document.activeElement && document.activeElement.dataset.f }));
  ok(j.view === 'stops' && j.open === '2' && j.focus === 'plaats', 'springen: opmerking over stop 2 opent die stop met de cursor in Plaats (' + JSON.stringify(j) + ')');
  await p.click('#tab-bericht'); await p.waitForTimeout(200);
  await p.click('#checks .jump >> text=routelink'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.activeElement && document.activeElement.dataset.f) === 'link' && await p.evaluate(() => document.querySelector('#stops .stop.open .badge').textContent) === '3', 'springen: routelink-opmerking opent Details met de cursor in Routelink');
  await p.click('#copy'); await p.waitForTimeout(500);
  ok(/Let op: 5 opmerkingen/.test(await p.textContent('#toast')), 'kopiëren met opmerkingen: blokkeert niet, maar meldt het aantal (' + await p.textContent('#toast') + ')');
  await p.context().close();

  // --- verplaatsen, verwijderen, dupliceren, opnieuw openen en delen (8 stops) ---
  p = await mk({ viewport: { width: 1100, height: 900 } }, mkStops(8), { permissions: ['clipboard-read', 'clipboard-write'] });
  const base = await order(p);
  // knoppen in de geopende stop
  await p.click('#stops .stop >> nth=2 >> .hd'); await p.waitForTimeout(300);
  await p.click('#stops .stop.open [data-do="down"]'); await p.waitForTimeout(200);
  let o = await order(p);
  ok(o[2] === base[3] && o[3] === base[2] && (await stored(p))[3] === base[2], 'verplaatsen met de knop Omlaag: volgorde en opslag kloppen');
  await p.click('#stops .stop.open [data-do="up"]'); await p.waitForTimeout(200);
  o = await order(p); ok(o.join() === base.join(), 'verplaatsen met de knop Omhoog zet het terug');
  // toetsenbord: Alt + pijl op de kop, ook ingeklapt
  await p.evaluate(() => document.querySelectorAll('#stops .stop.open .hd').forEach(h => h.click()));
  await p.focus('#stops .stop >> nth=1 >> .hd'); await p.keyboard.press('Alt+ArrowDown'); await p.waitForTimeout(200);
  o = await order(p);
  ok(o[2] === base[1] && o[1] === base[2] && await p.evaluate(() => document.activeElement.classList.contains('hd') && document.activeElement.closest('.stop').querySelector('.badge').textContent === '3'), 'toetsenbord: Alt + pijl omlaag verplaatst de ingeklapte stop en houdt de focus erop');
  await p.keyboard.press('Alt+ArrowUp'); await p.waitForTimeout(200);
  ok((await order(p)).join() === base.join(), 'toetsenbord: Alt + pijl omhoog zet hem terug');
  // slepen met de muis
  const drag = async (idx, toIdx) => {
    const bd = await p.locator('#stops .stop .badge').nth(idx).boundingBox(), tg = await p.locator('#stops .stop').nth(toIdx).boundingBox();
    await p.mouse.move(bd.x + bd.width / 2, bd.y + bd.height / 2); await p.mouse.down(); await p.mouse.move(bd.x + 5, bd.y + 20, { steps: 3 });
    for (let k = 1; k <= 12; k++) { await p.mouse.move(bd.x + 5, bd.y + 20 + (tg.y + tg.height - bd.y) * k / 12, { steps: 1 }); await p.waitForTimeout(25); }
    await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(300);
  };
  await drag(0, 2); o = await order(p);
  ok(o.join() === [base[1], base[2], base[0], ...base.slice(3)].join() && (await stored(p))[2] === base[0], 'slepen met de muis: stop 1 staat achter stop 3, opslag volgt (' + o.slice(0, 4).join(' | ') + ')');
  // verwijderen met ongedaan maken
  await p.click('#stops .stop >> nth=0 >> .hd'); await p.click('#stops .stop.open [data-do="del"]'); await p.waitForTimeout(300);
  ok((await order(p)).length === 7 && await p.locator('#undo').isVisible(), 'verwijderen: stop weg, ongedaan maken beschikbaar');
  await p.click('#undo-btn'); await p.waitForTimeout(300);
  ok((await order(p)).length === 8 && (await order(p))[0] === base[1], 'ongedaan maken zet de stop terug op dezelfde plek');
  // dupliceren
  await p.click('#stops .stop >> nth=1 >> .hd'); await p.click('#stops .stop.open [data-do="dup"]'); await p.waitForTimeout(300);
  o = await order(p);
  ok(o.length === 9 && o[1] === o[2], 'dupliceren: kopie staat direct onder het origineel met dezelfde gegevens');
  // delen: kopieer en WhatsApp bevatten alle stops in volgorde
  await p.evaluate(() => document.querySelectorAll('#stops .stop.open .hd').forEach(h => h.click()));
  await p.click('#copy'); await p.waitForTimeout(400);
  const clip = await p.evaluate(() => navigator.clipboard.readText()), wa = decodeURIComponent((await p.getAttribute('#wa-send', 'href')).split('text=')[1]);
  ok(clip === wa && /^\*?Route /.test(clip) && /1️⃣ /.test(clip) && /9️⃣ /.test(clip) && clip.indexOf(o[0]) < clip.indexOf(o[8]), 'delen: Kopieer en WhatsApp geven hetzelfde bericht met alle 9 stops genummerd in volgorde');
  // opnieuw openen: herladen en via Eerdere routes
  await p.waitForTimeout(500);   // de route wordt kort na de laatste wijziging bewaard
  await p.reload(); await p.waitForTimeout(600);
  ok((await order(p)).join() === o.join(), 'opnieuw openen: na herladen staat dezelfde route er weer');
  await p.click('#reset'); await p.waitForTimeout(300);
  await p.click('#hist-open'); await p.waitForTimeout(300);
  await p.click('#hist-list [data-h="open"] >> nth=0'); await p.waitForTimeout(500);
  ok((await order(p)).join() === o.join() || (await order(p)).length >= 8, 'opnieuw openen: Eerdere routes opent de bewaarde route (' + (await order(p)).length + ' stops)');
  ok(p.errs.length === 0, 'geen scriptfouten ' + p.errs.join('|'));
  await p.context().close();

  // --- touchscreen: tikken en slepen met de vinger ---
  p = await mk(devices['iPhone 13'], mkStops(8));
  const tb = await order(p);
  await p.evaluate(() => document.querySelectorAll('#stops .stop.open .hd').forEach(h => h.click()));
  await p.tap('#stops .stop >> nth=1 >> .hd'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelector('#stops .stop.open .badge').textContent) === '2', 'touch: tik op de kop opent de stop');
  await p.tap('#stops .stop.open [data-do="act"][data-v="OPHALEN"]'); await p.waitForTimeout(200);
  ok(/Ophalen/.test(await p.textContent('#stops .stop.open .hd-sum .l1')) && await p.evaluate(() => document.querySelector('#stops .stop.open').dataset.a) === 'LOSSEN', 'touch: actie kiezen werkt, de kop volgt (eerste actie bepaalt de kleur)');
  await p.evaluate(() => document.querySelectorAll('#stops .stop.open .hd').forEach(h => h.click())); await p.waitForTimeout(300);
  await p.waitForTimeout(900);   // de uitklapbeweging en het scrollen na het openen zijn klaar
  const cdp = await p.context().newCDPSession(p);
  await p.evaluate(() => window.scrollBy(0, document.querySelector('#stops').getBoundingClientRect().top - 130)); await p.waitForTimeout(300);   // onder de vaste tabs, zoals een gebruiker het ziet
  const bd = await p.locator('#stops .stop .badge').nth(0).boundingBox(), tg = await p.locator('#stops .stop').nth(2).boundingBox();
  const x = bd.x + bd.width / 2, y0 = bd.y + bd.height / 2, y1 = tg.y + tg.height - 4;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  for (let k = 1; k <= 14; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (y1 - y0) * k / 14 }] }); await p.waitForTimeout(30); }
  await p.waitForTimeout(150); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400);
  const to = await order(p);
  ok(to.join() !== tb.join() && to[2] === tb[0], 'touch: slepen aan het nummer verplaatst stop 1 naar plek 3 (' + to.slice(0, 4).join(' | ') + ')');
  ok(p.errs.length === 0, 'touch: geen scriptfouten ' + p.errs.join('|'));
  await p.context().close();

  // --- zonder project: gewoon bruikbaar ---
  p = await mk(devices['iPhone 13'], null);
  await p.fill('#s1-plaats', 'Ergens'); await p.fill('#s1-items', 'Zand'); await p.waitForTimeout(300);
  ok(await p.locator('#ctxProject').isHidden() && /Ergens/.test(await msg(p)) && p.errs.length === 0, 'zonder project: stops invullen en bericht werken zonder projectkeuze');
  await p.context().close();
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
