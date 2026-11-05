/* CONFIGURACIÓN DEL PORTAL */
const config = window.PORTAL_CONFIG;
const services = (window.PORTAL_CATALOG || []).map(s => ({
  ...s,
  tutorialUrl: '',
  whatsappMessage: s.type === 'course' ? `¡Hola! 😊 Me gustaría adquirir ${s.name}. ¿Me podrías dar más detalles del curso, el precio y tu método de pago, por favor?` : `¡Hola! 😊 Me gustaría adquirir ${s.name}. ¿Me podrías dar más detalles de la licencia, el precio y tu método de pago, por favor?`
}));

function whatsappUrl(number, message) {
  return /^\d{8,15}$/.test(number) ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

const htmlText = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
} [c]));
/* INTERACCIONES */
const $ = s => document.querySelector(s);
document.querySelectorAll('[data-brand]').forEach(el => el.textContent = config.name);
if (config.logoUrl) document.querySelectorAll('.brand-mark').forEach(el => {
  const img = new Image();
  img.src = config.logoUrl;
  img.alt = '';
  el.replaceChildren(img);
});
document.title = `${config.name} — Tus herramientas, en un solo lugar`;
if (config.domain) {
  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = config.domain;
  document.head.append(canonical);
}
const art = {
  orbit: '<div class="orbit-art"><b></b><b></b><b></b><b></b><b></b></div>',
  star: '<div class="star-art">✦</div><div class="star-mini">✦</div>',
  ribbon: '<div class="ribbon-art"><b></b><b></b><b></b></div>',
  eclipse: '<div class="eclipse-art"></div><div class="eclipse-line"></div>'
};

function notice(text, theme = '') {
  $('#notice').className = theme;
  $('#notice-text').textContent = text;
  $('#notice').showModal();
}
const cardFragment = document.createDocumentFragment();
services.forEach((s, i) => {
  const card = document.createElement('article');
  card.className = `card ${s.id} reveal`;
  card.dataset.cardId = s.id;
  card.style.setProperty('--card-order', Math.min(i, 7));
  card.innerHTML = `<div class="card-visual" aria-hidden="true"><div class="card-meta"><span>${htmlText(s.brand)}</span><span>↗</span></div><div class="brand-stage"><img decoding="async" loading="${i<3?'eager':'lazy'}" src="${window.PORTAL_BRANDS[s.id]}" alt="" width="100" height="100"><span>${htmlText(s.brand)}</span></div><span class="visual-caption">${htmlText(s.category)}</span></div><div class="card-copy"><span class="card-index">${String(i+1).padStart(2,'0')} / ${htmlText(s.category)}</span><h3>${htmlText(s.name)}</h3><p>${htmlText(s.description)}</p></div><div class="card-actions"><button type="button" class="button white access-trigger" aria-haspopup="dialog" aria-label="Acceder a ${htmlText(s.name)}">Ingresar <span>↗</span></button><a class="button contact" target="_blank" rel="noopener noreferrer" aria-label="Contratar ${htmlText(s.name)} por WhatsApp">Contratar <svg class="buy-whatsapp" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.4 11.6a8.4 8.4 0 0 1-12.5 7.3L3 20.3l1.4-4.7a8.4 8.4 0 1 1 16-4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.2 7.3c-.5.1-1 1-.8 2.1.5 2.7 3.3 5.4 6 5.8 1 .2 2-.4 2.1-1l.1-.9-2.3-1.1-.9 1c-1.5-.5-2.7-1.7-3.2-3.1l1-.9-1.1-2Z" fill="currentColor"/></svg></a></div>`;
  const buy = card.querySelector('.contact');
  buy.href = whatsappUrl(s.whatsapp || config.salesWhatsapp, s.whatsappMessage);
  if (!s.active) {
    card.classList.add('card-unavailable');
    card.tabIndex = 0;
    card.setAttribute('aria-disabled', 'true');
    card.setAttribute('aria-label', s.name + ': Agotado');
    const actions = card.querySelector('.card-actions');
    actions.classList.add('stock-actions');
    actions.inert = true;
    const stockLabel = document.createElement('span');
    stockLabel.className = 'button stock-button';
    stockLabel.textContent = 'Agotado';
    stockLabel.setAttribute('aria-hidden', 'true');
    actions.replaceChildren(stockLabel);
    card.addEventListener('click', e => {
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
  } else {
    card.querySelector('.access-trigger').addEventListener('click', () => openAccess(s));
  }
  cardFragment.append(card);
});
$('#cards').append(cardFragment);
$('#distributor-link').href = whatsappUrl(config.salesWhatsapp, 'Hola, estoy interesado en convertirme en distribuidor de licencias digitales. Quisiera recibir más información.');
document.querySelectorAll('#notice .close,#notice .close-notice').forEach(b => b.addEventListener('click', () => $('#notice').close()));
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('seen');
      observer.unobserve(e.target);
    }
  }), {
    threshold: .08
  });
  document.querySelectorAll('.reveal').forEach(el => {
    el.classList.add('animate');
    observer.observe(el);
  });
}

function openAccess(service) {
  parent.portalEnter(service.id);
}
