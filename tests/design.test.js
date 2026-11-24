// Ontwerpafspraken (DESIGN.md): gedeelde onderdelen staan in shared.css, geen losse waarden, contrast, focus, tikdoelen en geen overloop op zes breedtes.
const fs = require('fs'), path = require('path');
const { chromium, launchOptions, ok, ROOT, LEAFLET_JS, LEAFLET_CSS } = require('./helpers.js');
const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'route.html', 'projecten.html', 'logboek.html', 'start.html', 'vault.html', 'visie.html'];
const styleOf = (f) => { const m = fs.readFileSync(path.join(root, f), 'utf8').match(/<style>([\s\S]*?)<\/style>/); return m ? m[1].replace(/\/\*[\s\S]*?\*\//g, '') : ''; };
const shared = fs.readFileSync(path.join(root, 'shared.css'), 'utf8');

// --- statisch: het contract met shared.css ---
ok(['\\.callout \\{', '\\.chip \\{', '\\.sec \\{', '\\.check \\{', '\\.empty \\{', '--chip-h:', '--text-label:', '--radius-pill:'].every(r => new RegExp(r).test(shared)), 'shared.css bevat callout, chip, sec, check, empty en de ontwerpwaarden');
const dupes = [], literal = [], anims = [];
pages.forEach(f => {
  const css = styleOf(f);
  [/^\s*\.sec \{/m, /^\s*\.check \{/m, /^\s*\.list \{/m, /^\s*\.addrow \{/m, /^\s*\.callout/m, /^\s*\.chip\[aria-pressed/m].forEach(r => { if (r.test(css)) dupes.push(f + ' ' + r.source); });
  // een chip of lege toestand mag per pagina iets aanpassen (breedte, uitlijning), maar niet opnieuw opbouwen
  (css.match(/^\s*\.chip \{[^}]*\}/m) || []).forEach(x => { if (/border|background|min-height|padding/.test(x)) dupes.push(f + ' .chip opnieuw opgebouwd'); });
  (css.match(/^\s*\.empty \{[^}]*\}/m) || []).forEach(x => { if (!/text-align|padding/.test(x)) dupes.push(f + ' .empty'); });
  (css.match(/border-radius: (?:8|12|16|999)px/g) || []).forEach(x => literal.push(f + ' ' + x));
  (css.match(/animation: *[a-zA-Z]+/g) || []).forEach(x => { if (!/animation: *(spin|pop|riseX|none)/.test(x)) anims.push(f + ' ' + x); });
});
ok(dupes.length === 0, 'pagina\'s herdefiniëren geen gedeelde onderdelen (' + (dupes.join(', ') || 'geen') + ')');
ok(literal.length === 0, 'pagina\'s gebruiken de radius-variabelen, geen losse px (' + (literal.join(', ') || 'geen') + ')');
ok(anims.length === 0, 'pagina\'s hebben geen decoratieve animaties (' + (anims.join(', ') || 'geen') + ')');
const lb = fs.readFileSync(path.join(root, 'logboek.html'), 'utf8');
ok(lb.indexOf('id="wclose"') < lb.indexOf('id="wmake"') && lb.indexOf('id="pdel"') < lb.indexOf('id="pclose"') && lb.indexOf('id="pclose"') < lb.indexOf('id="psave"'), 'dialogen: gevaarlijk links, secundair, hoofdactie als laatste');

// --- rendering ---
const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); const dd = new Date(); const YD = iso(new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() - 1, 12));
const seed = ([Y]) => { if (localStorage.getItem('__s')) return; localStorage.setItem('__s', '1'); localStorage.setItem('knijperwagen-tipX', '1'); localStorage.setItem('start.tipX', '1');
  localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB25001', name: 'Reconstructie Zuidpoort', lat: 52.0907, lon: 5.1214, addr: 'Domplein 1, 3512 JC Utrecht', created: 1, modified: 3 }]));
  localStorage.setItem('locdelen.projects', JSON.stringify([{ nr: 'IB25001', name: 'Reconstructie Zuidpoort', lat: 52.0907, lon: 5.1214 }]));
  localStorage.setItem('knijperwagen-route-v2', JSON.stringify({ datum: '2099-01-02', stops: [{ acties: ['LADEN'], plaats: 'R3S', tijd: '6.00', items: '1 bigbag' }, { acties: [], plaats: '', items: 'Zand', tijd: '27.90' }] }));
  localStorage.setItem('gww.log', JSON.stringify([{ v: 1, id: 'l1', projectId: 'p1', date: Y, work: 'x', equipment: [], crew: [{ partner: 'B', count: 3, hours: 8 }], machines: [], stagnation: [{ cause: 'Weer', hours: 2 }], extra: { on: true, who: 'T', how: 'Mondeling', note: 'x' }, safety: { toolbox: true, lmra: true, incident: false, note: '' }, created: 5, modified: 1700000000000 }])); };
const check = () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
  const rgba = c => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); const p = g.getImageData(0, 0, 1, 1).data; return [p[0], p[1], p[2], p[3] / 255]; };
  const lum = ([r, gc, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(gc) + .0722 * f(b); };
  const over = (t, b) => { const a = t[3]; return [t[0] * a + b[0] * (1 - a), t[1] * a + b[1] * (1 - a), t[2] * a + b[2] * (1 - a), 1]; };
  const bgOf = e => { const ch = []; for (let n = e; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) ch.push(c); if (c[3] >= 1) break; } let b = [255, 255, 255, 1]; for (let i = ch.length - 1; i >= 0; i--) b = over(ch[i], b); return b; };
  const nm = e => (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : '') || e.tagName;
  const vis = e => { const b = e.getBoundingClientRect(), s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const low = [], small = [];
  document.querySelectorAll('body *').forEach(e => {
    if (!vis(e) || e.closest('.leaflet-container') || e.closest('dialog:not([open])') || e.closest('[hidden]')) return;
    if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !e.disabled && !e.closest('[disabled]') && !e.closest('.wait') && !e.closest('.wa-b')) {
      const s = getComputedStyle(e), bg = bgOf(e), fg = over(rgba(s.color), bg), L1 = lum(fg), L2 = lum(bg), r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05), fs = parseFloat(s.fontSize);
      if (r < ((fs >= 24 || (fs >= 18.66 && parseInt(s.fontWeight) >= 700)) ? 3 : 4.5)) low.push(nm(e) + ' ' + r.toFixed(2));
    }
    if (e.matches('button,a[href],select,input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]),summary,textarea') && !e.closest('.leaflet-control') && !e.closest('.pill') && !e.closest('.wa-b') && !(e.matches('a.lnk') && !e.closest('.linkrow')) && e.id !== 'meta' && !e.matches('[aria-hidden="true"]')) {   /* verborgen <select> achter de keuzeknoppen: de knoppen zijn de bediening */
      const b = e.getBoundingClientRect(); if (b.height < 43.5 || b.width < 43.5) small.push(nm(e) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
    }
  });
  return { low: [...new Set(low)], small: [...new Set(small)] };
};
(async () => {
  const b = await chromium.launch(launchOptions());
  const mk = async (w, coarse) => {
    const ctx = await b.newContext({ viewport: { width: w, height: coarse ? 800 : 900 }, hasTouch: coarse, isMobile: coarse, reducedMotion: 'no-preference' });
    await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
    await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
    await ctx.addInitScript(seed, [YD]);
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    return p;
  };
  const go = async (p, f) => { await p.goto(ROOT + f); await p.waitForTimeout(500); await p.evaluate(() => { const t = document.getElementById('tip'); if (t) t.hidden = true; }); };
  const states = [['start.html', null], ['index.html', async p => { await p.fill('#q', '52.0907, 5.1214'); await p.click('#go'); await p.waitForTimeout(400); }],
    ['route.html', async p => { await p.evaluate(() => document.querySelector('#stops .stop .hd').click()); await p.waitForTimeout(300); }], ['route.html', async p => { if (await p.locator('#tab-bericht').isVisible()) await p.click('#tab-bericht'); }],
    ['projecten.html', null], ['projecten.html', async p => { await p.click('.row[data-id="p1"]'); }], ['logboek.html', null], ['logboek.html#/p/p1', null], ['logboek.html#/p/p1/' + YD, null], ['vault.html', null], ['visie.html', null]];

  // contrast en tikdoelen op de telefoon
  let p = await mk(390, true);
  const bad = [];
  for (const [f, fn] of states) {
    await go(p, f); if (fn) await fn(p); await p.waitForTimeout(250);
    const r = await p.evaluate(check);
    if (r.low.length || r.small.length) bad.push(f + (fn ? '*' : '') + ' laag:[' + r.low + '] klein:[' + r.small + ']');
  }
  ok(bad.length === 0, 'telefoon: tekst minstens 4,5:1 contrast en alle bediening minstens 44px (' + (bad.join(' | ') || 'geen afwijkingen') + ')');
  // animaties: geen intreeanimatie op kaarten en dialogen
  await go(p, 'projecten.html'); await p.click('.row[data-id="p1"]'); await p.waitForTimeout(100);
  const an = await p.evaluate(() => [getComputedStyle(document.querySelector('.card')).animationName, getComputedStyle(document.querySelector('dialog[open]')).animationName]);
  ok(an.join() === 'none,none', 'kaarten en dialogen komen zonder animatie in beeld (' + an + ')');
  await p.context().close();

  // focus: met het toetsenbord is steeds zichtbaar waar je bent
  p = await mk(1024, false);
  const noRing = [];
  for (const f of ['start.html', 'index.html', 'route.html', 'projecten.html', 'logboek.html#/p/p1/' + YD]) {
    await go(p, f);
    for (let i = 0; i < 28; i++) {
      await p.keyboard.press('Tab');
      // een datumveld bestaat uit onderdelen die de browser zelf markeert: dat slaan we over
      const r = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body || e.closest('.leaflet-container') || e.type === 'checkbox' || e.type === 'date') return null; const s = getComputedStyle(e), pill = e.closest('.pill'), ps = pill && getComputedStyle(pill);
        const ring = (x) => x && x.outlineStyle !== 'none' && parseFloat(x.outlineWidth) >= 2; return { ok: ring(s) || ring(ps) || (e.matches('.hd') && ring(s)), name: (e.id || e.className || e.tagName).toString().slice(0, 30), dbg: [s.outlineStyle, s.outlineWidth, e.matches(':focus-visible')] }; });
      if (r && !r.ok) noRing.push(f.split('#')[0] + ' ' + r.name + ' ' + JSON.stringify(r.dbg));
    }
  }
  ok(noRing.length === 0, 'toetsenbordfocus: elk veld, elke knop en link krijgt een zichtbare ring van minstens 2px (' + ([...new Set(noRing)].join(', ') || 'geen afwijkingen') + ')');
  await p.context().close();

  // geen zijwaartse scroll en geen fouten op zes breedtes
  for (const w of [375, 390, 430, 768, 1024, 1440]) {
    p = await mk(w, w < 768);
    const over = [];
    for (const [f, fn] of states) {
      await go(p, f); if (fn) await fn(p); await p.waitForTimeout(200);
      if (!(await p.evaluate(() => document.scrollingElement.scrollWidth <= document.documentElement.clientWidth))) over.push(f);
    }
    ok(over.length === 0 && p.errs.length === 0, `breedte ${w}px: alle pagina's en toestanden zonder zijwaartse scroll en zonder scriptfouten (${over.join(', ') || 'geen overloop'} ${p.errs.join('|')})`);
    await p.context().close();
  }
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
