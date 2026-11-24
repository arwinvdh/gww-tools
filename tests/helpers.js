// Gedeelde hulpjes voor de tests: pad naar de site, Leaflet-bestanden en de browser.
const path = require('path');
const { chromium } = require('playwright');

const ROOT = 'file://' + path.resolve(__dirname, '..') + '/';
const LEAFLET_JS = require.resolve('leaflet/dist/leaflet.js');
const LEAFLET_CSS = require.resolve('leaflet/dist/leaflet.css');

// Normaal vindt Playwright zelf de browser. Staat hij ergens anders, zet dan PW_CHROMIUM=/pad/naar/chromium.
function launchOptions() { return process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}; }

// Nieuwe pagina zonder internet: alleen de eigen bestanden, Leaflet komt uit node_modules.
async function offlinePage(browser, device, file) {
  const ctx = await browser.newContext(device || {});
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
  await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
  await p.goto(ROOT + file);
  await p.waitForTimeout(600);
  await p.evaluate(() => { const t = document.getElementById('tip'); if (t) t.hidden = true; });
  return p;
}

// Een gebruiker opent een ingeklapte sectie of een ingeklapt formulier eerst, en typt dan. Deze hulp doet hetzelfde voor
// p.fill, p.click, p.selectOption en p.press: staat het veld in een gesloten <details>, dan gaat die eerst open.
function autoOpen(p) {
  const open = (sel) => p.evaluate((s) => { const el = document.querySelector(s); for (let d = el && el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; }, sel).catch(() => {});
  for (const m of ['fill', 'click', 'tap', 'selectOption', 'press', 'check', 'focus']) {
    const orig = p[m].bind(p);
    p[m] = async (sel, ...rest) => { if (typeof sel === 'string') await open(sel); return orig(sel, ...rest); };
  }
  return p;
}

const ok = (c, t) => { console.log((c ? 'OK   ' : 'FOUT ') + t); if (!c) process.exitCode = 1; };

module.exports = { chromium, ROOT, LEAFLET_JS, LEAFLET_CSS, launchOptions, offlinePage, ok, autoOpen };
