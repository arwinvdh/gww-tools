/* Synchronisatie tussen apparaten via een eigen privérepo op GitHub.
   Gedeeld door Locatie delen en Route knijperwagen (zelfstandige pagina).

   Opzet
   - Gegevens staan als JSON-bestand in jouw privérepo (data/<tool>.json), geschreven met een token die alleen die repo mag gebruiken.
   - Elk document heeft een tijdstip `t`. Bij samenvoegen wint per document het nieuwste; een verwijdering is een grafsteen ({__del:true, t}).
   - Schrijven gebeurt met de sha van het bestand. Heeft een ander apparaat net geschreven, dan wordt eerst samengevoegd en daarna opnieuw geschreven.
   - Token en reponaam staan alleen in de browser van dit apparaat en gaan alleen naar api.github.com.

   Gebruik
   - GhSync.getConfig()                   { repo, token } of null
   - GhSync.create('route.json')          adapter met doc(pad).get/set/delete, collection(naam), entries(voorvoegsel), pull(), flush()
   - GhSync.mountSettings(element)        zet het instellingenblok (verbinden, status) in een element
   - GhSync.onStatus(fn)                  { state: 'off'|'ok'|'fout', at, msg }
   - GhSync.notice(id, tekst, knoppen)    melding bovenaan met knoppen
*/
(function () {
  'use strict';
  var CFG = 'gh-sync-config';
  var API = 'https://api.github.com';
  var TOMB_DAYS = 90;
  var listeners = [];
  var status = { state: 'off', at: 0, msg: '' };

  function setStatus(state, msg) {
    status = { state: state, at: state === 'ok' ? Date.now() : status.at, msg: msg || '' };
    listeners.forEach(function (fn) { try { fn(status); } catch (e) { /* een luisteraar mag de rest niet breken */ } });
  }
  function onStatus(fn) { listeners.push(fn); fn(status); }
  function getConfig() {
    try { var c = JSON.parse(localStorage.getItem(CFG)); return c && c.repo && c.token ? c : null; } catch (e) { return null; }
  }
  function setConfig(c) { try { localStorage.setItem(CFG, JSON.stringify(c)); } catch (e) { /* opslag mag ontbreken */ } }
  function clearConfig() { try { localStorage.removeItem(CFG); } catch (e) { /* idem */ } }

  function b64enc(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64dec(b64) {
    var bin = atob(String(b64).replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function errorText(e) {
    var s = e && e.status;
    if (s === 401) return 'De token is ongeldig of verlopen. Maak een nieuwe token en verbind opnieuw.';
    if (s === 403) return 'De token mag deze repo niet lezen of schrijven. Geef hem bij Repository permissions het recht Contents: Read and write.';
    if (s === 404) return 'Repo niet gevonden. Controleer de naam en of de token deze repo mag gebruiken.';
    if (e && e.name === 'AbortError') return 'GitHub antwoordt niet. Probeer het zo opnieuw.';
    if (s) return 'GitHub gaf een fout (' + s + '). Probeer het zo opnieuw.';
    return 'Geen verbinding met GitHub.';
  }

  function api(method, path, body, cfg, keepalive) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 20000) : 0;
    var headers = { 'Authorization': 'Bearer ' + cfg.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (body) headers['Content-Type'] = 'application/json';
    return fetch(API + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', keepalive: Boolean(keepalive), signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (j) {
          if (!r.ok) { var err = new Error((j && j.message) || ('HTTP ' + r.status)); err.status = r.status; throw err; }
          return j;
        });
      })
      .finally(function () { clearTimeout(timer); });
  }

  /* per document het nieuwste; grafstenen tellen mee */
  function mergeDocs(a, b) {
    var out = {}, k;
    for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) out[k] = a[k];
    for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) {
      if (!out[k] || (b[k] && (b[k].t || 0) > (out[k].t || 0))) out[k] = b[k];
    }
    return out;
  }
  function prune(docs) {
    var cut = Date.now() - TOMB_DAYS * 864e5, out = {};
    Object.keys(docs).forEach(function (k) { var d = docs[k]; if (d && d.__del && (d.t || 0) < cut) return; out[k] = d; });
    return out;
  }

  function create(file) {
    var path = 'data/' + file;
    var docs = {}, sha = null, loaded = null, timer = null, dirty = false, chain = Promise.resolve();

    function cfg() { var c = getConfig(); if (!c) throw new Error('Niet verbonden'); return c; }

    function fetchRemote() {
      return Promise.resolve().then(function () {
        var c = cfg();
        return api('GET', '/repos/' + c.repo + '/contents/' + path, null, c);
      }).then(function (j) {
        var data = {}; try { data = JSON.parse(b64dec(j.content)); } catch (e) { /* onleesbaar bestand telt als leeg */ }
        return { docs: (data && data.docs && typeof data.docs === 'object') ? data.docs : {}, sha: j.sha };
      }, function (e) {
        if (e.status === 404) return { docs: {}, sha: null };
        throw e;
      });
    }
    function absorb(r) {
      Object.keys(docs).forEach(function (k) { if (!r.docs[k] || (docs[k].t || 0) > (r.docs[k].t || 0)) dirty = true; });
      docs = mergeDocs(docs, r.docs);
      sha = r.sha;
    }
    function load() {
      if (!loaded) {
        loaded = fetchRemote().then(function (r) { absorb(r); setStatus('ok'); if (dirty) schedule(); }).catch(function (e) {
          loaded = null; setStatus('fout', errorText(e)); throw e;
        });
      }
      return loaded;
    }
    function flushNow(keepalive) {
      clearTimeout(timer); timer = null;
      if (!dirty) return Promise.resolve();
      dirty = false;
      var attempt = function (n) {
        var c = cfg();
        var body = { message: 'sync ' + file, content: b64enc(JSON.stringify({ v: 1, docs: prune(docs) })) };
        if (sha) body.sha = sha;
        return api('PUT', '/repos/' + c.repo + '/contents/' + path, body, c, keepalive).then(function (j) {
          sha = j.content.sha; setStatus('ok');
        }, function (e) {
          if ((e.status === 409 || e.status === 422) && n < 4) {      // een ander apparaat schreef net: samenvoegen en opnieuw
            return fetchRemote().then(function (r) { docs = mergeDocs(docs, r.docs); sha = r.sha; return attempt(n + 1); });
          }
          dirty = true; setStatus('fout', errorText(e)); throw e;
        });
      };
      return Promise.resolve().then(function () { return attempt(0); });
    }
    function schedule() {
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(function () { chain = chain.then(function () { return flushNow(false); }).catch(function () { /* status staat al gemeld */ }); }, 2000);
    }

    return {
      load: load,
      doc: function (p) {
        return {
          get: function () { return load().then(function () { var d = docs[p]; return { exists: Boolean(d && !d.__del), data: function () { return d; } }; }); },
          set: function (v) { return load().then(function () { var o = {}; for (var k in v) o[k] = v[k]; o.t = v.t || Date.now(); docs[p] = o; schedule(); }); },
          delete: function () { return load().then(function () { docs[p] = { __del: true, t: Date.now() }; schedule(); }); }
        };
      },
      collection: function (name) {
        return {
          orderBy: function (f, dir) {
            return { limit: function (n) {
              return { get: function () {
                return load().then(function () {
                  var items = Object.keys(docs).filter(function (k) { return k.indexOf(name + '/') === 0 && !docs[k].__del; }).map(function (k) { return docs[k]; });
                  items.sort(function (a, b) { return ((b[f] || 0) - (a[f] || 0)) * (dir === 'asc' ? -1 : 1); });
                  return { docs: items.slice(0, n).map(function (d) { return { data: function () { return d; } }; }) };
                });
              } };
            } };
          }
        };
      },
      /* alle documenten onder een voorvoegsel, grafstenen inbegrepen: [{ key, d }] */
      entries: function (prefix) {
        return load().then(function () { return Object.keys(docs).filter(function (k) { return k.indexOf(prefix) === 0; }).map(function (k) { return { key: k, d: docs[k] }; }); });
      },
      /* haalt de nieuwste stand op en voegt samen */
      pull: function () { return fetchRemote().then(function (r) { absorb(r); setStatus('ok'); if (dirty) schedule(); }, function (e) { setStatus('fout', errorText(e)); throw e; }); },
      flush: function () { return flushNow(true); },
      flushSoon: schedule
    };
  }

  /* verbinden: controleert repo en token, eist een privérepo en schrijft een korte uitleg als eerste bestand */
  function connect(repo, token) {
    repo = String(repo || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '');
    token = String(token || '').trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return Promise.reject(new Error('Vul de repo in als eigenaar/naam, bijvoorbeeld arwinvdh/locatie-data.'));
    if (token.length < 20) return Promise.reject(new Error('Plak de volledige token.'));
    var c = { repo: repo, token: token };
    return api('GET', '/repos/' + repo, null, c).then(function (r) {
      if (!r.private) throw new Error('Deze repo is openbaar. Gebruik een privérepo, anders kan iedereen je gegevens lezen.');
      if (r.permissions && r.permissions.push === false) throw new Error('De token mag niet schrijven in deze repo. Geef hem het recht Contents: Read and write.');
      return api('GET', '/repos/' + repo + '/contents/data/LEESMIJ.md', null, c).catch(function (e) {
        if (e.status !== 404) throw e;
        var txt = '# Gegevens\n\nDeze map wordt beheerd door Locatie delen en Route knijperwagen. Niet handmatig aanpassen.\n';
        return api('PUT', '/repos/' + repo + '/contents/data/LEESMIJ.md', { message: 'sync gestart', content: b64enc(txt) }, c);
      });
    }).then(function () { setConfig(c); setStatus('ok'); return c; });
  }
  function disconnect() { clearConfig(); setStatus('off'); }

  function tijd(ms) { var d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  /* instellingenblok voor in het tandwiel-venster */
  function mountSettings(el) {
    if (!el) return;
    el.innerHTML =
      '<div class="gh-box" style="display:grid;gap:.5rem">' +
      '<h3 style="margin:0;font-size:.9375rem;font-weight:600">Synchroniseren tussen apparaten</h3>' +
      '<p class="hint" id="gh-status"></p>' +
      '<div id="gh-form" style="display:grid;gap:.5rem">' +
        '<div class="field"><label for="gh-repo">Privérepo op GitHub</label><input class="inp" id="gh-repo" placeholder="arwinvdh/locatie-data" autocomplete="off" autocapitalize="off" spellcheck="false"></div>' +
        '<div class="field"><label for="gh-token">Token</label><input class="inp" id="gh-token" type="password" placeholder="github_pat_..." autocomplete="off" autocapitalize="off" spellcheck="false"></div>' +
        '<div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn sm primary" id="gh-go" type="button">Verbinden</button></div>' +
      '</div>' +
      '<div id="gh-on" style="display:none;gap:.5rem;flex-wrap:wrap"><button class="btn sm" id="gh-now" type="button">Nu synchroniseren</button><button class="btn sm" id="gh-off" type="button">Verbreken</button></div>' +
      '<p class="hint" id="gh-msg" role="status"></p>' +
      '<details><summary class="hint" style="cursor:pointer">Hoe stel ik dit in?</summary>' +
        '<ol class="hint" style="margin:.4rem 0 0;padding-left:1.1rem;display:grid;gap:.25rem">' +
          '<li>Maak op github.com een <b>nieuwe privérepo</b>, bijvoorbeeld <i>locatie-data</i>, met een README.</li>' +
          '<li>Ga naar <a class="lnk" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Settings, Developer settings, Fine-grained tokens</a> en kies Generate new token.</li>' +
          '<li>Kies bij Repository access <b>Only select repositories</b> en alleen die ene repo. Zet bij Repository permissions <b>Contents</b> op <b>Read and write</b>. Kies een vervaldatum.</li>' +
          '<li>Kopieer de token, plak hem hierboven met de reponaam en tik op Verbinden. Doe dit op elk apparaat één keer.</li>' +
        '</ol>' +
      '</details></div>';
    var $ = function (id) { return el.querySelector('#' + id); };
    var cfg = getConfig();
    function paint() {
      var c = getConfig();
      $('gh-form').style.display = c ? 'none' : 'grid';
      $('gh-on').style.display = c ? 'flex' : 'none';
      var s = status;
      $('gh-status').textContent = !c ? 'Niet verbonden. Gegevens blijven alleen op dit apparaat.'
        : (s.state === 'fout' ? s.msg : 'Verbonden met ' + c.repo + (s.at ? '. Laatst gesynchroniseerd om ' + tijd(s.at) + '.' : '.'));
      $('gh-status').style.color = c && s.state === 'fout' ? 'var(--warn)' : '';
    }
    if (cfg) $('gh-repo').value = cfg.repo;
    onStatus(paint);
    $('gh-go').addEventListener('click', function () {
      var b = $('gh-go'); b.disabled = true; $('gh-msg').textContent = 'Bezig met verbinden...';
      connect($('gh-repo').value, $('gh-token').value).then(function () {
        $('gh-token').value = ''; $('gh-msg').textContent = 'Verbonden. De pagina wordt vernieuwd...'; setTimeout(function () { location.reload(); }, 700);
      }).catch(function (e) { $('gh-msg').textContent = e && e.status ? errorText(e) : (e && e.message) || 'Verbinden mislukt.'; }).finally(function () { b.disabled = false; });
    });
    $('gh-off').addEventListener('click', function () { disconnect(); $('gh-msg').textContent = 'Losgekoppeld. De gegevens op dit apparaat blijven staan.'; paint(); setTimeout(function () { location.reload(); }, 700); });
    $('gh-now').addEventListener('click', function () {
      $('gh-msg').textContent = 'Synchroniseren...';
      (typeof window.GhSync.syncNow === 'function' ? window.GhSync.syncNow() : Promise.resolve()).then(function () { $('gh-msg').textContent = 'Klaar.'; }, function () { $('gh-msg').textContent = ''; });
    });
    paint();
  }

  /* melding bovenaan, bijvoorbeeld "Nieuwere invoer van een ander apparaat" */
  function notice(id, text, buttons) {
    var old = document.getElementById(id); if (old) old.remove();
    var tip = document.getElementById('tip'); if (!tip || !tip.parentNode) return;
    var d = document.createElement('div'); d.className = 'tip'; d.id = id;
    var s = document.createElement('span'); s.textContent = text; d.appendChild(s);
    var wrap = document.createElement('span'); wrap.style.cssText = 'display:flex;gap:.4rem;flex:none';
    (buttons || []).forEach(function (b) {
      var x = document.createElement('button'); x.type = 'button'; x.className = 'btn sm' + (b.primary ? ' primary' : ''); x.textContent = b.label;
      x.addEventListener('click', function () { d.remove(); if (b.fn) b.fn(); });
      wrap.appendChild(x);
    });
    d.appendChild(wrap);
    tip.parentNode.insertBefore(d, tip);
  }

  window.GhSync = {
    getConfig: getConfig, create: create, connect: connect, disconnect: disconnect,
    mountSettings: mountSettings, onStatus: onStatus, notice: notice, errorText: errorText,
    syncNow: null
  };
})();
