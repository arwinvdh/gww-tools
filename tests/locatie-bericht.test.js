// Locatie delen: opbouw van het WhatsApp-bericht.
const { chromium, launchOptions, offlinePage, ok } = require('./helpers.js');
const { devices } = require('playwright');
(async () => {
  const b = await chromium.launch(launchOptions());
  const p = await offlinePage(b, devices['iPhone 13'], 'index.html');
  await p.fill('#q', '51.995961, 4.476169'); await p.click('#go'); await p.waitForTimeout(500);
  await p.fill('#nr', 'IB25060'); await p.fill('#name', 'HOF Berkel'); await p.fill('#addr', 'Oudelandselaan 1, Berkel en Rodenrijs');
  const text = () => p.evaluate(() => document.getElementById('preview').textContent);
  let t = await text();
  ok(!/\n\nℹ/.test(t) && !t.includes('ℹ'), 'zonder notitie: geen notitieregel en geen extra lege regel');
  await p.evaluate(() => document.getElementById('more').open = true);
  await p.fill('#note', 'Ingang via de achterpoort'); await p.waitForTimeout(300);
  t = await text();
  ok(/Rodenrijs\n\nℹ️ Ingang via de achterpoort/.test(t), 'met notitie: een lege regel boven de notitie (' + JSON.stringify(t.split('\n').slice(-5)) + ')');
  await p.fill('#via', 'Westersingel'); await p.fill('#arrive', 'Meld je bij de keet'); await p.waitForTimeout(300);
  t = await text();
  ok(/Meld je bij de keet\n\nℹ️/.test(t) && !/\n\n\n/.test(t), 'met aanrijden en melden: lege regel boven de notitie, nooit twee lege regels achter elkaar');
  // alleen een notitie: geen lege regel vooraan
  await p.click('#new'); await p.fill('#q', '51.995961, 4.476169'); await p.click('#go'); await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('more').open = true); await p.fill('#note', 'Alleen een notitie'); await p.waitForTimeout(300);
  t = await text();
  ok(!/^\s/.test(t), 'zonder andere regels begint het bericht niet met een lege regel (' + JSON.stringify(t.slice(0, 30)) + ')');
  ok(p.errs.length === 0, 'geen scriptfouten ' + p.errs.join('|'));
  await b.close();
})();
