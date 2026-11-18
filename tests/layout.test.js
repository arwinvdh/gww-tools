// Locatie delen en Route knijperwagen op smalle telefoons: geen zijwaartse scroll, tikdoelen, balkhoogte, recente projecten.
const { chromium, launchOptions, offlinePage, ok, ROOT } = require('./helpers.js');
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
      if (file === 'route.html') {
        const inside = await p.evaluate(() => { const c = document.querySelector('.card').getBoundingClientRect(); return [...document.querySelectorAll('.r-dn .inp')].filter(e => e.offsetParent).every(e => { const b = e.getBoundingClientRect(); return b.left >= c.left - 0.5 && b.right <= c.right + 0.5; }); });
        ok(inside, `${file} op ${name}: datum- en opmerkingveld blijven binnen de kaart`);
      }
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

// --- CSS-structuur (shared.css + lagen) ---
(async () => {
  const b = await chromium.launch(launchOptions());
  // desktop: de actiebalk van Locatie delen heeft vier kolommen op één rij
  let p = await offlinePage(b, { viewport: { width: 1180, height: 900 } }, 'index.html');
  await p.fill('#q', '51.995961, 4.476169'); await p.click('#go'); await p.waitForTimeout(500);
  const tops = await p.evaluate(() => ['img', 'dl', 'wa', 'copy'].map(id => Math.round(document.getElementById(id).getBoundingClientRect().top)));
  ok(new Set(tops).size === 1, 'desktop: actiebalk staat op één rij (' + tops.join(',') + ')');
  // toetsenbordfocus: duidelijke outline op invoervelden
  await p.keyboard.press('Tab'); await p.focus('#q');
  const ol = await p.evaluate(() => { const c = getComputedStyle(document.getElementById('q')); return [c.outlineStyle, c.outlineWidth]; });
  ok(ol[0] === 'solid' && ol[1] === '2px', 'focusring op invoerveld is een outline van 2px (' + ol.join(' ') + ')');
  // melding staat gecentreerd, ook na de animatie
  await p.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { message: 'test' }))); await p.waitForTimeout(600);
  const c = await p.evaluate(() => { const r = document.getElementById('toast').getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(innerWidth / 2)]; });
  ok(Math.abs(c[0] - c[1]) <= 2, 'melding staat gecentreerd (' + c.join(' vs ') + ')');
  await p.context().close();
  // weinig beweging: bezig-knop blijft leesbaar en geen soepel scrollen
  const ctx = await b.newContext({ ...require('playwright').devices['iPhone 13'], reducedMotion: 'reduce' });
  p = await ctx.newPage(); await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
  await p.goto(ROOT + 'index.html'); await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('go').classList.add('busy'));
  const busy = await p.evaluate(() => { const g = document.getElementById('go'); return [getComputedStyle(g).color, getComputedStyle(g, '::after').display]; });
  ok(busy[0] !== 'rgba(0, 0, 0, 0)' && busy[1] === 'none', 'minder beweging: bezig-knop houdt leesbaar label (' + busy.join(' | ') + ')');
  // vaste lagen: shared.css is geladen
  ok(await p.evaluate(() => [...document.styleSheets].some(s => /shared\.css$/.test(s.href || ''))), 'shared.css is geladen');
  await b.close();
})();
