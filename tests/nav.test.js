// Onderbalk (nav.js): Home en een knop per tool, juiste knop actief, niets wordt erdoor bedekt.
const { chromium, launchOptions, offlinePage, ok } = require('./helpers.js');
(async () => {
  const b = await chromium.launch(launchOptions());
  const want = { 'start.html': 'Home', 'index.html': 'Locatie', 'route.html': 'Route' };
  for (const f of Object.keys(want)) {
    const p = await offlinePage(b, { viewport: { width: 390, height: 800 } }, f);
    const r = await p.evaluate(() => {
      const nav = document.querySelector('nav.appnav');
      const links = nav ? [...nav.querySelectorAll('a')] : [];
      const bar = document.querySelector('.bar'), n = nav && nav.getBoundingClientRect();
      return { labels: links.map(a => a.textContent), hrefs: links.map(a => a.getAttribute('href')),
        current: links.filter(a => a.getAttribute('aria-current') === 'page').map(a => a.textContent),
        minH: Math.min(...links.map(a => a.getBoundingClientRect().height)),
        barOk: !bar || (bar.getBoundingClientRect().bottom <= n.top + 1), sw: document.scrollingElement.scrollWidth, vw: document.documentElement.clientWidth };
    });
    ok(r.hrefs.join() === 'start.html,index.html,route.html' && r.labels.join() === 'Home,Locatie,Route', `${f}: onderbalk met Home, Locatie en Route (${r.labels.join(', ')})`);
    ok(r.current.join() === want[f], `${f}: alleen ${want[f]} is actief (${r.current.join(', ')})`);
    ok(r.minH >= 44, `${f}: knoppen van de onderbalk minstens 44px hoog (${Math.round(r.minH)})`);
    ok(r.barOk, `${f}: de actiebalk staat boven de onderbalk`);
    ok(r.sw <= r.vw && p.errs.length === 0, `${f}: geen zijwaartse scroll en geen scriptfouten ${p.errs.join('|')}`);
    const hasBack = await p.evaluate(() => !!document.querySelector('.brand .back'));
    ok(hasBack === (f !== 'start.html'), `${f}: terugknop ${f === 'start.html' ? 'ontbreekt' : 'staat'} in de kop`);
    if (f !== 'start.html') {
      // zoals in gebruik: eerst vanaf Home naar de tool, dan terug
      await p.goto(p.url().replace(/[^/]*$/, 'start.html')); await p.waitForTimeout(300);
      await p.click(`.appnav a[href="${f}"]`); await p.waitForTimeout(500);
      await p.click('.brand .back'); await p.waitForTimeout(500);
      ok(/start\.html$/.test(p.url()), `${f}: terugknop gaat terug naar de vorige pagina (${p.url().split('/').pop()})`);
    }
    await p.context().close();
  }
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
