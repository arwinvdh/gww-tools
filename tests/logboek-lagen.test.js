// Logboek in lagen: overzicht van projecten, de dagen van een project, één dag; knoppen en navigatie.
const { chromium, launchOptions, ok, ROOT, autoOpen } = require('./helpers.js');
(async () => {
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const TODAY = iso(new Date()), YEST = iso(new Date(Date.now() - 864e5));
  const b = await chromium.launch(launchOptions());
  const mk = async (projects, log) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
    await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
    await ctx.addInitScript(([pr, lg]) => {
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem('gww.projects', JSON.stringify(pr));
        localStorage.setItem('gww.log', JSON.stringify(lg));
      }
    }, [projects, log]);
    const p = autoOpen(await ctx.newPage()); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); return p;
  };
  const P = [
    { v: 1, id: 'p1', nr: 'IB1', name: 'Eerste', created: 1, modified: 3 },
    { v: 1, id: 'p2', nr: 'IB2', name: 'Tweede', created: 1, modified: 2 },
    { v: 1, id: 'p3', nr: 'IB3', name: 'Derde', created: 1, modified: 1 }
  ];
  const L = [
    { v: 1, id: 'a', projectId: 'p1', date: TODAY, work: 'Sleuf', crew: [{ partner: 'X', count: 3, hours: 8 }], stagnation: [{ cause: 'Weer', hours: 2, note: '' }], weather: { temp: 9, desc: 'Regen', src: 'auto' }, created: 1, modified: 5 },
    { v: 1, id: 'b', projectId: 'p1', date: YEST, work: 'Oud', created: 1, modified: 4 },
    { v: 1, id: 'c', projectId: 'p2', date: YEST, work: 'Andere dag', created: 1, modified: 3 }
  ];
  const p = await mk(P, L);
  const h1 = () => p.textContent('.brand h1');
  const hash = () => p.evaluate(() => location.hash);
  const log = () => p.evaluate(() => JSON.parse(localStorage.getItem('gww.log')));

  // laag 1
  await p.goto(ROOT + 'logboek.html'); await p.waitForTimeout(500);
  const rows = await p.$$eval('#plist .day', els => els.map(e => e.textContent));
  ok(rows.length === 3 && /IB1 · Eerste.*vandaag ingevuld · 2 dagen/.test(rows[0]) && /IB2 · Tweede.*laatste dag: .* · 1 dag$/.test(rows[1]) && /IB3 · Derde.*nog geen dagen/.test(rows[2]),
    'laag 1: projecten met laatste activiteit bovenaan en een regel per project (' + rows.join(' | ') + ')');
  ok(await h1() === 'Logboek' && await p.locator('#dayBar').isHidden(), 'laag 1: titel Logboek en geen actiebalk');

  // naar laag 2
  await p.click('#plist .day'); await p.waitForTimeout(400);
  ok(/#\/p\/p1$/.test(await hash()) && await h1() === 'IB1 · Eerste' && await p.textContent('#todayBtn') === 'Vandaag openen', 'laag 2: dagen van het project en "Vandaag openen" (' + await h1() + ')');
  const days = await p.$$eval('#dlist .day', els => els.map(e => e.textContent));
  ok(days.length === 2 && /9 °C · 3 pers · .*2 u stagnatie/.test(days[0]) && /Oud/.test(days[1]), 'laag 2: samenvatting per dag (' + days[0] + ')');

  // terugknop in de kop gaat één laag omhoog
  await p.click('.brand .back'); await p.waitForTimeout(400);
  ok(await h1() === 'Logboek' && await p.locator('#v1').isVisible(), 'terugknop in de kop: van laag 2 naar laag 1');

  // laag 3 vanuit een project zonder dag van vandaag
  await p.click('#plist .day >> nth=1'); await p.waitForTimeout(300);
  ok(await p.textContent('#todayBtn') === 'Vandaag invullen', 'laag 2: "Vandaag invullen" als vandaag nog niet bestaat');
  await p.click('#todayBtn'); await p.waitForTimeout(500);
  ok(new RegExp('#/p/p2/' + TODAY + '$').test(await hash()) && await p.locator('#dayBar').isVisible() && await p.locator('#saveBack').isVisible() && await p.locator('#report').isVisible(),
    'laag 3: actiebalk met Opslaan en terug en Dagrapport');
  ok(await p.textContent('#dayProj') === 'IB2 · Tweede' && await p.isDisabled('#nextDay'), 'laag 3: project bovenaan en "Volgende dag" staat uit op vandaag');
  await p.click('#prevDay'); await p.waitForTimeout(500);
  ok(new RegExp('#/p/p2/' + YEST + '$').test(await hash()) && await p.inputValue('#work') === 'Andere dag' && await p.isEnabled('#nextDay'), 'laag 3: vorige dag toont die dag, volgende dag kan weer');
  await p.click('#nextDay'); await p.waitForTimeout(500);
  await p.fill('#work', 'Vandaag gewerkt'); await p.click('#saveBack'); await p.waitForTimeout(600);
  ok(/#\/p\/p2$/.test(await hash()) && (await log()).some(e => e.projectId === 'p2' && e.date === TODAY && e.work === '• Vandaag gewerkt'), 'Opslaan en terug: bewaard en terug naar de dagen van het project');
  ok(await p.textContent('#todayBtn') === 'Vandaag openen' && (await p.$$('#dlist .day')).length === 2, 'laag 2 toont de nieuwe dag meteen');

  // dag verwijderen vraagt bevestiging
  await p.click('#dlist .day >> nth=0'); await p.waitForTimeout(400);
  await p.click('#delDay'); await p.waitForTimeout(150);
  ok((await log()).length === 4 && /Zeker weten/.test(await p.textContent('#delDay')), 'dag verwijderen: eerst een bevestiging');
  await p.click('#delDay'); await p.waitForTimeout(700);
  const after = await log();
  ok(after.length === 3 && !after.some(e => e.projectId === 'p2' && e.date === TODAY) && /#\/p\/p2$/.test(await hash()), 'dag verwijderen: weg en terug naar de dagen van het project');

  // nieuwe dag vandaag kiest eerst het project
  await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(300);
  await p.click('#newToday'); await p.waitForTimeout(300);
  ok(await p.locator('#ndlg').evaluate(d => d.open) && (await p.$$('#nlist .day')).length === 3, 'nieuwe dag vandaag: lijst om een project te kiezen');
  await p.click('#nlist .day >> nth=2'); await p.waitForTimeout(500);
  ok(new RegExp('#/p/p[123]/' + TODAY + '$').test(await hash()) && await p.locator('#v3').isVisible(), 'nieuwe dag vandaag: opent de dag van het gekozen project');

  // adres vanuit Projecten (#gp=) opent de dagen van dat project
  await p.goto(ROOT + 'logboek.html#gp=p3'); await p.waitForTimeout(500);
  ok(/#\/p\/p3$/.test(await hash()) && await h1() === 'IB3 · Derde', '#gp= vanuit Projecten opent laag 2 van dat project');
  ok(await p.evaluate(() => document.scrollingElement.scrollWidth <= document.documentElement.clientWidth) && p.errs.length === 0, 'geen zijwaartse scroll en geen scriptfouten ' + p.errs.join('|'));

  // zoeken bij veel projecten
  const many = Array.from({ length: 8 }, (_, i) => ({ v: 1, id: 'm' + i, nr: 'N' + i, name: i === 5 ? 'Zeldzaam' : 'Gewoon ' + i, created: 1, modified: i }));
  const q = await mk(many, []);
  await q.goto(ROOT + 'logboek.html'); await q.waitForTimeout(400);
  ok(await q.locator('#psearch').isVisible(), 'zoekveld verschijnt bij meer dan 6 projecten');
  await q.fill('#psearch', 'zeldz'); await q.waitForTimeout(200);
  ok((await q.$$('#plist .day')).length === 1, 'zoeken filtert de projecten');
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
