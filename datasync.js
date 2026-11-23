// Synchroniseren van Projecten en Logboek tussen apparaten, bovenop sync.js (GhSync).
// Bestanden in de privérepo: data/projecten.json en data/logboek.json, formaat { v: 1, docs } zoals bij Route.
// De gegevens op het apparaat houden hun eigen vorm (gww.projects, gww.log); deze laag voegt alleen samen.
// Per document wint de nieuwste wijziging (`modified`). Verwijderingen worden gedeeld met een grafsteen; die staat lokaal in
// `gww.tombstones` ({ documentsleutel: tijdstip }) en wordt na 90 dagen opgeruimd. Foto's worden niet gesynchroniseerd.
(function () {
  'use strict';
  var TKEY = 'gww.tombstones', TOMB_DAYS = 90;
  var COLS = {
    projects: { file: 'projecten.json', ls: 'gww.projects', prefix: 'projects/', key: function (r) { return 'projects/' + r.id; }, valid: function (r) { return r && r.id; } },
    log: { file: 'logboek.json', ls: 'gww.log', prefix: 'log/', key: function (r) { return 'log/' + r.projectId + '/' + r.date; }, valid: function (r) { return r && r.projectId && r.date; } }
  };
  var names = Object.keys(COLS);

  function readArr(k) { try { var v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function writeArr(k, a) { try { localStorage.setItem(k, JSON.stringify(a)); return true; } catch (e) { return false; } }
  function tombs() { try { var t = JSON.parse(localStorage.getItem(TKEY)); return t && typeof t === 'object' && !Array.isArray(t) ? t : {}; } catch (e) { return {}; } }
  function saveTombs(t) {
    var cut = Date.now() - TOMB_DAYS * 864e5;
    Object.keys(t).forEach(function (k) { if (t[k] < cut) delete t[k]; });
    try { localStorage.setItem(TKEY, JSON.stringify(t)); } catch (e) { /* opslag mag ontbreken */ }
  }
  function strip(d) { var o = {}; Object.keys(d).forEach(function (k) { if (k !== 't' && k !== '__del') o[k] = d[k]; }); return o; }

  /* samenvoegen van de lokale lijst met wat er in de repo staat: geeft de nieuwe lokale lijst, de grafstenen en wat er terug naar de repo moet */
  function reconcile(name, remote) {
    var col = COLS[name], t = tombs(), changed = false, pushes = [];
    var local = {};
    readArr(col.ls).forEach(function (r) { if (col.valid(r)) local[col.key(r)] = r; });
    var seen = {};
    remote.forEach(function (e) {
      var key = e.key, d = e.d; seen[key] = true;
      var L = local[key];
      if (d && d.__del) {
        if (L && (L.modified || 0) <= (d.t || 0)) { delete local[key]; changed = true; t[key] = Math.max(t[key] || 0, d.t || 0); }
        else if (L) { pushes.push({ key: key, doc: Object.assign({}, L, { t: L.modified || Date.now() }) }); }
        else t[key] = Math.max(t[key] || 0, d.t || 0);
        return;
      }
      if (!d || !col.valid(d)) return;
      if (t[key] && t[key] >= (d.t || 0)) { pushes.push({ key: key, doc: { __del: true, t: t[key] } }); return; }
      if (!L) { local[key] = strip(d); delete t[key]; changed = true; }
      else if ((d.t || 0) > (L.modified || 0)) { local[key] = strip(d); changed = true; }
      else if ((L.modified || 0) > (d.t || 0)) pushes.push({ key: key, doc: Object.assign({}, L, { t: L.modified || Date.now() }) });
    });
    Object.keys(local).forEach(function (key) {
      if (seen[key]) return;
      var L = local[key];
      if (t[key] && t[key] >= (L.modified || 0)) { delete local[key]; changed = true; return; }   /* lokaal verwijderd na de laatste wijziging */
      delete t[key];
      pushes.push({ key: key, doc: Object.assign({}, L, { t: L.modified || Date.now() }) });
    });
    Object.keys(t).forEach(function (key) {
      if (key.indexOf(col.prefix) === 0 && !seen[key] && !local[key]) pushes.push({ key: key, doc: { __del: true, t: t[key] } });
    });
    if (changed) writeArr(col.ls, Object.keys(local).map(function (k) { return local[k]; }));
    return { changed: changed, tombs: t, pushes: pushes };
  }

  var adapters = {}, running = null, again = false, timer = null, listeners = [];
  function adapter(name) { if (!adapters[name]) adapters[name] = window.GhSync.create(COLS[name].file); return adapters[name]; }

  function syncOne(name) {
    var a = adapter(name), col = COLS[name];
    return a.pull().then(function () { return a.entries(col.prefix); }).then(function (remote) {
      var r = reconcile(name, remote);
      saveTombs(r.tombs);
      return Promise.all(r.pushes.map(function (p) { return a.doc(p.key).set(p.doc); })).then(function () { return a.flush(); }).then(function () { return r.changed; });
    });
  }

  /* haalt op, voegt samen en schrijft terug; geeft true als er lokaal iets veranderd is. Zonder koppeling: false. */
  function run() {
    if (!window.GhSync || !window.GhSync.getConfig()) return Promise.resolve(false);
    if (running) { again = true; return running; }
    running = names.reduce(function (p, n) { return p.then(function (ch) { return syncOne(n).then(function (c) { return ch || c; }); }); }, Promise.resolve(false))
      .catch(function () { return false; })   /* de status staat in GhSync.onStatus */
      .then(function (ch) {
        running = null;
        var again2 = again; again = false;
        if (ch) listeners.forEach(function (fn) { try { fn(); } catch (e) { /* een luisteraar mag de rest niet breken */ } });
        return again2 ? run().then(function (c2) { return ch || c2; }) : ch;
      });
    return running;
  }
  function changed() { clearTimeout(timer); timer = setTimeout(run, 3000); }
  function deleted(key) { var t = tombs(); t[key] = Date.now(); saveTombs(t); changed(); }
  function revived(key) { var t = tombs(); if (t[key]) { delete t[key]; saveTombs(t); } }
  function onChange(fn) { listeners.push(fn); }

  window.GwwData = { run: run, changed: changed, deleted: deleted, revived: revived, onChange: onChange, _reconcile: reconcile };
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') run(); });
})();
