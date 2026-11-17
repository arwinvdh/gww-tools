const { chromium, ROOT, LEAFLET_JS, LEAFLET_CSS, launchOptions } = require('./helpers.js');
const { createMock } = require('./mock-github.js');
(async () => {
  const b = await chromium.launch(launchOptions());
  const gh = createMock(); const REPO = 'arwinvdh/locatie-data', TOKEN = 'github_pat_testtoken_0123456789';
  async function device() {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('dialog', d => d.accept());
    await ctx.route(u => !/^(file:|https:\/\/api\.github\.com)/.test(u.href), r => r.abort());
    await ctx.route('https://api.github.com/**', r => gh.handle(r));
    await p.goto(ROOT + 'route.html'); return p;
  }
  async function connect(p) { await p.click('#gear'); await p.fill('#gh-repo', REPO); await p.fill('#gh-token', TOKEN); await p.click('#gh-go'); await p.waitForTimeout(1700); }
  const ok = (c, t) => console.log((c ? 'OK   ' : 'FOUT ') + t);
  const A = await device(), B = await device();
  await connect(A);
  ok(await A.evaluate(() => !!localStorage.getItem('gh-sync-config')), 'A verbonden');
  // route invullen op A
  await A.fill('#s1-plaats', 'R3S'); await A.fill('#s1-tijd', '6'); await A.fill('#s1-items', '1 bigbag Spramex');
  await A.click('[data-id="1"] [data-do="next"]'); await A.waitForTimeout(400);
  await A.fill('#s2-plaats', 'Berkel Rodenrijs'); await A.fill('#s2-project', 'ib25060'); await A.fill('#s2-items', 'Lossen bigbag');
  await A.click('#copy'); await A.waitForTimeout(4500);   // kopiëren leert plaatsen en bewaart de route
  const d = gh.read('data/route.json');
  ok(d && Object.keys(d.docs).some(k => k.startsWith('routes/')) && d.docs['memory/main'], 'A: route en suggesties staan in de repo (' + (d ? Object.keys(d.docs).join(', ') : '-') + ')');
  // B verbindt: eerdere routes en suggesties komen mee
  await connect(B); await B.waitForTimeout(1500);
  await B.click('#hist-open'); await B.waitForTimeout(300);
  ok(await B.locator('.h-item').count() === 1, 'B: eerdere route van A staat in de lijst');
  await B.click('#sheet-close');
  await B.fill('#s1-plaats', 'Berk'); await B.waitForTimeout(300);
  ok((await B.locator('.sugg[data-for=r2] .chip').allTextContents()).join('|').includes('Berkel Rodenrijs'), 'B: suggestie Berkel Rodenrijs komt van A');
  // concept van A naar B
  await A.waitForTimeout(1500); await A.fill('#note', 'Let op de brug'); await A.waitForTimeout(300);
  await A.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await A.waitForTimeout(2500);
  await B.evaluate(() => window.GhSync.syncNow()); await B.waitForTimeout(900);
  ok(await B.locator('#gh-draft').count() === 1, 'B: melding over nieuwere route van een ander apparaat');
  ok((await B.inputValue('#note')) !== 'Let op de brug', 'B: eigen invoer niet overschreven');
  await B.click('#gh-draft button.primary'); await B.waitForTimeout(500);
  ok((await B.inputValue('#note')) === 'Let op de brug' && (await B.inputValue('#s1-plaats')) === 'R3S', 'B: na Overnemen staat de route van A er');
  ok(await B.locator('#undo').isVisible(), 'B: ongedaan maken is beschikbaar');
  await B.evaluate(() => window.GhSync.syncNow()); await B.waitForTimeout(600);
  ok(await B.locator('#gh-draft').count() === 0, 'geen herhaalde melding');
  // route wissen op B: verdwijnt bij A
  await B.click('#hist-open'); await B.click('.h-acts [data-h=del]'); await B.click('.h-acts [data-h=del]'); await B.waitForTimeout(3500);
  await A.evaluate(() => window.GhSync.syncNow()); await A.waitForTimeout(800);
  await A.click('#hist-open'); await A.waitForTimeout(200);
  ok(await A.locator('.h-item').count() === 0, 'A: route die B wiste is ook bij A weg');
  // back-up knop zichtbaar op de zelfstandige pagina
  await A.click('#sheet-close'); await A.click('#gear');
  ok(await A.locator('#backup').isVisible(), 'back-up blijft beschikbaar naast synchroniseren');
  console.log('fouten A:', A.errs, '| fouten B:', B.errs, '| requests:', gh.log.length);
  await b.close();
})();
