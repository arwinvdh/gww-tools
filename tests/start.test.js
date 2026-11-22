// Startpagina: tegels naar de tools, manifest en offline.
const { chromium, launchOptions, offlinePage, ok, ROOT } = require('./helpers.js');
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
