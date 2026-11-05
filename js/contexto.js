/* Comparte datos pequeños por referencia. No reconstruye HTML ni duplica recursos. */
(function() {
  const params = new URLSearchParams(location.search);
  const localRoute = document.documentElement.dataset;
  const service = localRoute.portalService || params.get('servicio') || 'chatgpt';
  const page = localRoute.portalPage || location.pathname.split('/').pop();
  if (parent === window || !parent.portalContext) {
    location.replace('../index.html#' + encodeURIComponent(page + '?servicio=' + service));
    return;
  }
  if (page === 'cliente.html' && !parent.portalHasSession(service)) {
    parent.portalNavigate('cliente.html?servicio=' + service, true);
    return;
  }
  const context = parent.portalContext(service);
  window.PORTAL_CONFIG = context.config;
  window.PORTAL_SERVICE = service;
  window.PORTAL_BRANDS = context.brands;
  window.PORTAL_LICENSES = context.licenses;
  window.PORTAL_CATALOG = context.catalog;
  window.PORTAL_SESSION = context.session || null;
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = context.styles;
    document.head.append(style);
    const anchor = localRoute.portalAnchor || decodeURIComponent(location.hash.slice(1));
    if (anchor) document.getElementById(anchor)?.scrollIntoView();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.quiet-footer-logo')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    parent.portalFooterTap();
  }, true);
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (/^(index|cliente|privacidad|terminos)\.html(?:[?#]|$)/.test(href)) {
      event.preventDefault();
      parent.portalNavigate(href);
    } else if (href.startsWith('#')) {
      event.preventDefault();
      document.getElementById(href.slice(1))?.scrollIntoView({
        behavior: window.ULTRA_LITE ? 'auto' : 'smooth'
      });
    }
  });
})();
