document.documentElement.dataset.theme = 'dark';
(function() {
  const root = document.documentElement;

  function updateNavigation() {
    root.classList.toggle('nav-scrolled', window.scrollY > 16);
  }
  window.addEventListener('scroll', updateNavigation, {
    passive: true
  });
  window.addEventListener('pageshow', updateNavigation);
  document.addEventListener('DOMContentLoaded', updateNavigation);
  updateNavigation();
})();
