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
  // desktop: kaart links blijft in beeld bij scrollen, project en bericht staan rechts; mobiel blijft onder elkaar
  {
    const q = await p.evaluate(() => { const m = document.querySelector('.mapcol'), pr = document.getElementById('card-project'); return { sticky: getComputedStyle(m).position, mapLeft: Math.round(document.getElementById('map').getBoundingClientRect().left), projLeft: Math.round(pr.getBoundingClientRect().left) }; });
    ok(q.sticky === 'sticky' && q.mapLeft < q.projLeft, 'desktop: kaart staat links vast en project rechts (' + q.sticky + ', ' + q.mapLeft + ' < ' + q.projLeft + ')');
    const hh = await p.evaluate(() => { const m = document.querySelector('.mapcol').getBoundingClientRect(), bar = document.querySelector('.bar').getBoundingClientRect(); return [Math.round(m.bottom), Math.round(bar.top)]; });
    ok(hh[0] <= hh[1], 'desktop: de vaste kaartkolom eindigt boven de actiebalk (' + hh.join(' <= ') + ')');
    const m = await offlinePage(b, devices['iPhone 13'], 'index.html');
    const mm = await m.evaluate(() => ({ sticky: getComputedStyle(document.querySelector('.mapcol')).position, order: ['map', 'card-project'].map(id => Math.round(document.getElementById(id).getBoundingClientRect().top)) }));
    ok(mm.sticky === 'static' && mm.order[0] < mm.order[1], 'mobiel: kaart boven project, niets vast (' + mm.sticky + ')');
    await m.context().close();
  }
  // toetsenbordfocus: duidelijke outline op invoervelden
  await p.keyboard.press('Tab'); await p.focus('#q');
  const ol = await p.evaluate(() => { const c = getComputedStyle(document.getElementById('q')); return [c.outlineStyle, c.outlineWidth]; });
  ok(ol[0] === 'solid' && ol[1] === '2px', 'focusring op invoerveld is een outline van 2px (' + ol.join(' ') + ')');
  // melding staat gecentreerd, ook na de animatie
  await p.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { message: 'test' })));
  // meten in de pagina zelf na de animatie: een wachttijd vanuit de test kan onder belasting te lang duren, en dan is de melding al weg
  const c = await p.evaluate(() => new Promise(res => setTimeout(() => { const r = document.getElementById('toast').getBoundingClientRect(); res([Math.round(r.left + r.width / 2), Math.round(innerWidth / 2)]); }, 450)));
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

// --- Ontwerpronde: breed scherm, zoekbalk, actiebalk, tikvlakken, geen intreeanimatie ---
(async () => {
  const b = await chromium.launch(launchOptions());
  // onderbalk: op breed scherm staan de tabs gegroepeerd in het midden en niet over de hele breedte uitgerekt
  for (const w of [768, 1024, 1440]) {
    const p = await offlinePage(b, { viewport: { width: w, height: 900 } }, 'start.html');
    const r = await p.evaluate(() => { const a = [...document.querySelectorAll('.appnav a')].map(e => e.getBoundingClientRect()); return { max: Math.round(Math.max(...a.map(x => x.width))), left: Math.round(a[0].left), right: Math.round(innerWidth - a[a.length - 1].right) }; });
    ok(r.max <= 129 && Math.abs(r.left - r.right) <= 2, `onderbalk op ${w}px: tabs hoogstens 8rem breed en gecentreerd (${r.max}px, ${r.left}/${r.right})`);
    await p.context().close();
  }
  // Locatie delen: zoekveld heeft op elke breedte een bruikbare breedte (niet platgedrukt door de knoppen ernaast)
  for (const w of [375, 390, 430, 768, 1024, 1440]) {
    const p = await offlinePage(b, { viewport: { width: w, height: 900 }, hasTouch: w < 768, isMobile: w < 768 }, 'index.html');
    const r = await p.evaluate(() => { const q = document.getElementById('q').getBoundingClientRect(), g = document.getElementById('go').getBoundingClientRect(), m = document.getElementById('me').getBoundingClientRect(); return { qw: Math.round(q.width), qBelow: g.top >= q.bottom - 1, meH: Math.round(m.height) }; });
    ok(r.qw >= 250 && r.qBelow, `Locatie delen op ${w}px: zoekveld op eigen rij en minstens 250px (${r.qw}px)`);
    ok(r.meH <= 60, `Locatie delen op ${w}px: Mijn locatie blijft op één regel (${r.meH}px hoog)`);
    // knoppenlabels in de actiebalk: minstens 12px en op één regel
    const l = await p.evaluate(() => [...document.querySelectorAll('.ibtn .lbl')].filter(e => e.offsetParent).map(e => ({ fs: parseFloat(getComputedStyle(e).fontSize), lines: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight || 14)) })));
    ok(l.length > 0 && l.every(x => x.fs >= 12), `Locatie delen op ${w}px: labels in de actiebalk minstens 12px (${l.map(x => x.fs).join(',')})`);
    await p.context().close();
  }
  // desktop: actiebalk-labels breken niet af
  { const p = await offlinePage(b, { viewport: { width: 1440, height: 900 } }, 'index.html');
    const h = await p.evaluate(() => ['dl', 'wa', 'copy'].map(id => Math.round(document.getElementById(id).getBoundingClientRect().height)));
    ok(h.every(x => x <= 60), 'desktop: knoppen in de actiebalk zijn één regel hoog (' + h.join(',') + ')');
    // kaarten verschijnen direct, zonder intreeanimatie
    const an = await p.evaluate(() => getComputedStyle(document.querySelector('.card')).animationName);
    ok(an === 'none', 'kaarten hebben geen intreeanimatie (' + an + ')');
    await p.context().close(); }
  // startpagina: losse links in het koppelblok zijn minstens 44px hoog; de uitklapper in het syncblok ook
  for (const w of [375, 1024]) {
    const p = await offlinePage(b, { viewport: { width: w, height: 800 }, hasTouch: w < 768, isMobile: w < 768 }, 'start.html');
    const r = await p.evaluate(() => ({ links: [...document.querySelectorAll('.linkrow a')].map(e => Math.round(e.getBoundingClientRect().height)), sum: Math.round(document.querySelector('.gh-box summary').getBoundingClientRect().height) }));
    ok(r.links.length === 2 && r.links.every(x => x >= 44) && r.sum >= 44, `start op ${w}px: links en uitklapper minstens 44px hoog (${r.links.join(',')} / ${r.sum})`);
    await p.context().close();
  }
  await b.close();
})();

// Project-venster: Opslaan is de hoofdactie, de links naar de tools zijn secundair
(async () => {
  const b = await chromium.launch(launchOptions());
  const p = await offlinePage(b, devices['iPhone 13'], 'projecten.html');
  await p.evaluate(() => localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: '25-001', name: 'Testproject', created: 1, modified: 1 }])));
  await p.reload(); await p.waitForTimeout(500);
  await p.click('text=25-001'); await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({ save: document.getElementById('esave').classList.contains('primary'), launch: ['goLoc', 'goRoute', 'goLog'].some(i => document.getElementById(i).classList.contains('primary')), sw: document.scrollingElement.scrollWidth <= document.documentElement.clientWidth }));
  ok(r.save && !r.launch && r.sw, 'project-venster: Opslaan is primair, de tool-links zijn secundair, geen zijwaartse scroll');
  ok(p.errs.length === 0, 'project-venster: geen scriptfouten ' + p.errs.join('|'));
  await b.close();
})();
