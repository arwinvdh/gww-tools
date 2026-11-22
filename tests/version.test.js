// Eén appversie: version.js is de enige bron, CHANGELOG en service worker lopen mee.
const { chromium, launchOptions, offlinePage, ok } = require('./helpers.js');
const fs = require('fs'), path = require('path');
(async () => {
  const root = path.resolve(__dirname, '..');
  const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  const m = /var APP_VERSION = '([^']+)';/.exec(read('version.js'));
  const v = m && m[1];
  // SemVer 2.0.0, zonder voorloopnullen
  const num = '(0|[1-9]\\d*)', pre = '(?:-(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*))*)?', build = '(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?';
  ok(!!v && new RegExp(`^${num}\\.${num}\\.${num}${pre}${build}$`).test(v), `version.js: ${v} voldoet aan SemVer`);
  const top = /^## \[([^\]]+)\]/m.exec(read('CHANGELOG.md'));
  ok(!!top && top[1] === v, `CHANGELOG.md: bovenste sectie (${top && top[1]}) is gelijk aan version.js (${v})`);
  const sw = read('sw.js');
  const local = [...sw.match(/const LOCAL = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
  ok(local.includes('version.js'), 'sw.js: version.js staat in LOCAL');
  for (const f of ['index.html', 'route.html', 'start.html']) {
    const s = read(f);
    ok(!/\bVERSION\s*=/.test(s.replace(/APP_VERSION/g, '')), `${f}: geen eigen 'VERSION =' meer`);
    ok(s.indexOf('src="version.js"') !== -1 && s.indexOf('src="version.js"') < s.indexOf("APP_VERSION"), `${f}: version.js wordt vóór het gebruik geladen`);
  }
  const b = await chromium.launch(launchOptions());
  for (const f of ['index.html', 'route.html', 'start.html']) {
    const p = await offlinePage(b, { viewport: { width: 390, height: 800 } }, f);
    const t = await p.evaluate(() => (document.getElementById('ver') || {}).textContent || '');
    ok(t.indexOf('Versie ' + v) === 0, `${f}: toont 'Versie ${v}' (${t})`);
    ok(p.errs.length === 0, `${f}: geen scriptfouten ${p.errs.join('|')}`);
    await p.context().close();
  }
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
