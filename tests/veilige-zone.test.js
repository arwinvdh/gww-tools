// Veilige zones op de iPhone (notch en thuisbalk): de browser wordt gevraagd om randen te simuleren (Chromium: Emulation.setSafeAreaInsetsOverride).
// Dit is een nabootsing in Chromium, geen test op een echte iPhone.
const fs = require('fs'), path = require('path');
const { chromium, launchOptions, ok, ROOT, LEAFLET_JS, LEAFLET_CSS } = require('./helpers.js');
const root = path.resolve(__dirname, '..');
const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); const dd = new Date(); const YD = iso(new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() - 1, 12));
// statisch: elke pagina vraagt om het hele scherm en staat in de app-metadata
const pages = ['index.html', 'route.html', 'projecten.html', 'logboek.html', 'start.html', 'vault.html', 'visie.html'];
const noCover = pages.filter(f => !/viewport-fit=cover/.test(fs.readFileSync(path.join(root, f), 'utf8')));
ok(noCover.length === 0, 'elke pagina heeft viewport-fit=cover (' + (noCover.join(', ') || 'allemaal') + ')');
const css = fs.readFileSync(path.join(root, 'shared.css'), 'utf8');
ok(/\.appnav \{[^}]*safe-area-inset-bottom/.test(css) && /\.bar \{[^}]*safe-area-inset-bottom/.test(css) && /safe-area-inset-top/.test(css), 'shared.css gebruikt de veilige zone voor onderbalk, actiebalk en bovenkant');
(async () => {
  const b = await chromium.launch(launchOptions());
  for (const [name, vp, ins] of [['portret (notch en thuisbalk)', { width: 390, height: 844 }, { top: 47, bottom: 34, left: 0, right: 0 }], ['liggend (zijranden)', { width: 844, height: 390 }, { top: 0, bottom: 21, left: 47, right: 47 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true });
    await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
    await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
    await ctx.addInitScript(([Y]) => { if (localStorage.getItem('__s')) return; localStorage.setItem('__s', '1'); localStorage.setItem('knijperwagen-tipX', '1'); localStorage.setItem('start.tipX', '1');
      localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB1', name: 'Eerste', created: 1, modified: 3 }])); localStorage.setItem('locdelen.projects', JSON.stringify([{ nr: 'IB1', name: 'Eerste', lat: 52.09, lon: 5.12 }]));
      localStorage.setItem('knijperwagen-route-v2', JSON.stringify({ datum: '2099-01-02', stops: [{ acties: ['LADEN'], plaats: 'R3S', items: 'x' }] }));
      localStorage.setItem('gww.log', JSON.stringify([{ v: 1, id: 'l1', projectId: 'p1', date: Y, work: 'x', equipment: [], crew: [], created: 5, modified: 6 }])); }, [YD]);
    const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
    const states = [['start.html', null], ['index.html', async () => { await p.fill('#q', '52.09, 5.12'); await p.click('#go'); await p.waitForTimeout(400); }], ['route.html', null], ['projecten.html', null],
      ['projecten.html', async () => { await p.click('.row[data-id="p1"]'); }], ['logboek.html#/p/p1/' + YD, null], ['vault.html', null], ['visie.html', null]];
    const bad = [];
    for (const [f, fn] of states) {
      await p.goto(ROOT + f); await p.waitForTimeout(350); await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: ins }); await p.waitForTimeout(250); if (fn) await fn(); await p.waitForTimeout(250);
      const r = await p.evaluate(([ins]) => { const vw = innerWidth, vh = innerHeight, out = [];
        document.querySelectorAll('button,a[href],input,select,textarea,summary,h1').forEach(e => { if (e.closest('.leaflet-container') || e.closest('dialog:not([open])') || e.closest('[hidden]')) return; const bx = e.getBoundingClientRect(), s = getComputedStyle(e); if (bx.width <= 0 || bx.height <= 0 || s.visibility === 'hidden') return;
          const nm = e.id || (typeof e.className === 'string' && e.className) || e.tagName;
          if (window.scrollY === 0 && !e.closest('.tabs') && bx.top < ins.top - 0.5) out.push('boven ' + nm);
          if (e.closest('.bar,.appnav') && bx.bottom > vh - ins.bottom + 0.5) out.push('onder ' + nm);
          if (!e.matches('.back') && (bx.left < ins.left - 0.5 || bx.right > vw - ins.right + 0.5)) out.push('zij ' + nm); });
        return [...new Set(out)].slice(0, 5); }, [ins]);
      if (r.length) bad.push(f + (fn ? '*' : '') + ': ' + r.join(', '));
    }
    ok(bad.length === 0, `${name}: niets raakt de veilige zone op ${states.length} pagina's en toestanden (${bad.join(' | ') || 'geen overlap'})`);
    await ctx.close();
  }
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
