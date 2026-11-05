/* Panel editable. Se carga bajo demanda; no participa en el arranque público. */
(function setupTutorialManager() {
  const {
    devices,
    readRecord,
    saveRecord,
    allMetadata: allRecords
  } = window.portalTutorialStore;
  const icon = d => d.icon;
  const key = (s, d) => s + ':' + d;
  const root = document.createElement('div');
  root.id = 'tutorial-admin-root';
  root.className = 'admin-ui';
  root.innerHTML = `<dialog id="tutorial-admin-login" class="ta-lock" aria-labelledby="ta-lock-title">
 <button type="button" class="ta-x" id="ta-lock-close" aria-label="Cerrar acceso">×</button><span class="ta-eyebrow">ADMINISTRACIÓN</span><div class="ta-lock-symbol" aria-hidden="true">⌑</div><h2 id="ta-lock-title">Tu portal,<br>bajo tu control.</h2><p>Ingresa tu contraseña para editar las licencias y sus tutoriales.</p>
 <form id="ta-login-form"><label for="ta-password">Contraseña de acceso</label><input id="ta-password" type="password" inputmode="numeric" autocomplete="off" maxlength="32" required placeholder="Ingresa tu contraseña"><p id="ta-password-error" class="ta-error" role="alert" hidden>Contraseña incorrecta. Inténtalo de nuevo.</p><button class="ta-button ta-primary" type="submit">Entrar al panel <span aria-hidden="true">↗</span></button></form></dialog>
 <dialog id="tutorial-admin-panel" class="ta-panel" aria-labelledby="ta-title">
 <header class="ta-header"><div><span class="ta-eyebrow">ULTRASHOP / ADMINISTRACIÓN</span><h2 id="ta-title">Panel de licencias<span>.</span></h2><p>Una guía para cada licencia y cada dispositivo.</p></div><div class="ta-header-actions"><button type="button" class="ta-button ta-outline" id="ta-new-card">Nueva tarjeta +</button><button type="button" class="ta-button ta-quiet" id="ta-panel-close">Cerrar <span aria-hidden="true">×</span></button></div></header>
 <div class="ta-layout"><aside class="ta-sidebar"><div class="ta-sidebar-heading">TUS TARJETAS <span id="ta-card-count">0</span></div><nav class="ta-nav" id="ta-license-nav" aria-label="Seleccionar tarjeta"></nav><div class="ta-nav-pager"><button id="ta-nav-prev" type="button" aria-label="Tarjetas anteriores">‹</button><span id="ta-nav-page"></span><button id="ta-nav-next" type="button" aria-label="Tarjetas siguientes">›</button></div></aside><section class="ta-main"><label class="ta-mobile-select" for="ta-license-select">Tarjeta<select id="ta-license-select"></select></label><div class="ta-main-heading"><div class="ta-selected"><img id="ta-selected-logo" alt=""><div><span class="ta-eyebrow">TARJETA SELECCIONADA</span><h3 id="ta-selected-name"></h3></div></div><span id="ta-video-count" class="ta-count"></span></div><div class="ta-section-tabs" role="tablist" aria-label="Configuración de tarjeta"><button id="ta-tab-settings" type="button" role="tab" aria-selected="true" aria-controls="ta-settings-section">Tarjeta <span aria-hidden="true">▤</span></button><button id="ta-tab-appearance" type="button" role="tab" aria-selected="true" aria-controls="ta-appearance-section">Apariencia <span aria-hidden="true">✦</span></button><button id="ta-tab-videos" type="button" role="tab" aria-selected="false" aria-controls="ta-videos-section" tabindex="-1">Tutoriales <span id="ta-tab-count">0/4</span></button></div>
<section id="ta-settings-section" class="ta-section" role="tabpanel" aria-labelledby="ta-tab-settings">
<form id="ta-card-form" class="ta-card-settings">
<div class="ta-availability"><div><strong id="ta-active-label">Tarjeta activa</strong><p id="ta-active-description">Los clientes pueden ingresar y contratar.</p></div><label class="ta-switch" title="Activar o desactivar tarjeta"><input type="checkbox" id="ta-card-active" role="switch" aria-label="Tarjeta activa"><span aria-hidden="true"></span></label></div>
<div class="ta-settings-mode" aria-label="Datos de la tarjeta"><button id="ta-mode-details" type="button" aria-pressed="true">Datos</button><button id="ta-mode-access" type="button" aria-pressed="false">Accesos y WhatsApp</button></div><div class="ta-card-fields" data-part="details"><label class="ta-field ta-wide" data-editor-part="details" for="ta-brand-name">Nombre de la tarjeta<input id="ta-brand-name" maxlength="60" required autocomplete="off" placeholder="Ej. ChatGPT Pro"></label><label class="ta-field" data-editor-part="details">Categoría<input id="ta-card-category" maxlength="50" placeholder="Ej. Inteligencia artificial"></label><label class="ta-field" data-editor-part="access">WhatsApp de contratación<input id="ta-card-whatsapp" type="tel" placeholder="Vacío: usar el WhatsApp general" maxlength="20"><span class="ta-help">Solo afecta a Contratar. La renovación conserva el WhatsApp general.</span></label><label class="ta-field ta-wide" data-editor-part="details">Descripción<textarea id="ta-card-description" maxlength="300" rows="2" placeholder="Describe qué incluye esta tarjeta"></textarea></label><label class="ta-field" data-editor-part="access">Enlace de acceso<input id="ta-card-url" type="url" placeholder="https://" inputmode="url"></label><label class="ta-field" data-editor-part="access">Descarga de extensión<input id="ta-card-download" type="url" placeholder="https:// (opcional)" inputmode="url"></label></div>
<div class="ta-editor-actions"><button type="submit" id="ta-save-card" class="ta-button ta-primary">Guardar cambios ✓</button><button type="button" id="ta-discard-card" class="ta-text-button">Descartar</button><span id="ta-card-dirty" class="ta-help"></span><button id="ta-delete-card" type="button" class="ta-button ta-delete-card" aria-label="Eliminar tarjeta"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Eliminar</button></div>
</form></section>

<section id="ta-appearance-section" class="ta-section" role="tabpanel" aria-labelledby="ta-tab-appearance">
 <div class="ta-editor-grid"><form id="ta-brand-form" class="ta-brand-form">
 
 <div class="ta-logo-field"><span class="ta-field-title">Logotipo</span><div class="ta-logo-row"><div class="ta-logo-sample"><img id="ta-logo-sample" alt="Logo de la licencia"></div><div><button type="button" id="ta-upload-logo" class="ta-button ta-outline">Cambiar logo ↑</button><button type="button" id="ta-original-logo" class="ta-text-button">Usar original</button><span class="ta-help">PNG, JPG, WebP o SVG · Máx. 4 MB</span></div></div><input type="file" id="ta-logo-file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" hidden></div>
 <fieldset class="ta-colors"><legend>Colores de la licencia</legend><div class="ta-color-grid">
 <label>Principal<span class="ta-color-control"><input type="color" id="ta-color-0" aria-label="Color principal"><input type="text" id="ta-hex-0" aria-label="Código del color principal" maxlength="7" pattern="#[a-fA-F0-9]{6}" required></span></label>
 <label>Claro<span class="ta-color-control"><input type="color" id="ta-color-1" aria-label="Color claro"><input type="text" id="ta-hex-1" aria-label="Código del color claro" maxlength="7" pattern="#[a-fA-F0-9]{6}" required></span></label>
 <label>Secundario<span class="ta-color-control"><input type="color" id="ta-color-2" aria-label="Color secundario"><input type="text" id="ta-hex-2" aria-label="Código del color secundario" maxlength="7" pattern="#[a-fA-F0-9]{6}" required></span></label>
 </div></fieldset>
 <div class="ta-editor-actions"><button type="submit" id="ta-save-brand" class="ta-button ta-primary">Guardar cambios ✓</button><button type="button" id="ta-discard-brand" class="ta-text-button">Descartar</button></div>
 </form>
 <aside class="ta-preview-column"><div class="ta-preview-label">VISTA PREVIA <span id="ta-draft-state">Guardado</span></div><div id="ta-brand-preview" class="ta-brand-preview"><div class="ta-brand-art"><div class="ta-brand-orbit" aria-hidden="true"></div><img id="ta-preview-logo" alt=""></div><div class="ta-brand-preview-copy"><span>LICENCIA DIGITAL</span><h4 id="ta-preview-name"></h4><div class="ta-preview-buttons" aria-hidden="true"><span>Ingresar ↗</span><span>Contratar</span></div></div></div><p class="ta-help">Así se verá tu identidad en el catálogo y en las pantallas de la licencia.</p><button type="button" id="ta-reset-brand" class="ta-text-button">Restablecer apariencia original ↺</button></aside></div>
</section>
<section id="ta-videos-section" class="ta-section" role="tabpanel" aria-labelledby="ta-tab-videos" hidden><p class="ta-intro">La web muestra automáticamente el video del dispositivo del cliente. Sube aquí cada versión.</p><div id="ta-video-grid" class="ta-video-grid"></div></section>
</section></div>
 <footer class="ta-bottom"><div><strong>Guardado en este navegador</strong><p>Exporta para compartir tarjetas, diseños y videos.</p></div><button type="button" class="ta-button ta-outline" id="ta-export">Descargar ZIP <span aria-hidden="true">↓</span></button></footer><p id="ta-status" class="ta-status" role="status" aria-live="polite"></p></dialog><dialog id="ta-video-viewer" class="ta-video-viewer" aria-labelledby="ta-viewer-title"><div class="ta-viewer-header"><h3 id="ta-viewer-title">Vista previa</h3><button id="ta-preview-close" type="button" class="ta-button ta-quiet">Cerrar ×</button></div><video id="ta-viewer-video" controls playsinline preload="metadata"></video></dialog><dialog id="ta-delete-card-dialog" class="ta-delete-dialog" aria-labelledby="ta-delete-card-title"><h3 id="ta-delete-card-title">¿Eliminar esta tarjeta?</h3><div class="ta-delete-target"><img id="ta-delete-card-logo" alt=""><strong id="ta-delete-card-name"></strong></div><p>Dejará de aparecer en el portal y en el panel de administración.</p><p id="ta-delete-card-error" class="ta-error" role="alert" hidden></p><div class="ta-editor-actions"><button id="ta-delete-card-cancel" class="ta-button ta-quiet" type="button" autofocus>Conservar tarjeta</button><button id="ta-delete-card-confirm" class="ta-button ta-confirm-card-delete" type="button">Sí, eliminar</button></div></dialog><dialog id="ta-create-dialog" class="ta-create-dialog" aria-labelledby="ta-new-title"><h3 id="ta-new-title">Nueva tarjeta</h3><p>Crea una tarjeta y personaliza su contenido.</p><form id="ta-new-card-form"><label class="ta-field">Nombre<input id="ta-new-name" maxlength="60" required autocomplete="off" placeholder="Nombre de la tarjeta"></label><p id="ta-new-error" class="ta-error" role="alert" hidden></p><div class="ta-editor-actions"><button type="submit" class="ta-button ta-primary">Crear tarjeta +</button><button id="ta-create-close" type="button" class="ta-button ta-quiet">Cancelar</button></div></form></dialog>`;
  document.body.append(root);
  const $ = s => root.querySelector(s),
    login = $('#tutorial-admin-login'),
    panel = $('#tutorial-admin-panel');
  let navPage = 0,
    pendingCardDelete = null;
  const navSize = () => {
    const height = document.querySelector('.ta-sidebar')?.clientHeight || Math.min(780, window.innerHeight - 28) - 170;
    return Math.max(4, Math.min(12, Math.floor((height - 140) / 45)));
  };
  let authenticated = false,
    selectedService = serviceIds[0],
    renderVersion = 0,
    previewUrls = [],
    saving = new Set(),
    exporting = false;
  // Borradores por licencia: cambiar de pestaña o de licencia no pierde la edición.
  const brandDrafts = new Map();
  let activeAdminTab = 'settings',
    logoBusy = false;
  const clone = v => JSON.parse(JSON.stringify(v));

  function draft(id = selectedService) {
    if (!brandDrafts.has(id)) brandDrafts.set(id, clone(getLicenseAppearance(id)));
    return brandDrafts.get(id);
  }

  function isDirty(id = selectedService) {
    return JSON.stringify(draft(id)) !== JSON.stringify(getLicenseAppearance(id)) || settingsDirty(id);
  }

  function setAdminTab(name) {
    activeAdminTab = name;
    for (const tab of ['settings', 'appearance', 'videos']) {
      const active = tab === name;
      $('#ta-tab-' + tab).setAttribute('aria-selected', String(active));
      $('#ta-tab-' + tab).tabIndex = active ? 0 : -1;
      $('#ta-' + tab + '-section').hidden = !active;
    }
    if (name !== 'videos') releasePreviews();
  }
  const adminTabs = ['settings', 'appearance', 'videos'];
  for (const name of adminTabs) {
    $('#ta-tab-' + name).addEventListener('click', () => setAdminTab(name));
    $('#ta-tab-' + name).addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      let index = adminTabs.indexOf(activeAdminTab);
      index = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (index + (e.key === 'ArrowLeft' ? 2 : 1)) % 3;
      setAdminTab(adminTabs[index]);
      $('#ta-tab-' + adminTabs[index]).focus();
    });
  }

  function updateBrandPreview() {
    const value = draft(),
      custom = !!value.logo;
    $('#ta-preview-name').textContent = value.name || 'Nombre de la licencia';
    const url = value.logo || originalCardLogo(selectedService);
    for (const selector of ['#ta-preview-logo', '#ta-logo-sample']) {
      const img = $(selector);
      img.src = url;
      img.className = !custom && ['chatgpt', 'gpt-codex', 'grok', 'capcut'].includes(selectedService) ? 'ta-white-logo' : '';
    }
    value.colors.forEach((c, i) => $('#ta-brand-preview').style.setProperty('--preview-' + i, c));
    const dirty = isDirty();
    $('#ta-draft-state').textContent = dirty ? 'Sin guardar' : 'Guardado';
    $('#ta-draft-state').classList.toggle('is-dirty', dirty);
    $('#ta-save-brand').disabled = !dirty || logoBusy;
    $('#ta-discard-brand').disabled = !dirty || logoBusy;
    $('#ta-save-card').disabled = !dirty || logoBusy;
    $('#ta-discard-card').disabled = !dirty || logoBusy;
    $('#ta-card-dirty').textContent = dirty ? 'Sin guardar' : 'Guardado';
    root.querySelectorAll('.ta-license').forEach(b => b.classList.toggle('has-draft', !!getCardRecord(b.dataset.license) && isDirty(b.dataset.license)));
  }

  function populateBrandForm() {
    const value = draft();
    $('#ta-brand-name').value = value.name;
    value.colors.forEach((c, i) => {
      $('#ta-color-' + i).value = c;
      $('#ta-hex-' + i).value = c.toUpperCase();
    });
    updateBrandPreview();
  }
  $('#ta-brand-name').addEventListener('input', e => {
    draft().name = e.target.value;
    updateBrandPreview();
  });
  for (let i = 0; i < 3; i++) {
    $('#ta-color-' + i).addEventListener('input', e => {
      draft().colors[i] = e.target.value;
      $('#ta-hex-' + i).value = e.target.value.toUpperCase();
      updateBrandPreview();
    });
    $('#ta-hex-' + i).addEventListener('input', e => {
      if (/^#[a-f\d]{6}$/i.test(e.target.value)) {
        draft().colors[i] = e.target.value.toLowerCase();
        $('#ta-color-' + i).value = e.target.value;
        updateBrandPreview();
      }
    });
  }
  $('#ta-brand-form').addEventListener('submit', saveEditor);
  $('#ta-discard-brand').addEventListener('click', discardEditor);
  $('#ta-reset-brand').addEventListener('click', () => {
    brandDrafts.set(selectedService, {
      name: originalLicenseNames[selectedService],
      colors: [...originalLicenseColors[selectedService]],
      logo: null
    });
    populateBrandForm();
    status('Apariencia original preparada. Pulsa Guardar cambios para aplicarla.');
  });
  $('#ta-original-logo').addEventListener('click', () => {
    draft().logo = null;
    updateBrandPreview();
  });
  $('#ta-upload-logo').addEventListener('click', () => $('#ta-logo-file').click());
  $('#ta-logo-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || logoBusy) return;
    const id = selectedService;
    logoBusy = true;
    $('#ta-upload-logo').disabled = true;
    updateBrandPreview();
    status('Preparando el logotipo…');
    let url;
    try {
      if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) || file.size > 4 * 1024 * 1024 || !file.size) throw new Error('Usa PNG, JPG, WebP o SVG de hasta 4 MB.');
      url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      await img.decode();
      if (!img.naturalWidth || !img.naturalHeight) throw new Error('La imagen no tiene un tamaño válido.');
      const scale = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const logo = canvas.toDataURL('image/png');
      if (logo.length >= 750000) throw new Error('El logo contiene demasiado detalle. Usa una imagen más simple.');
      draft(id).logo = logo;
      status('Logo preparado. Guarda los cambios de ' + draft(id).name + ' para aplicarlo.');
    } catch (e) {
      status('No se pudo usar ese logo. ' + errorText(e), true);
    } finally {
      if (url) URL.revokeObjectURL(url);
      logoBusy = false;
      $('#ta-upload-logo').disabled = false;
      updateBrandPreview();
    }
  });
  $('#ta-license-select').addEventListener('change', e => {
    selectedService = e.target.value;
    navPage = Math.floor(serviceIds.indexOf(selectedService) / navSize());
    status('');
    renderPanel();
  });
  $('#ta-preview-close').addEventListener('click', () => $('#ta-video-viewer').close());
  $('#ta-video-viewer').addEventListener('close', () => releasePreviews());
  async function previewVideo(item, device) {
    const service = selectedService;
    try {
      item = await window.portalTutorials.get(service, device.id);
    } catch (error) {
      status(errorText(error), true);
      return;
    }
    if (!item || !panel.open || service !== selectedService) return;
    releasePreviews();
    const video = $('#ta-viewer-video');
    $('#ta-viewer-title').textContent = licenseNames[selectedService] + ' · ' + device.name;
    if (item.blob) {
      video.src = URL.createObjectURL(item.blob);
      previewUrls.push(video.src);
    } else video.src = item.url;
    $('#ta-video-viewer').showModal();
  }

  const cardDrafts = new Map();

  function cardDraft(id = selectedService) {
    if (!cardDrafts.has(id)) cardDrafts.set(id, clone(getCardRecord(id)));
    return cardDrafts.get(id);
  }

  function settingsDirty(id = selectedService) {
    return JSON.stringify(cardDraft(id)) !== JSON.stringify(getCardRecord(id));
  }

  function populateCardForm() {
    const value = cardDraft();
    $('#ta-card-active').checked = value.active;
    $('#ta-card-category').value = value.category;
    $('#ta-card-description').value = value.description;
    $('#ta-card-url').value = value.url;
    $('#ta-card-download').value = value.downloadUrl;
    $('#ta-card-whatsapp').value = value.whatsapp;
    updateAvailability();
  }

  function updateAvailability() {
    const active = cardDraft().active;
    $('#ta-active-label').textContent = active ? 'Tarjeta activa' : 'Tarjeta agotada';
    $('#ta-active-description').textContent = active ? 'Los clientes pueden ingresar y contratar.' : 'Se bloquean ambos botones y se muestra “Agotado” al pasar el mouse.';
    $('#ta-card-active').closest('.ta-availability').classList.toggle('is-unavailable', !active);
  }

  function setCardPart(part) {
    $('.ta-card-fields').dataset.part = part;
    $('#ta-mode-details').setAttribute('aria-pressed', String(part === 'details'));
    $('#ta-mode-access').setAttribute('aria-pressed', String(part === 'access'));
  }
  $('#ta-mode-details').addEventListener('click', () => setCardPart('details'));
  $('#ta-mode-access').addEventListener('click', () => setCardPart('access'));
  const cardInputs = {
    '#ta-card-category': 'category',
    '#ta-card-description': 'description',
    '#ta-card-url': 'url',
    '#ta-card-download': 'downloadUrl',
    '#ta-card-whatsapp': 'whatsapp'
  };
  Object.entries(cardInputs).forEach(([selector, field]) => $(selector).addEventListener('input', e => {
    cardDraft()[field] = e.target.value;
    updateBrandPreview();
  }));
  $('#ta-card-active').addEventListener('change', e => {
    cardDraft().active = e.target.checked;
    updateAvailability();
    updateBrandPreview();
  });

  function saveEditor(e) {
    e.preventDefault();
    if (!authenticated || logoBusy || exporting) return;
    if (!$('#ta-card-form').checkValidity()) {
      setAdminTab('settings');
      setCardPart($('#ta-card-form').querySelector(':invalid')?.closest('[data-editor-part]')?.dataset.editorPart || 'details');
      $('#ta-card-form').reportValidity();
      return;
    }
    if (!$('#ta-brand-form').checkValidity()) {
      setAdminTab('appearance');
      $('#ta-brand-form').reportValidity();
      return;
    }
    try {
      saveCardSettings(selectedService, cardDraft(), draft());
      cardDrafts.delete(selectedService);
      brandDrafts.delete(selectedService);
      status('Tarjeta guardada. Los cambios ya aparecen en el portal.');
      renderPanel();
    } catch (e) {
      status(errorText(e), true);
    }
  }

  function discardEditor() {
    brandDrafts.delete(selectedService);
    cardDrafts.delete(selectedService);
    populateCardForm();
    populateBrandForm();
    status('Cambios descartados.');
  }

  $('#ta-nav-prev').addEventListener('click', () => {
    navPage = Math.max(0, navPage - 1);
    renderPanel();
  });
  $('#ta-nav-next').addEventListener('click', () => {
    navPage++;
    renderPanel();
  });
  $('#ta-delete-card').addEventListener('click', () => {
    if (!authenticated || exporting || logoBusy || saving.size) return;
    pendingCardDelete = selectedService;
    $('#ta-delete-card-name').textContent = getLicenseAppearance(pendingCardDelete).name;
    $('#ta-delete-card-logo').src = getLicenseLogo(pendingCardDelete);
    $('#ta-delete-card-logo').className = ['chatgpt', 'gpt-codex', 'grok', 'capcut'].includes(pendingCardDelete) && !getLicenseAppearance(pendingCardDelete).logo ? 'ta-white-logo' : '';
    $('#ta-delete-card-error').hidden = true;
    $('#ta-delete-card-dialog').showModal();
    $('#ta-delete-card-cancel').focus();
  });
  $('#ta-delete-card-cancel').addEventListener('click', () => $('#ta-delete-card-dialog').close());
  $('#ta-delete-card-dialog').addEventListener('close', () => {
    pendingCardDelete = null;
    $('#ta-delete-card').focus();
  });
  $('#ta-delete-card-confirm').addEventListener('click', async () => {
    if (!authenticated || exporting || !pendingCardDelete || saving.size) return;
    const id = pendingCardDelete,
      index = serviceIds.indexOf(id),
      name = getLicenseAppearance(id).name;
    try {
      deleteCatalogCard(id);
      brandDrafts.delete(id);
      cardDrafts.delete(id);
      selectedService = serviceIds[Math.min(index, serviceIds.length - 1)];
      navPage = Math.floor(serviceIds.indexOf(selectedService) / navSize());
      activeAdminTab = 'settings';
      $('#ta-delete-card-dialog').close();
      await renderPanel();
      status('Tarjeta eliminada: ' + name + '.');
    } catch (error) {
      $('#ta-delete-card-error').textContent = errorText(error);
      $('#ta-delete-card-error').hidden = false;
    }
  });
  let adminResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(adminResizeTimer);
    adminResizeTimer = setTimeout(() => {
      if (authenticated && panel.open) renderPanel();
    }, 120);
  });
  window.addEventListener('storage', event => {
    if (event.key !== CATALOG_STORAGE || !authenticated || !panel.open) return;
    if (!getCardRecord(selectedService)) selectedService = serviceIds[0];
    renderPanel();
  });

  $('#ta-card-form').addEventListener('submit', saveEditor);
  $('#ta-discard-card').addEventListener('click', discardEditor);
  $('#ta-new-card').addEventListener('click', () => {
    if (!authenticated || exporting) return;
    $('#ta-new-card-form').reset();
    $('#ta-new-error').hidden = true;
    $('#ta-create-dialog').showModal();
    $('#ta-new-name').focus();
  });
  $('#ta-create-close').addEventListener('click', () => $('#ta-create-dialog').close());
  $('#ta-new-card-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!authenticated || exporting) return;
    const name = $('#ta-new-name').value.trim(),
      type = 'license';
    if (!name) {
      $('#ta-new-name').setCustomValidity('Escribe un nombre.');
      $('#ta-new-name').reportValidity();
      return;
    }
    try {
      const id = 'custom-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
      const colors = type === 'course' ? ['#ffcc80', '#ffeac9', '#f5a64a'] : ['#759aff', '#b8d1ff', '#516cd7'];
      saveCardSettings(id, {
        id,
        name,
        brand: name,
        type,
        category: 'General',
        description: '',
        url: '',
        downloadUrl: '',
        whatsapp: '',
        active: true
      }, {
        name,
        colors,
        logo: null
      });
      selectedService = id;
      navPage = Math.floor(serviceIds.indexOf(id) / navSize());
      activeAdminTab = 'settings';
      $('#ta-create-dialog').close();
      status('Tarjeta creada. Completa los datos, el logo y los colores.');
      renderPanel();
    } catch (e) {
      $('#ta-new-error').textContent = errorText(e);
      $('#ta-new-error').hidden = false;
    }
  });
  $('#ta-new-name').addEventListener('input', () => $('#ta-new-name').setCustomValidity(''));

  const palettes = {
    chatgpt: '#8bffce',
    canva: '#c6adff',
    gemini: '#a8ceff',
    capcut: '#e5e9ff',
    grok: '#d4dae3',
    claude: '#ffc4a1',
    perplexity: '#91fff3'
  };
  const size = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.ceil(n / 1024) + ' KB';
  const time = n => Math.floor(n / 60) + ':' + String(Math.floor(n % 60)).padStart(2, '0');

  function status(text, error = false) {
    $('#ta-status').textContent = text;
    $('#ta-status').classList.toggle('is-error', error);
  }

  function releasePreviews() {
    root.querySelectorAll('video').forEach(v => {
      v.pause();
      v.removeAttribute('src');
      v.load();
    });
    previewUrls.forEach(u => URL.revokeObjectURL(u));
    previewUrls = [];
  }

  function errorText(e) {
    return e?.name === 'QuotaExceededError' ? 'No hay espacio disponible en este navegador. Usa archivos más pequeños o libera espacio local.' : e?.message || 'No se pudo guardar el cambio. Inténtalo nuevamente.';
  }
  window.openPortalAdmin = function() {
    if (panel.open || login.open) return;
    authenticated = false;
    $('#ta-login-form').reset();
    $('#ta-password-error').hidden = true;
    login.showModal();
    $('#ta-password').focus({
      preventScroll: true
    });
  };
  $('#ta-lock-close').addEventListener('click', () => login.close());
  $('#ta-password').addEventListener('input', () => {
    $('#ta-password-error').hidden = true;
    $('#ta-password').removeAttribute('aria-invalid');
  });
  $('#ta-login-form').addEventListener('submit', e => {
    e.preventDefault();
    if ($('#ta-password').value !== window.ULTRASHOP_CONFIG.adminDemoKey) {
      $('#ta-password-error').hidden = false;
      $('#ta-password').setAttribute('aria-invalid', 'true');
      return;
    }
    authenticated = true;
    $('#ta-password').value = '';
    login.close();
    panel.showModal();
    status('');
    renderPanel();
  });
  $('#ta-panel-close').addEventListener('click', () => panel.close());
  panel.addEventListener('close', () => {
    authenticated = false;
    renderVersion++;
    releasePreviews();
    $('#ta-video-viewer').close();
    $('#ta-video-grid').replaceChildren();
  });
  async function renderPanel() {
    if (!authenticated || !panel.open) return;
    if (!getCardRecord(selectedService)) selectedService = serviceIds[0];
    const version = ++renderVersion;
    let records;
    try {
      records = await allRecords();
    } catch (e) {
      status('No se pudo abrir el almacenamiento local. ' + errorText(e), true);
      return;
    }
    if (version !== renderVersion || !panel.open) return;
    releasePreviews();
    const map = new Map(records.map(r => [r.key, r]));

    function available(s, d) {
      const r = map.get(key(s, d));
      return r ? !r.deleted : !!TUTORIAL_DEFAULTS[key(s, d)];
    }
    const accent = getLicenseAppearance(selectedService).colors[1];
    panel.style.setProperty('--ta-accent', accent);
    $('#ta-selected-name').textContent = licenseNames[selectedService];
    $('#ta-selected-logo').src = getLicenseLogo(selectedService);
    $('#ta-selected-logo').className = !getLicenseAppearance(selectedService).logo && ['chatgpt', 'gpt-codex', 'grok', 'capcut'].includes(selectedService) ? 'ta-white-logo' : '';
    $('#ta-video-count').textContent = devices.filter(d => available(selectedService, d.id)).length + ' / 4 videos';
    $('#ta-tab-count').textContent = devices.filter(d => available(selectedService, d.id)).length + '/4';
    const select = $('#ta-license-select');
    select.replaceChildren();
    serviceIds.forEach(id => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = licenseNames[id];
      select.append(option);
    });
    select.value = selectedService;
    populateCardForm();
    populateBrandForm();
    setAdminTab(activeAdminTab);
    const nav = $('#ta-license-nav');
    nav.replaceChildren();
    const pageSize = navSize(),
      pages = Math.max(1, Math.ceil(serviceIds.length / pageSize));
    navPage = Math.max(0, Math.min(navPage, pages - 1));
    $('#ta-card-count').textContent = serviceIds.length;
    $('#ta-nav-page').textContent = (navPage + 1) + ' / ' + pages;
    $('#ta-nav-prev').disabled = navPage === 0;
    $('#ta-nav-next').disabled = navPage >= pages - 1;
    $('#ta-delete-card').disabled = serviceIds.length <= 1 || exporting || logoBusy || saving.size > 0;
    $('#ta-delete-card').title = serviceIds.length <= 1 ? 'Conserva al menos una tarjeta en el portal.' : 'Eliminar ' + licenseNames[selectedService];
    serviceIds.slice(navPage * pageSize, (navPage + 1) * pageSize).forEach(id => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ta-license' + (id === selectedService ? ' is-selected' : '');
      button.setAttribute('aria-pressed', String(id === selectedService));
      button.dataset.license = id;
      button.title = licenseNames[id];
      const img = document.createElement('img');
      img.src = getLicenseLogo(id);
      img.alt = '';
      if (!getLicenseAppearance(id).logo && ['chatgpt', 'gpt-codex', 'grok', 'capcut'].includes(id)) img.className = 'ta-white-logo';
      const name = document.createElement('span');
      name.textContent = licenseNames[id];
      const count = document.createElement('small');
      count.textContent = getCardRecord(id).active ? devices.filter(d => available(id, d.id)).length + '/4' : 'Agotado';
      button.classList.toggle('is-off', !getCardRecord(id).active);
      button.append(img, name, count);
      button.addEventListener('click', () => {
        selectedService = id;
        status('');
        renderPanel();
      });
      nav.append(button);
    });
    updateBrandPreview();
    const grid = $('#ta-video-grid');
    grid.replaceChildren();
    devices.forEach(device => {
      const service = selectedService,
        k = key(service, device.id),
        record = map.get(k),
        item = record ? (record.deleted ? null : record) : TUTORIAL_DEFAULTS[k];
      const card = document.createElement('article');
      card.className = 'ta-video-card';
      card.dataset.device = device.id;
      card.innerHTML = `<div class="ta-card-top"><span class="ta-device-icon">${icon(device)}</span><h4>${device.name}</h4><span class="ta-file-state ${item?'has-video':''}">${item?'Disponible':'Sin video'}</span></div><div class="ta-file-info"><strong class="ta-filename"></strong><span class="ta-file-meta"></span></div><div class="ta-card-actions">${item?'<button class="ta-button ta-preview-video ta-quiet" type="button">Ver ▷</button>':''}<button class="ta-button ta-upload ${item?'ta-outline':'ta-primary'}" type="button">${item?'Reemplazar':'Subir video'} <span aria-hidden="true">↑</span></button>${item?'<button class="ta-delete" type="button" aria-label="Borrar tutorial de '+device.name+'">Borrar</button>':''}</div><input type="file" accept="video/mp4,video/webm,.mp4,.webm" class="ta-file-input" aria-label="Subir tutorial de ${device.name}" hidden><div class="ta-delete-confirm" hidden><p>¿Borrar el tutorial de ${device.name}?</p><button type="button" class="ta-button ta-cancel-delete">Cancelar</button><button type="button" class="ta-button ta-confirm-delete">Sí, borrar</button></div>`;
      if (item) {
        card.querySelector('.ta-filename').textContent = item.name || 'Tutorial incluido';
        card.querySelector('.ta-file-meta').textContent = [item.size ? size(item.size) : item.blob ? size(item.blob.size) : 'Incluido en la web', item.duration ? time(item.duration) : ''].filter(Boolean).join(' · ');
        card.querySelector('.ta-preview-video').addEventListener('click', () => previewVideo(item, device));
      } else {
        card.querySelector('.ta-filename').textContent = 'Sin tutorial';
        card.querySelector('.ta-file-meta').textContent = 'MP4 / WebM · Máx. 500 MB';
      }
      const input = card.querySelector('.ta-file-input');
      card.querySelector('.ta-upload').addEventListener('click', () => input.click());
      input.addEventListener('change', () => {
        const file = input.files[0];
        input.value = '';
        if (file) uploadVideo(service, device, file, card);
      });
      card.addEventListener('dragover', e => {
        e.preventDefault();
        card.classList.add('is-dragging');
      });
      card.addEventListener('dragleave', e => {
        if (!card.contains(e.relatedTarget)) card.classList.remove('is-dragging');
      });
      card.addEventListener('drop', e => {
        e.preventDefault();
        card.classList.remove('is-dragging');
        if (e.dataTransfer.files.length !== 1) {
          status('Selecciona un solo video para este dispositivo.', true);
          return;
        }
        uploadVideo(service, device, e.dataTransfer.files[0], card);
      });
      if (item) {
        const confirm = card.querySelector('.ta-delete-confirm');
        card.querySelector('.ta-delete').addEventListener('click', () => {
          confirm.hidden = false;
          card.querySelector('.ta-cancel-delete').focus();
        });
        card.querySelector('.ta-cancel-delete').addEventListener('click', () => {
          confirm.hidden = true;
          card.querySelector('.ta-delete').focus();
        });
        card.querySelector('.ta-confirm-delete').addEventListener('click', async () => {
          if (!authenticated || saving.has(k) || exporting) return;
          saving.add(k);
          setCardBusy(card, true);
          try {
            await saveRecord({
              key: k,
              service,
              device: device.id,
              deleted: true,
              updatedAt: Date.now()
            });
            status('Tutorial de ' + device.name + ' borrado de ' + licenseNames[service] + '.');
          } catch (e) {
            status(errorText(e), true);
          } finally {
            saving.delete(k);
            renderPanel();
          }
        });
      }
      setCardBusy(card, saving.has(k) || exporting);
      grid.append(card);
    });
  }

  function setCardBusy(card, busy) {
    card.classList.toggle('is-busy', busy);
    card.querySelectorAll('button,input').forEach(b => b.disabled = busy);
    card.setAttribute('aria-busy', String(busy));
  }
  async function inspectVideo(file) {
    if (!/\.(mp4|webm)$/i.test(file.name) || !file.size) throw new Error('Selecciona un video MP4 o WebM válido.');
    if (file.size > 500 * 1024 * 1024) throw new Error('El archivo supera los 500 MB. Sube una versión más liviana.');
    const url = URL.createObjectURL(file),
      probe = document.createElement('video');
    probe.preload = 'metadata';
    try {
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('No se pudo leer el video. Prueba con un MP4 compatible.')), 12000);
        probe.onloadedmetadata = () => {
          clearTimeout(timer);
          if (!Number.isFinite(probe.duration) || probe.duration <= 0 || !probe.videoWidth) reject(new Error('El archivo no contiene un video reproducible.'));
          else resolve(probe.duration);
        };
        probe.onerror = () => {
          clearTimeout(timer);
          reject(new Error('Este navegador no puede reproducir el archivo. Prueba con MP4 (H.264).'));
        };
        probe.src = url;
      });
    } finally {
      probe.removeAttribute('src');
      probe.load();
      URL.revokeObjectURL(url);
    }
  }
  async function uploadVideo(service, device, file, card) {
    const k = key(service, device.id);
    if (!authenticated || saving.has(k) || exporting) return;
    saving.add(k);
    setCardBusy(card, true);
    status('Comprobando y guardando el video de ' + device.name + '…');
    try {
      const duration = await inspectVideo(file);
      await saveRecord({
        key: k,
        service,
        device: device.id,
        blob: file,
        name: file.name,
        size: file.size,
        duration,
        updatedAt: Date.now(),
        deleted: false
      });
      status('Video de ' + device.name + ' guardado para ' + licenseNames[service] + '.');
    } catch (e) {
      status(errorText(e), true);
    } finally {
      saving.delete(k);
      renderPanel();
    }
  }
  // Exportar un ZIP conserva los recursos separados y evita videos en base64.
  $('#ta-export').addEventListener('click', async () => {
    if (!authenticated || exporting) return;
    if (logoBusy || serviceIds.some(id => isDirty(id))) {
      status('Guarda o descarta los cambios antes de exportar.', true);
      return;
    }
    if (saving.size) {
      status('Espera a que terminen las cargas.', true);
      return;
    }
    exporting = true;
    $('#ta-export').disabled = true;
    root.querySelectorAll('.ta-video-card').forEach(c => setCardBusy(c, true));
    try {
      if (!window.exportPortalZip) await loadPortalScript('js/exportar.js');
      await exportPortalZip({
        catalog: catalogRecords,
        appearance: appearanceOverrides,
        deleted: [...deletedCardIds],
        status
      });
      status('ZIP descargado con el portal y sus datos actuales.');
    } catch (error) {
      status(errorText(error), true);
    } finally {
      exporting = false;
      $('#ta-export').disabled = false;
      renderPanel();
    }
  });
})();
