/* Rendimiento progresivo: si una API no existe, la web sigue funcionando. */
(function() {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const touch = matchMedia('(pointer: coarse)');

  function update() {
    window.ULTRA_LITE = reduced.matches || touch.matches ||
      (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4) ||
      (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) ||
      Boolean(navigator.connection?.saveData);
    root.classList.toggle('lite-mode', window.ULTRA_LITE);
  }
  for (const query of [reduced, touch]) {
    if (query.addEventListener) query.addEventListener('change', update);
    else if (query.addListener) query.addListener(update);
  }

  function visibility() {
    root.classList.toggle('page-hidden', document.hidden);
  }
  document.addEventListener('visibilitychange', visibility);
  update();
  visibility();
})();
