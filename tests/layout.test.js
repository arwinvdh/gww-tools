// Locatie delen en Route knijperwagen op smalle telefoons: geen zijwaartse scroll, tikdoelen, balkhoogte, recente projecten.
const { chromium, launchOptions, offlinePage, ok } = require('./helpers.js');
const { devices } = require('playwright');
(async () => {
  const b = await chromium.launch(launchOptions());
  for (const name of ['iPhone SE', 'iPhone 13']) {
    for (const file of ['index.html', 'route.html']) {
      const p = await offlinePage(b, devices[name], file);
      if (file === 'index.html') { await p.fill('#q', '51.995961, 4.476169'); await p.click('#go'); await p.waitForTimeout(500); await p.evaluate(() => { document.getElementById('imgopts').open = true; document.getElementById('more').open = true; }); }
      else { await p.fill('#s1-plaats', 'R3S'); await p.fill('#s1-items', '1 bigbag Spramex'); await p.waitForTimeout(300); }
      const r = await p.evaluate(() => {
        const vw = document.documentElement.clientWidth, sw = document.scrollingElement.scrollWidth;
        const small = [];
        document.querySelectorAll('button, a.copy, .ico, select, input:not([type=checkbox])').forEach(e => {
          if (!e.offsetParent || e.id === 'meta') return;
          const b = e.getBoundingClientRect(); if (b.height < 43.5) small.push((e.id || e.className || e.textContent.trim().slice(0, 14)) + ' ' + Math.round(b.height));
        });
        const bar = document.querySelector('.bar, .bar-stack'); const bh = bar ? Math.round(bar.getBoundingClientRect().height) : 0;
        return { vw, sw, small, bh };
      });
      ok(r.sw <= r.vw, `${file} op ${name}: geen zijwaartse scroll (${r.sw} van ${r.vw})`);
      ok(r.small.length === 0, `${file} op ${name}: alle knoppen minstens 44px hoog ${r.small.join(', ')}`);
      if (file === 'index.html') ok(r.bh <= 80, `${file} op ${name}: actiebalk hoogstens 80px (${r.bh})`);
      ok(p.errs.length === 0, `${file} op ${name}: geen scriptfouten ${p.errs.join('|')}`);
      await p.context().close();
    }
  }
  // recente projecten
  const p = await offlinePage(b, devices['iPhone 13'], 'index.html');
  ok(await p.evaluate(() => document.getElementById('recent').hidden), 'recent: verborgen zonder projecten');
  for (const [c, n, nm] of [['51.995961, 4.476169', 'IB25060', 'HOF Berkel'], ['52.0907, 5.1214', 'IB24001', 'Utrecht Zuid']]) {
    await p.click('#new'); await p.fill('#q', c); await p.click('#go'); await p.waitForTimeout(400); await p.fill('#nr', n); await p.fill('#name', nm); await p.click('#wa'); await p.waitForTimeout(300);
  }
  await p.reload(); await p.waitForTimeout(600);
  await p.click('#chips .chip >> nth=1'); await p.waitForTimeout(500);
  ok(await p.inputValue('#nr') === 'IB25060' && await p.evaluate(() => document.querySelectorAll('#chips .chip')[1].getAttribute('aria-pressed') === 'true'), 'recent: tik laadt het project en markeert het');
  await b.close();
})();
