// Gedeelde onderbalk (Home plus een knop per tool) en de lijst met tools voor de startpagina.
// Een nieuwe tool toevoegen: één regel in TOOLS hieronder, plus de bestanden in LOCAL in sw.js.
(function () {
  var TOOLS = [
    { href: 'index.html', name: 'Locatie delen', label: 'Locatie', icon: 'icons/icon-192.png',
      svg: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>' },
    { href: 'route.html', name: 'Route knijperwagen', label: 'Route', icon: 'icons/route-icon-192.png',
      svg: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>' },
    { href: 'projecten.html', name: 'Projecten', label: 'Projecten', icon: 'icons/projecten-icon-192.png',
      svg: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h6"/>' }
  ];
  var HOME = { href: 'start.html', label: 'Home', svg: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>' };
  window.GWW_TOOLS = TOOLS;

  var here = location.pathname.split('/').pop() || 'start.html';
  var nav = document.createElement('nav');
  nav.className = 'appnav';
  nav.setAttribute('aria-label', 'Hoofdnavigatie');
  [HOME].concat(TOOLS).forEach(function (t) {
    var a = document.createElement('a');
    a.href = t.href;
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + t.svg + '</svg><span></span>';
    a.lastChild.textContent = t.label;
    if (t.href === here) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  });
  document.body.appendChild(nav);

  // terugknop links in de kop van de tools (niet op Home): terug in de geschiedenis, anders naar Home
  var inner = document.querySelector('.brand .in');
  if (inner && here !== 'start.html') {
    var back = document.createElement('button');
    back.type = 'button'; back.className = 'back'; back.setAttribute('aria-label', 'Terug'); back.title = 'Terug';
    back.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    back.onclick = function () { if (history.length > 1) history.back(); else location.href = 'start.html'; };
    inner.insertBefore(back, inner.firstChild);
  }
  document.documentElement.classList.add('has-nav');
})();
