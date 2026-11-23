// Toegankelijkheid: elke bediening heeft een naam, velden hebben een label, geen dubbele id's, dialogen en meldingen zijn herkenbaar voor een
// schermlezer, Esc sluit dialogen en de focus keert terug. Nabootsing in Chromium; geen test met VoiceOver op een echte iPhone.
const { chromium, launchOptions, ok, ROOT, LEAFLET_JS, LEAFLET_CSS } = require('./helpers.js');
const { devices } = require('playwright');
const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); const dd = new Date(); const YD = iso(new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() - 1, 12));
const scan = () => {
  const out = []; const nm = e => (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : '') || e.tagName;
  const vis = e => { const b = e.getBoundingClientRect(), s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const name = e => { const lb = e.getAttribute('aria-labelledby'); if (lb) return lb.split(' ').map(i => (document.getElementById(i) || {}).textContent || '').join(' ').trim(); return (e.getAttribute('aria-label') || '').trim() || (e.labels && [...e.labels].map(l => l.textContent).join(' ').trim()) || (e.getAttribute('title') || '').trim() || (e.textContent || '').trim(); };
  document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab]').forEach(e => {
    if (e.closest('.leaflet-container') && !e.closest('.leaflet-control')) return; if (!vis(e) && !e.matches('[type=file]')) return; if (e.closest('dialog:not([open])') || e.closest('[hidden]')) return;
    if (!name(e) && !(e.matches('input,textarea,select') && e.getAttribute('placeholder'))) out.push('geen naam: ' + nm(e));
  });
  document.querySelectorAll('input:not([type=hidden]):not([type=file]),select,textarea').forEach(e => { if (!vis(e) || e.closest('[hidden]') || e.closest('dialog:not([open])')) return;
    if (!((e.labels && e.labels.length) || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby'))) out.push('veld zonder label: ' + nm(e)); });
  document.querySelectorAll('img').forEach(i => { if (!i.hasAttribute('alt')) out.push('img zonder alt'); });
  document.querySelectorAll('dialog[open]').forEach(dl => { if (!dl.getAttribute('aria-label') && !dl.getAttribute('aria-labelledby') && !dl.querySelector('h1,h2')) out.push('dialoog zonder naam: ' + nm(dl)); });
  if (!document.documentElement.lang) out.push('html zonder lang'); if (!document.querySelector('h1')) out.push('geen h1');
  const ids = {}; document.querySelectorAll('[id]').forEach(e => { ids[e.id] = (ids[e.id] || 0) + 1; }); Object.keys(ids).forEach(k => { if (ids[k] > 1) out.push('dubbel id: ' + k); });
  document.querySelectorAll('[aria-controls]').forEach(e => { if (!document.getElementById(e.getAttribute('aria-controls'))) out.push('aria-controls wijst nergens heen: ' + nm(e)); });
  return [...new Set(out)];
};
(async () => {
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext(devices['iPhone 13']);
  await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
  await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
  await ctx.addInitScript(([Y]) => { if (localStorage.getItem('__s')) return; localStorage.setItem('__s', '1'); localStorage.setItem('knijperwagen-tipX', '1'); localStorage.setItem('start.tipX', '1');
    localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB1', name: 'Eerste', lat: 52.09, lon: 5.12, created: 1, modified: 3 }])); localStorage.setItem('locdelen.projects', JSON.stringify([{ nr: 'IB1', name: 'Eerste', lat: 52.09, lon: 5.12 }]));
    localStorage.setItem('knijperwagen-route-v2', JSON.stringify({ datum: '2099-01-02', stops: [{ acties: ['LADEN'], plaats: 'R3S', items: 'x' }, { acties: [], plaats: '', items: 'y' }] }));
    localStorage.setItem('gww.log', JSON.stringify([{ v: 1, id: 'l1', projectId: 'p1', date: Y, work: 'x', equipment: [], crew: [{ partner: 'B', count: 3, hours: 8 }], machines: [{ item: 'G', partner: '', hours: 7 }], created: 5, modified: 6 }])); }, [YD]);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  const states = [['start.html', null], ['index.html', async () => { await p.fill('#q', '52.09, 5.12'); await p.click('#go'); await p.waitForTimeout(400); }], ['index.html', async () => { await p.click('#gear'); }],
    ['route.html', async () => { await p.evaluate(() => document.querySelector('#stops .stop .hd').click()); }], ['route.html', async () => { await p.click('#hist-open'); }], ['route.html', async () => { await p.click('#gear'); }],
    ['projecten.html', null], ['projecten.html', async () => { await p.click('.row[data-id="p1"]'); }], ['logboek.html', null], ['logboek.html#/p/p1', null], ['logboek.html#/p/p1', async () => { await p.click('#weekBtn'); }], ['logboek.html#/p/p1/' + YD, null], ['vault.html', null], ['visie.html', null]];
  const bad = [];
  for (const [f, fn] of states) { await p.goto(ROOT + f); await p.waitForTimeout(400); if (fn) await fn(); await p.waitForTimeout(250); const r = await p.evaluate(scan); if (r.length) bad.push(f + (fn ? '*' : '') + ': ' + r.join(', ')); }
  ok(bad.length === 0, `schermlezer: namen, labels, taal, kopniveau, id's en aria-verwijzingen op ${states.length} pagina's en toestanden (${bad.join(' | ') || 'geen afwijkingen'})`);
  // meldingen worden voorgelezen
  const live = [];
  for (const [f, sel] of [['index.html', '#status'], ['index.html', '#toast'], ['route.html', '#toast'], ['route.html', '#status'], ['logboek.html#/p/p1/' + YD, '#state'], ['projecten.html', '#msg'], ['projecten.html', '#addmsg']]) {
    await p.goto(ROOT + f); await p.waitForTimeout(250);
    const r = await p.evaluate((s) => { const e = document.querySelector(s); return e && (e.getAttribute('role') === 'status' || e.getAttribute('role') === 'alert' || e.getAttribute('aria-live')); }, sel);
    if (!r) live.push(f.split('#')[0] + ' ' + sel);
  }
  ok(live.length === 0, 'meldingen hebben een live-regio zodat een schermlezer ze voorleest (' + (live.join(', ') || 'allemaal') + ')');
  // Esc sluit dialogen en de focus keert terug
  await p.goto(ROOT + 'projecten.html'); await p.waitForTimeout(300); await p.focus('.row[data-id="p1"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('dlg').open), 'toetsenbord: Enter opent het projectvenster');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.getElementById('dlg').open && location.hash === '' && document.activeElement && document.activeElement.matches('.row')), 'toetsenbord: Esc sluit het projectvenster, het adres is schoon en de focus staat weer op de regel');
  await p.goto(ROOT + 'route.html'); await p.waitForTimeout(300); await p.focus('#hist-open'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.getElementById('sheet').hidden), 'toetsenbord: Enter opent Eerdere routes');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('sheet').hidden && document.activeElement.id === 'hist-open'), 'toetsenbord: Esc sluit Eerdere routes en de focus keert terug op de knop');
  await p.goto(ROOT + 'logboek.html#/p/p1'); await p.waitForTimeout(300); await p.focus('#weekBtn'); await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.getElementById('wdlg').open && document.activeElement.id === 'weekBtn'), 'toetsenbord: Esc sluit het weekrapport en de focus keert terug');
  await p.goto(ROOT + 'index.html'); await p.waitForTimeout(300); await p.focus('#gear'); await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.getElementById('settings').open && document.activeElement.id === 'gear'), 'toetsenbord: Esc sluit Mijn gegevens en de focus keert terug');
  ok(p.errs.length === 0, 'geen scriptfouten ' + p.errs.join('|'));
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
