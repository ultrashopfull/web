const frame = document.getElementById('portal-view');
const CATALOG_STORAGE = 'ultrashop-catalog-v1',
  APPEARANCE_STORAGE = 'ultrashop-apariencia-v1';
const sessions = new Map();
const sessionTimers = new Map();
let pendingLicense = null;

const originalLicenseColors = {
  chatgpt: ['#27e6a3', '#8bffce', '#0bbd83'],
  gemini: ['#4285f4', '#a8ceff', '#2465d8'],
  canva: ['#9d63ff', '#b76bff', '#20bfe9'],
  grok: ['#bcc4d1', '#e5e6eb', '#6f7b91'],
  claude: ['#f1956b', '#ffd1ac', '#e3744e'],
  perplexity: ['#21d3ce', '#91fff3', '#0fa9b5'],
  capcut: ['#f4f4ff', '#e6eaff', '#becaff'],
  'cinema-course': ['#8f2648', '#edb3c5', '#591329'],
  'image-course': ['#f3c742', '#ffed9e', '#bc8a16'],
  antigravity: ['#81a7ff', '#c2d4ff', '#7864e8'],
  'gpt-codex': ['#8edcb5', '#d4fbe7', '#459a79'],
  higgsfield: ['#cded69', '#edffb7', '#91b338'],
};

/* ─── Supabase client ─────────────────────────────────────────────────────── */
let sb = null;
try {
  const cfg = window.ULTRASHOP_CONFIG || {};
  if (window.supabase?.createClient && cfg.supabaseUrl && cfg.supabaseAnonKey &&
      cfg.supabaseAnonKey !== 'PEGA_AQUI_TU_ANON_KEY_REAL') {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
} catch (e) { console.warn('[portal] Supabase no disponible:', e); }

const API_BASE = ((window.ULTRASHOP_CONFIG || {}).apiBase || '').replace(/\/+$/, '');

function adminCall(action, payload = {}) {
  if (!API_BASE) return Promise.reject(new Error('API_NOT_CONFIGURED'));
  return fetch(API_BASE + '/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      admin_password: window.ULTRASHOP_CONFIG.adminDemoKey,
      action,
      payload,
    }),
  }).then(async r => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.success) throw new Error(data.mensaje || data.motivo || 'No se pudo guardar.');
    return data;
  });
}

/* ─── Acceso real de clientes ─────────────────────────────────────────────── */
function getDeviceId() {
  try {
    let id = localStorage.getItem('ultrashop-device-id');
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() || ('dev-' + Date.now() + '-' + Math.random().toString(36).slice(2));
      localStorage.setItem('ultrashop-device-id', id);
    }
    return id;
  } catch { return 'dev-' + Date.now(); }
}

async function apiPost(fn, body, timeoutMs = 15000) {
  if (!API_BASE) throw new Error('API_NOT_CONFIGURED');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(API_BASE + '/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } finally { clearTimeout(t); }
}

function loginErrorMessage(data) {
  switch (data?.motivo) {
    case 'CREDENCIALES':    return 'Usuario o contraseña incorrectos.';
    case 'FALTAN_DATOS':    return 'Escribe tu usuario y tu contraseña.';
    case 'VENCIDO':         return 'Tu licencia ha vencido. Renueva para continuar.';
    case 'SUSPENDIDO':      return 'Tu cuenta está suspendida. Contacta con soporte.';
    case 'SIN_SUSCRIPCION': return 'No tienes una suscripción activa de este producto.';
    case 'SIN_CUENTA':      return 'No hay cuentas disponibles para este producto. Contacta con soporte.';
    case 'SIN_PRODUCTO':    return 'Este producto no está configurado en el sistema. Contacta con soporte.';
    case 'ERROR_SERVIDOR':  return 'Error del servidor. Inténtalo más tarde.';
    default:                return data?.mensaje || 'No se pudo verificar tu cuenta.';
  }
}

function stopSessionMonitor(id) {
  const t = sessionTimers.get(id);
  if (!t) return;
  clearTimeout(t.initial);
  clearInterval(t.interval);
  sessionTimers.delete(id);
}

function startSessionMonitor(id) {
  stopSessionMonitor(id);
  const session = sessions.get(id);
  if (!session) return;
  const tick = async () => {
    if (!sessions.has(id)) { stopSessionMonitor(id); return; }
    try {
      const { data } = await apiPost('verificar-estado', {
        usuario: session.usuario,
        producto: id,
        device_id: getDeviceId(),
        client_migration_nonce: session.migration_nonce,
      });
      if (!data?.activo) {
        sessions.delete(id);
        stopSessionMonitor(id);
        const route = getRoute(hashRoute());
        if (route.page === 'cliente.html' && route.service === id) portalNavigate('index.html', true);
        if (data?.motivo === 'OTRO_DISPOSITIVO') alert('Tu cuenta se inició en otro dispositivo.');
        return;
      }
      if (typeof data.dias_restantes === 'number') session.suscripcion.dias_restantes = data.dias_restantes;
      if (data.fecha_vencimiento) session.suscripcion.fecha_vencimiento = data.fecha_vencimiento;
      if (data.migration_nonce) session.migration_nonce = data.migration_nonce;
    } catch {}
  };
  const initial = setTimeout(tick, 3000);
  const interval = setInterval(tick, 60000);
  sessionTimers.set(id, { initial, interval });
}

function pruneSessions() {
  for (const id of [...sessions.keys()]) {
    const card = getCardRecord(id);
    if (!card || !card.active) {
      sessions.delete(id);
      stopSessionMonitor(id);
    }
  }
}

/* ─── Catálogo ───────────────────────────────────────────────────────────── */
function cleanCard(value) {
  if (value?.id === 'claude-code') return null;
  if (!value || typeof value !== 'object' || !/^[a-z][a-z0-9-]{0,70}$/.test(value.id)) return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name || name.length > 60) return null;
  const text = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const url = v => { if (!v) return ''; try { const p = new URL(String(v)); return /^https?:$/.test(p.protocol) ? p.href : null; } catch { return null; } };
  const access = url(value.url), download = url(value.downloadUrl);
  let whatsapp = text(value.whatsapp, 20).replace(/[\s+()-]/g, '');
  if (whatsapp && /^\d{8}$/.test(whatsapp)) whatsapp = '591' + whatsapp;
  if (access === null || download === null || (whatsapp && !/^\d{8,15}$/.test(whatsapp))) return null;
  return {
    id: value.id, name,
    brand: text(value.brand, 60) || name,
    category: text(value.category, 50) || 'Licencia digital',
    description: text(value.description, 300),
    url: access, downloadUrl: download, whatsapp,
    type: value.type === 'course' ? 'course' : 'license',
    active: value.active !== false,
    visible: true,
  };
}

function catalogFrom(entries) {
  const map = new Map(BUILTIN_CATALOG.map(c => [c.id, cleanCard(c)]));
  if (Array.isArray(entries))
    for (const item of entries) {
      const clean = cleanCard(item);
      if (clean) {
        if (clean.id === 'gemini' && ["Genera videos sin límites y accede a Nano Banana ilimitado y NotebookLM.", "Crea videos e imágenes con Gemini y Nano Banana. Aprende más con NotebookLM."].includes(clean.description))
          clean.description = "Crea videos con Flow e imágenes con Nano Banana sin límites. Incluye NotebookLM y Gemini Chat.";
        map.set(clean.id, clean);
      }
    }
  return [...map.values()].filter(card => card && !deletedCardIds.has(card.id));
}

let savedCatalog = {};
try { savedCatalog = JSON.parse(localStorage.getItem(CATALOG_STORAGE) || '{}') || {}; } catch {}
let deletedCardIds = new Set([...DELETED_CARDS_DEFAULTS, ...(Array.isArray(savedCatalog.deletedIds) ? savedCatalog.deletedIds : [])]);
let catalogRecords = catalogFrom(Array.isArray(savedCatalog.items) ? savedCatalog.items : CATALOG_DEFAULTS);
const serviceIds = [], licenseNames = {}, originalLicenseNames = {};

function syncCatalogIdentity() {
  serviceIds.splice(0, serviceIds.length, ...catalogRecords.map(c => c.id));
  for (const c of catalogRecords) {
    originalLicenseNames[c.id] = BUILTIN_CATALOG.find(x => x.id === c.id)?.name || c.name;
    originalLicenseColors[c.id] ||= c.type === 'course' ? ['#ffcc80', '#ffeac9', '#f5a64a'] : ['#759aff', '#b8d1ff', '#516cd7'];
  }
}
syncCatalogIdentity();

function cleanAppearance(value) {
  if (!value || typeof value !== 'object') return null;
  const name = typeof value.name === 'string' ? value.name.trim().slice(0, 60) : '';
  const colors = Array.isArray(value.colors) && value.colors.length === 3 && value.colors.every(c => /^#[\da-f]{6}$/i.test(c)) ? value.colors : null;
  const logo = typeof value.logo === 'string' && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value.logo) && value.logo.length < 750000 ? value.logo : null;
  return name && colors ? { name, colors, logo } : null;
}

function loadAppearance(saved) {
  const result = {};
  let legacy = {};
  try { legacy = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE) || '{}') || {}; } catch {}
  for (const id of serviceIds) {
    const item = cleanAppearance(saved?.[id]) || cleanAppearance(legacy[id]) || cleanAppearance(APPEARANCE_DEFAULTS[id]);
    if (item) {
      const previous = { 'cinema-course': ['#ffcc80', '#ffeac9', '#f5a64a'], 'image-course': ['#c49bff', '#e3ceff', '#8a62d2'] }[id];
      if (previous && item.colors.every((c, i) => c.toLowerCase() === previous[i])) item.colors = [...originalLicenseColors[id]];
      result[id] = item;
    }
  }
  return result;
}
let appearanceOverrides = loadAppearance(savedCatalog.appearance);

function getCardRecord(id) { return catalogRecords.find(c => c.id === id); }
function getLicenseAppearance(id) {
  return appearanceOverrides[id] || {
    name: getCardRecord(id)?.name || originalLicenseNames[id],
    colors: [...(originalLicenseColors[id] || ['#759aff', '#b8d1ff', '#516cd7'])],
    logo: null,
  };
}
const fallbackCardLogo = 'assets/brands/fallback.svg';
const courseCardLogo = 'assets/brands/course.svg';
function originalCardLogo(id) {
  return (BUILTIN_CATALOG.some(card => card.id === id) ? 'assets/brands/' + id + (id === 'higgsfield' ? '.png' : '.svg') : null)
    || (getCardRecord(id)?.type === 'course' ? courseCardLogo : fallbackCardLogo);
}
function getLicenseLogo(id) { return getLicenseAppearance(id).logo || originalCardLogo(id); }
function syncAppearanceNames() { for (const id of serviceIds) licenseNames[id] = getLicenseAppearance(id).name; }
syncAppearanceNames();
function getCatalogServices() {
  return catalogRecords.map(c => {
    const a = getLicenseAppearance(c.id);
    return { ...c, name: a.name, brand: appearanceOverrides[c.id] ? a.name : c.brand };
  });
}

/* ─── Carga desde Supabase + Realtime ────────────────────────────────────── */
function serverRowToCard(row) {
  return {
    id: row.id, name: row.name, brand: row.brand,
    category: row.category, description: row.description,
    url: row.url, downloadUrl: row.download_url,
    whatsapp: row.whatsapp, type: row.type,
    active: row.active, visible: row.visible,
  };
}

async function loadFromSupabase() {
  if (!sb) return false;
  try {
    const [{ data: cards, error: e1 }, { data: settings, error: e2 }] = await Promise.all([
      sb.from('portal_cards').select('*').order('sort_order'),
      sb.from('portal_settings').select('*').eq('id', true).maybeSingle(),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;

    const rows = Array.isArray(cards) ? cards : [];
    const serverDeleted = rows.filter(r => r.deleted).map(r => r.id);
    const activeRows = rows.filter(r => !r.deleted);

    const settingsDeleted = Array.isArray(settings?.deleted_ids) ? settings.deleted_ids : [];
    deletedCardIds = new Set([...DELETED_CARDS_DEFAULTS, ...settingsDeleted, ...serverDeleted]);

    const clientCards = activeRows.map(serverRowToCard);
    catalogRecords = catalogFrom(clientCards);

    const serverAppearance = {};
    for (const row of activeRows) {
      const app = cleanAppearance(row.appearance);
      if (app) serverAppearance[row.id] = app;
    }
    appearanceOverrides = loadAppearance(serverAppearance);

    syncCatalogIdentity();
    syncAppearanceNames();
    pruneSessions();
    return true;
  } catch (e) {
    console.warn('[portal] No se pudo cargar de Supabase, usando localStorage:', e);
    return false;
  }
}

let reloadTimer = null;
function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(async () => {
    await loadFromSupabase();
    draw(hashRoute());
    window.dispatchEvent(new CustomEvent('portal-catalog-updated'));
  }, 250);
}

function subscribeRealtime() {
  if (!sb) return;
  try {
    sb.channel('portal_catalog_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_cards' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_settings' }, scheduleReload)
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') console.warn('[portal] Realtime error');
      });
  } catch (e) { console.warn('[portal] Realtime no disponible:', e); }
}

/* ─── Guardado (admin) ───────────────────────────────────────────────────── */
async function saveCardSettings(id, record, value) {
  if (deletedCardIds.has(id)) throw new Error('Esta tarjeta fue eliminada. Crea una tarjeta nueva.');
  const appearance = cleanAppearance(value);
  const card = cleanCard({ ...record, id, name: appearance?.name });
  if (!appearance || !card) throw new Error('Revisa el nombre, los enlaces y el número de WhatsApp.');

  if (sb && API_BASE) {
    await adminCall('save_card', { id, card, appearance });
    await loadFromSupabase();
  } else {
    const items = catalogRecords.some(c => c.id === id)
      ? catalogRecords.map(c => c.id === id ? card : c)
      : [...catalogRecords, card];
    const nextAppearance = { ...appearanceOverrides, [id]: appearance };
    localStorage.setItem(CATALOG_STORAGE, JSON.stringify({
      items, appearance: nextAppearance, deletedIds: [...deletedCardIds],
    }));
    catalogRecords = items;
    appearanceOverrides = nextAppearance;
    syncCatalogIdentity();
    syncAppearanceNames();
  }
  draw(hashRoute());
  window.dispatchEvent(new CustomEvent('portal-catalog-updated'));
}

async function deleteCatalogCard(id) {
  if (!getCardRecord(id)) throw new Error('La tarjeta ya no está disponible.');
  if (catalogRecords.length <= 1) throw new Error('Conserva al menos una tarjeta en el portal.');

  if (sb && API_BASE) {
    await adminCall('delete_card', { id });
    await loadFromSupabase();
  } else {
    const items = catalogRecords.filter(c => c.id !== id);
    const deleted = new Set([...deletedCardIds, id]);
    const appearance = { ...appearanceOverrides };
    delete appearance[id];
    localStorage.setItem(CATALOG_STORAGE, JSON.stringify({
      items, appearance, deletedIds: [...deleted],
    }));
    deletedCardIds = deleted;
    catalogRecords = items;
    appearanceOverrides = appearance;
    syncCatalogIdentity();
    syncAppearanceNames();
  }
  sessions.delete(id);
  stopSessionMonitor(id);
  if (pendingLicense === id) {
    document.getElementById('license-access').close();
    pendingLicense = null;
  }
  portalNavigate('index.html');
  window.dispatchEvent(new CustomEvent('portal-catalog-updated'));
}

/* ─── Migración: primera vez con Supabase vacío ──────────────────────────── */
window.portalSeedIfEmpty = async function () {
  if (!sb) return { seeded: 0 };
  const { count } = await sb.from('portal_cards').select('*', { count: 'exact', head: true });
  if (count > 0) return { seeded: 0 };
  const items = Array.isArray(savedCatalog.items) ? savedCatalog.items : [];
  if (!items.length) return { seeded: 0 };
  const cards = items.map(item => ({ ...item, appearance: savedCatalog.appearance?.[item.id] || null }));
  const res = await adminCall('seed', {
    cards,
    deletedIds: Array.isArray(savedCatalog.deletedIds) ? savedCatalog.deletedIds : [],
  });
  await loadFromSupabase();
  return res;
};

/* ─── Resto ──────────────────────────────────────────────────────────────── */
function appearanceStyles() {
  return serviceIds.map(id => {
    const custom = appearanceOverrides[id];
    if (!custom && BUILTIN_CATALOG.some(c => c.id === id) && !['cinema-course', 'image-course', 'antigravity', 'gpt-codex', 'higgsfield'].includes(id)) return '';
    const [a, b, c] = getLicenseAppearance(id).colors;
    return '.' + id + ',body.' + id + ',.cards .' + id + '{--glow:' + a + ';--btn-a:' + a + ';--btn-b:' + b + ';--btn-c:' + c + ';}'
      + '.cards .' + id + ' .card-visual{background:radial-gradient(ellipse at 50% 65%,color-mix(in srgb,' + a + ' 25%,transparent),transparent 72%),linear-gradient(145deg,color-mix(in srgb,' + c + ' 18%,#111820),#0d1118)!important;}'
      + (custom?.logo ? '.' + id + ' .brand-stage img,.' + id + ' .pass-product>img,.' + id + ' .cover-license img{filter:none!important;object-fit:contain;}' : '');
  }).join('');
}

window.portalContext = function (service) {
  const active = sessions.get(service);
  return {
    service,
    brands: Object.fromEntries(serviceIds.map(id => [id, getLicenseLogo(id)])),
    licenses: appearanceOverrides,
    catalog: getCatalogServices(),
    styles: appearanceStyles(),
    config: window.ULTRASHOP_CONFIG,
    session: active ? { cliente: active.cliente, suscripcion: active.suscripcion } : null,
  };
};
window.portalHasSession = id => sessions.has(id);

function getRoute(raw) {
  const url = new URL(raw, 'https://portal.invalid/');
  const page = url.pathname.split('/').pop() || 'index.html';
  return {
    page: ['index.html', 'cliente.html', 'privacidad.html', 'terminos.html'].includes(page) ? page : 'index.html',
    service: serviceIds.includes(url.searchParams.get('servicio')) ? url.searchParams.get('servicio') : 'chatgpt',
    anchor: url.hash.slice(1),
  };
}

function loadPortalView(route) {
  if (location.protocol !== 'file:') {
    frame.removeAttribute('srcdoc');
    frame.src = 'views/' + route.page + '?servicio=' + encodeURIComponent(route.service) +
      (route.anchor ? '#' + encodeURIComponent(route.anchor) : '');
    return;
  }
  const escapeAttribute = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const template = window.ULTRASHOP_LOCAL_VIEWS[route.page];
  frame.removeAttribute('src');
  frame.srcdoc = template
    .replace('<html lang="es">', '<html lang="es" data-portal-page="' + escapeAttribute(route.page) +
      '" data-portal-service="' + escapeAttribute(route.service) +
      '" data-portal-anchor="' + escapeAttribute(route.anchor || '') + '">')
    .replace('<base href="../">', '<base href="' + escapeAttribute(new URL('./', location.href).href) + '">');
}

function draw(raw) {
  const r = getRoute(raw);
  if (r.page === 'cliente.html' && !sessions.has(r.service)) {
    loadPortalView({ page: 'index.html', service: r.service, anchor: '' });
    document.title = 'UltraShop — Licencias digitales';
    openLicenseAccess(r.service);
    return;
  }
  loadPortalView(r);
  document.title = r.page === 'cliente.html' ? 'Mi licencia — UltraShop'
    : r.page === 'privacidad.html' ? 'Privacidad — UltraShop'
    : r.page === 'terminos.html' ? 'Términos — UltraShop'
    : 'UltraShop — Licencias digitales';
}

window.portalNavigate = function (raw, replace = false) {
  const r = getRoute(raw);
  const target = r.page + (r.page === 'cliente.html' ? '?servicio=' + r.service : '') + (r.anchor ? '#' + r.anchor : '');
  try { history[replace ? 'replaceState' : 'pushState'](null, '', '#' + encodeURIComponent(target)); } catch {}
  draw(target);
};
window.portalEnter = function (id) {
  if (!serviceIds.includes(id) || !getCardRecord(id)?.active) return;
  openLicenseAccess(id);
};

let accessViewportFrame = 0;
function syncLicenseAccessViewport() {
  const dialog = document.getElementById('license-access');
  if (!window.matchMedia('(max-width:700px)').matches) {
    dialog.style.removeProperty('--access-viewport-height');
    dialog.style.removeProperty('--access-viewport-top');
    return;
  }
  const v = window.visualViewport;
  dialog.style.setProperty('--access-viewport-height', (v ? v.height : window.innerHeight) + 'px');
  dialog.style.setProperty('--access-viewport-top', (v ? v.offsetTop : 0) + 'px');
}
function scheduleLicenseAccessViewport() {
  if (!document.getElementById('license-access').open) return;
  cancelAnimationFrame(accessViewportFrame);
  accessViewportFrame = requestAnimationFrame(syncLicenseAccessViewport);
}
window.addEventListener('resize', scheduleLicenseAccessViewport);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', scheduleLicenseAccessViewport);
  window.visualViewport.addEventListener('scroll', scheduleLicenseAccessViewport);
}

function openLicenseAccess(id) {
  if (!serviceIds.includes(id) || !getCardRecord(id)?.active) return;
  pendingLicense = id;
  const dialog = document.getElementById('license-access');
  dialog.dataset.service = id;
  ['--access-accent', '--access-light', '--access-deep'].forEach((name, i) => dialog.style.setProperty(name, getLicenseAppearance(id).colors[i]));
  document.getElementById('access-logo').src = getLicenseLogo(id);
  dialog.classList.toggle('has-custom-logo', !!getLicenseAppearance(id).logo);
  document.getElementById('license-access-form').reset();
  document.getElementById('access-title').textContent = licenseNames[id];
  const err = document.getElementById('access-error');
  err.hidden = true; err.textContent = '';
  ['license-user', 'license-password'].forEach(f => document.getElementById(f).removeAttribute('aria-invalid'));
  const btn = document.querySelector('#license-access-form button[type=submit]');
  btn.disabled = false;
  btn.textContent = 'Ingresar a mi licencia ↗';
  dialog.classList.remove('access-arriving');
  syncLicenseAccessViewport();
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  void dialog.offsetWidth;
  dialog.classList.add('access-arriving');
  document.getElementById('license-user').focus({ preventScroll: true });
  scheduleLicenseAccessViewport();
}

const accessDialog = document.getElementById('license-access');
accessDialog.addEventListener('focusin', scheduleLicenseAccessViewport);
accessDialog.addEventListener('animationend', e => { if (e.target === accessDialog) scheduleLicenseAccessViewport(); });
document.getElementById('access-close').addEventListener('click', () => accessDialog.close());
accessDialog.addEventListener('close', () => { pendingLicense = null; });
['license-user', 'license-password'].forEach(f => {
  document.getElementById(f).addEventListener('input', () => {
    document.getElementById('access-error').hidden = true;
    document.getElementById(f).removeAttribute('aria-invalid');
  });
});

document.getElementById('license-access-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!pendingLicense) return;
  const id = pendingLicense;
  const usuario = document.getElementById('license-user').value.trim();
  const password = document.getElementById('license-password').value;
  const errorBox = document.getElementById('access-error');
  const btn = event.submitter || document.querySelector('#license-access-form button[type=submit]');
  errorBox.hidden = true; errorBox.textContent = '';

  if (!usuario || !password) {
    errorBox.textContent = 'Escribe tu usuario y tu contraseña.';
    errorBox.hidden = false;
    return;
  }
  if (!API_BASE) {
    errorBox.textContent = 'El acceso real todavía no está configurado. Contacta con soporte.';
    errorBox.hidden = false;
    return;
  }

  const original = btn.textContent;
  btn.disabled = true; btn.textContent = 'Verificando…';
  try {
    const { data } = await apiPost('login', { usuario, password, producto: id, device_id: getDeviceId() });
    if (!data?.success) {
      errorBox.textContent = loginErrorMessage(data);
      errorBox.hidden = false;
      if (data?.motivo === 'CREDENCIALES') {
        const p = document.getElementById('license-password');
        p.setAttribute('aria-invalid', 'true');
        p.focus({ preventScroll: true });
      }
      return;
    }
    sessions.set(id, {
      usuario,
      cliente: data.cliente,
      suscripcion: data.suscripcion,
      revoke_nonce: data.revoke_nonce || null,
      migration_nonce: data.migration_nonce || null,
      verifiedAt: Date.now(),
    });
    document.getElementById('license-user').value = '';
    document.getElementById('license-password').value = '';
    accessDialog.close();
    portalNavigate('cliente.html?servicio=' + id);
    frame.focus();
    startSessionMonitor(id);
  } catch (e) {
    errorBox.textContent = e?.message === 'API_NOT_CONFIGURED'
      ? 'El acceso real todavía no está configurado. Contacta con soporte.'
      : 'No se pudo conectar. Revisa tu conexión e inténtalo nuevamente.';
    errorBox.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = original;
  }
});

window.portalLogout = function () {
  document.getElementById('license-access').close();
  pendingLicense = null;
  delete window.ultraProfileDraft;
  delete window.ultraLicenseCodes;
  for (const id of [...sessions.keys()]) stopSessionMonitor(id);
  sessions.clear();
  portalNavigate('index.html', true);
  frame.focus();
};

function hashRoute() {
  try { return decodeURIComponent(location.hash.slice(1)) || 'index.html'; } catch { return 'index.html'; }
}
window.addEventListener('popstate', () => draw(hashRoute()));

let adminTaps = 0, adminLastTap = 0, adminLoading = false;
window.loadPortalScript = function (path) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = path;
    s.onload = resolve;
    s.onerror = () => { s.remove(); reject(new Error('No se pudo cargar ' + path)); };
    document.head.append(s);
  });
};
window.portalFooterTap = async function () {
  const now = Date.now();
  adminTaps = now - adminLastTap > 4000 ? 1 : adminTaps + 1;
  adminLastTap = now;
  if (adminTaps < 8 || adminLoading) return;
  adminTaps = 0;
  adminLoading = true;
  try {
    if (!window.openPortalAdmin) {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'css/admin.css';
      document.head.append(css);
      await loadPortalScript('js/admin.js');
    }
    window.openPortalAdmin();
  } catch (e) { alert(e.message); }
  finally { adminLoading = false; }
};

document.addEventListener('DOMContentLoaded', async () => {
  if (sb) {
    await loadFromSupabase();
    subscribeRealtime();
  }
  draw(hashRoute());
}, { once: true });
