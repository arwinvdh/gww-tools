// Startpagina: tegels naar de tools, manifest en offline.
const { chromium, launchOptions, offlinePage, ok, ROOT, LEAFLET_JS, LEAFLET_CSS } = require('./helpers.js');
const { devices } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch(launchOptions());
  for (const [name, dev] of [['iPhone SE', devices['iPhone SE']], ['iPhone 13', devices['iPhone 13']], ['desktop', { viewport: { width: 1180, height: 900 } }]]) {
    const p = await offlinePage(b, dev, 'start.html');
    const r = await p.evaluate(() => {
      const tiles = [...document.querySelectorAll('.tile')];
      return { hrefs: tiles.map(t => t.getAttribute('href')), heights: tiles.map(t => Math.round(t.getBoundingClientRect().height)),
        sw: document.scrollingElement.scrollWidth, vw: document.documentElement.clientWidth, title: document.title };
    });
    ok(r.hrefs.join() === 'index.html,route.html', `start op ${name}: tegels verwijzen naar beide tools (${r.hrefs.join(', ')})`);
    ok(r.heights.every(h => h >= 44), `start op ${name}: tegels minstens 44px hoog (${r.heights.join(', ')})`);
    ok(r.sw <= r.vw, `start op ${name}: geen zijwaartse scroll (${r.sw} van ${r.vw})`);
    ok(p.errs.length === 0, `start op ${name}: geen scriptfouten ${p.errs.join('|')}`);
    await p.context().close();
  }
  // recent: leest de bestaande opslag van de tools en verandert die niet
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
    await ctx.addInitScript(() => {
      if (!localStorage.getItem('locdelen.projects')) {
        localStorage.setItem('locdelen.projects', JSON.stringify([{ nr: '123', name: 'Testproject' }]));
        localStorage.setItem('knijperwagen-routes-v2', JSON.stringify({ '2026-11-20': { datum: '2026-11-20', stops: [{}, {}] } }));
      }
    });
    await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
    await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(ROOT + 'start.html'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({ shown: !document.getElementById('recentProjects').hidden && !document.getElementById('recentRoutes').hidden, items: [...document.querySelectorAll('#recentProjects a, #recentRoutes a')].map(a => a.textContent + '>' + a.getAttribute('href')),
      before: localStorage.getItem('locdelen.projects') }));
    ok(r.shown && r.items.length === 2 && r.items[0].startsWith('123 · Testproject') && r.items[1].startsWith('vr 20 nov') && r.items[1].includes('2 stops'), 'start: recent toont project en route uit de bestaande opslag (' + r.items.join(' | ') + ')');
    ok(r.before === JSON.stringify([{ nr: '123', name: 'Testproject' }]) && p.errs.length === 0, 'start: recent wijzigt de opslag niet en geeft geen scriptfouten');
    // een tik laadt het project of de route direct in de tool
    const links = await p.evaluate(() => [...document.querySelectorAll('#recentProjects a, #recentRoutes a')].map(a => a.getAttribute('href')));
    const pi = await ctx.newPage(); await pi.goto(ROOT + 'index.html' + links[0].replace('index.html', '')); await pi.waitForTimeout(800);
    const nm = await pi.evaluate(() => ({ nr: document.getElementById('nr').value, name: document.getElementById('name').value }));
    ok(nm.nr === '123' && nm.name === 'Testproject', 'start: tik op een recent project laadt het in Locatie delen (' + nm.nr + ' ' + nm.name + ')');
    const pr = await ctx.newPage(); await pr.goto(ROOT + 'route.html' + links[1].replace('route.html', '')); await pr.waitForTimeout(800);
    const rt = await pr.evaluate(() => ({ d: document.getElementById('datum').value, undo: document.getElementById('undo-label').textContent, hash: location.hash }));
    ok(rt.d === '2026-11-20' && /geopend/.test(rt.undo) && rt.hash === '', 'start: tik op een recente route opent die route in Route knijperwagen (' + rt.d + ', ' + rt.undo + ')');
    const empty = await b.newContext(); const pe = await empty.newPage(); await pe.goto(ROOT + 'start.html'); await pe.waitForTimeout(300);
    ok(await pe.evaluate(() => document.getElementById('recentProjects').hidden && document.getElementById('recentRoutes').hidden), 'start: zonder gegevens blijven de recent-blokken verborgen');
    await ctx.close(); await empty.close();
  }
  // manifest en bestanden die de service worker bewaart bestaan echt
  const root = path.resolve(__dirname, '..');
  const man = JSON.parse(fs.readFileSync(path.join(root, 'start.webmanifest'), 'utf8'));
  ok(man.start_url === 'start.html' && man.icons.every(i => fs.existsSync(path.join(root, i.src))), 'start.webmanifest: startpagina en iconen kloppen');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const local = [...sw.match(/const LOCAL = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]).filter(f => f !== './');
  const missing = local.filter(f => !fs.existsSync(path.join(root, f)));
  ok(missing.length === 0, 'service worker: alle bestanden in LOCAL bestaan (' + (missing.join(', ') || 'geen ontbrekend') + ')');
  ok(['start.html', 'start.webmanifest', 'shared.css'].every(f => local.includes(f)), 'service worker bewaart start.html, manifest en shared.css');
  // links terug naar de startpagina in beide tools
  for (const f of ['index.html', 'route.html']) ok(fs.readFileSync(path.join(root, f), 'utf8').includes('href="start.html"'), `${f}: link "Alle tools" naar de startpagina`);
  // visiepagina: bestaat, staat in de service worker, bereikbaar vanaf start, geen zijwaartse scroll
  ok(local.includes('visie.html'), 'service worker bewaart visie.html');
  ok(fs.readFileSync(path.join(root, 'start.html'), 'utf8').includes('href="visie.html"'), 'start.html: link naar visie.html');
  for (const [name, dev] of [['iPhone SE', devices['iPhone SE']], ['desktop', { viewport: { width: 1180, height: 900 } }]]) {
    const p = await offlinePage(b, dev, 'visie.html');
    const r = await p.evaluate(() => ({ sw: document.scrollingElement.scrollWidth, vw: document.documentElement.clientWidth, h1: document.querySelector('h1').textContent }));
    ok(r.sw <= r.vw, `visie op ${name}: geen zijwaartse scroll (${r.sw} van ${r.vw})`);
    ok(p.errs.length === 0, `visie op ${name}: geen scriptfouten`);
    await p.context().close();
  }
  await b.close();
})();
