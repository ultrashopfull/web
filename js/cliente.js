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

/* Datos reales de la sesión, inyectados por contexto.js desde portal.js.
 * NOTA DE SEGURIDAD: esta página NO recibe credenciales de la cuenta maestra.
 * Solo se muestran datos de suscripción (fechas, días, estado).
 * Las credenciales se entregan manualmente al cliente por WhatsApp. */
const service = services.find(s => s.id === window.PORTAL_SERVICE && s.visible) || services.find(s => s.visible);
const session = window.PORTAL_SESSION;
if (!session) {
  // Salvaguarda: contexto.js ya debió redirigirnos.
  throw new Error('Sesión de licencia no disponible');
}

const sub = session.suscripcion || {};
const cli = session.cliente || {};

const totalDays = (Number.isFinite(sub.dias_totales) && sub.dias_totales > 0) ? sub.dias_totales : 30;
const remainingDays = Number.isFinite(sub.dias_restantes)
  ? Math.max(0, Math.min(totalDays, sub.dias_restantes))
  : 0;

let startDateStr;
if (sub.fecha_vencimiento && /^\d{4}-\d{2}-\d{2}$/.test(sub.fecha_vencimiento)) {
  const [y, m, d] = sub.fecha_vencimiento.split('-').map(Number);
  const end = new Date(Date.UTC(y, m - 1, d));
  end.setUTCDate(end.getUTCDate() - totalDays);
  startDateStr = end.toISOString().slice(0, 10);
} else {
  startDateStr = new Date().toISOString().slice(0, 10);
}

const membership = {
  user: cli.usuario || 'cliente@ultrashop',
  startDate: startDateStr,
  totalDays,
  remainingDays
};
const expired = membership.remainingDays === 0;

const $ = selector => document.querySelector(selector);
document.body.classList.add(service.id);
document.title = `${service.name} — UltraShop`;
$('#license-name').textContent = service.name;
$('#purchased-license').textContent = service.name;
$('#service-logo').src = window.PORTAL_BRANDS[service.id];
$('#member-user').textContent = membership.user;
// The final date is the expiration boundary: start date + contracted days.
const [startYear, startMonth, startDay] = membership.startDate.split('-').map(Number);
const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
const endDate = new Date(startDate);
endDate.setUTCDate(endDate.getUTCDate() + membership.totalDays);
const dateFormatter = new Intl.DateTimeFormat('es-BO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
});
for (const [selector, date] of [
    ['#start-date', startDate],
    ['#end-date', endDate]
  ]) {
  const element = $(selector);
  element.dateTime = date.toISOString().slice(0, 10);
  element.textContent = dateFormatter.format(date);
}
$('#remaining-days').textContent = membership.remainingDays;
// El total contratado se distingue del contador de días restantes.
const planBadge = document.createElement('span');
planBadge.className = 'subscription-plan-badge';
const planDays = document.createElement('strong');
planDays.textContent = membership.totalDays;
const planKicker = document.createElement('span');
planKicker.className = 'plan-kicker';
planKicker.textContent = 'TU PLAN';
const planDuration = document.createElement('span');
planDuration.className = 'plan-duration';
const planUnit = document.createElement('span');
planUnit.textContent = 'días';
planDuration.append(planDays, planUnit);
planBadge.append(planKicker, planDuration);
planBadge.setAttribute('aria-label', `Plan contratado de ${membership.totalDays} días`);
$('#subscription-plan').replaceChildren(planBadge);
const meter = $('#subscription-progress');
meter.setAttribute('aria-valuemax', membership.totalDays);
meter.setAttribute('aria-valuenow', membership.remainingDays);
meter.style.setProperty('--ring-offset', 100 - (membership.remainingDays / membership.totalDays * 100));

if (service.url) $('#official').href = service.url;
else {
  $('#official').removeAttribute('href');
  $('#official').setAttribute('role', 'button');
  $('#official').tabIndex = 0;
  const missingAccess = e => {
    e.preventDefault();
    if (expired) return;
    $('#download-notice').hidden = false;
    $('#download-notice').textContent = 'El enlace de acceso todavía no está configurado.';
  };
  $('#official').addEventListener('click', missingAccess);
  $('#official').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') missingAccess(e);
  });
}
$('#official-label').textContent = 'Abrir ' + service.name;
const renew = $('#renew-license');
const renewalMessage = `¡Hola! 😊 ¿Qué tal?

Quisiera renovar mi suscripción a *${service.name}*.

👤 *Mi usuario:* ${membership.user}

📅 *Me quedan:* ${membership.remainingDays} ${membership.remainingDays===1?'día':'días'} de suscripción.

¿Me podrías compartir tu método de pago para realizar la renovación, por favor?`;
renew.href = whatsappUrl(config.salesWhatsapp, renewalMessage);
renew.setAttribute('aria-label', 'Renovar ' + service.name + ' por WhatsApp');
// Una suscripción vencida conserva la renovación, pero no permite usar el acceso.
const downloadButton = $('#download');
const officialLink = $('#official');
if (expired) {
  // El grupo de acceso queda fuera de la interacción con ratón, tacto y teclado.
  $('.pass-actions').inert = true;
  $('.pass-actions').title = 'Renueva tu licencia para habilitar estas opciones';
  downloadButton.disabled = true;
  downloadButton.setAttribute('aria-disabled', 'true');
  downloadButton.setAttribute('aria-describedby', 'expiry-notice');
  officialLink.removeAttribute('href');
  officialLink.setAttribute('role', 'link');
  officialLink.setAttribute('aria-disabled', 'true');
  officialLink.setAttribute('tabindex', '-1');
  officialLink.setAttribute('aria-describedby', 'expiry-notice');
  for (const element of [downloadButton, officialLink]) {
    element.title = 'Renueva tu suscripción para habilitar esta opción';
    element.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    element.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }
  document.body.classList.add('license-expired');
  $('#license-status').innerHTML = '<i aria-hidden="true"></i> Vencida';
  $('#expiry-notice').hidden = false;
  $('.pass-subscription>.pass-label').textContent = 'Suscripción finalizada';
  $('.ring-number>span').textContent = 'días restantes';
  $('#subscription-plan').textContent = 'Tu plan de ' + membership.totalDays + ' días ha terminado';
  renew.querySelector('span').textContent = 'Renovar ahora';
}

// NOTA: bloque de credenciales de la cuenta maestra ELIMINADO por seguridad.
// Las credenciales se entregan manualmente al cliente por WhatsApp.

// Los tutoriales se resuelven por licencia y dispositivo mediante portalTutorials.
const video = $('#license-video');
video.title = 'Tutorial de instalación de ' + service.name;
let tutorialVideoUrl = '';
const tutorialCover = $('#tutorial-cover');
const tutorialLoading = $('#tutorial-loading');
const tutorialError = $('#tutorial-video-error');
const player = video.closest('.tutorial-video-shell');
const controls = $('#tutorial-controls');
const playButton = $('#tutorial-toggle');
const seek = $('#tutorial-seek');
const speedButton = $('#tutorial-speed');
const fullscreenButton = $('#tutorial-fullscreen');
// Vista ampliada dentro de la web, conservando el mismo reproductor y su posición.
const expandedPlayer = document.createElement('dialog');
expandedPlayer.className = 'tutorial-expanded-overlay';
expandedPlayer.setAttribute('aria-label', 'Tutorial de instalación ampliado');
const closeExpandedButton = document.createElement('button');
closeExpandedButton.type = 'button';
closeExpandedButton.className = 'tutorial-expanded-close';
closeExpandedButton.setAttribute('aria-label', 'Reducir video');
closeExpandedButton.title = 'Reducir video (Esc)';
closeExpandedButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
expandedPlayer.append(closeExpandedButton);
document.body.append(expandedPlayer);
let playerPlaceholder = null,
  previousPageOverflow = '';

function movePlayerPreservingPlayback(destination, before = null) {
  const resume = !video.paused && !video.ended;
  destination.insertBefore(player, before);
  if (resume) {
    const promise = video.play();
    if (promise) promise.catch(() => {});
  }
}

function closeExpandedVideo() {
  if (!expandedPlayer.open) return;
  expandedPlayer.close();
  if (playerPlaceholder) {
    movePlayerPreservingPlayback(playerPlaceholder.parentNode, playerPlaceholder);
    playerPlaceholder.remove();
    playerPlaceholder = null;
  }
  document.body.style.overflow = previousPageOverflow;
  syncFullscreen();
  if (!controls.hidden) fullscreenButton.focus({
    preventScroll: true
  });
}

function openExpandedVideo() {
  if (expandedPlayer.open) return;
  playerPlaceholder = document.createElement('div');
  playerPlaceholder.className = 'tutorial-player-placeholder';
  playerPlaceholder.style.height = player.getBoundingClientRect().height + 'px';
  player.before(playerPlaceholder);
  previousPageOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  expandedPlayer.showModal();
  movePlayerPreservingPlayback(expandedPlayer);
  syncFullscreen();
  fullscreenButton.focus({
    preventScroll: true
  });
}
closeExpandedButton.addEventListener('click', closeExpandedVideo);
expandedPlayer.addEventListener('cancel', event => {
  event.preventDefault();
  closeExpandedVideo();
});

const svg = (path) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + path + '</svg>';
const playIcon = svg('<path d="m9 5 11 7-11 7Z"/>');
const pauseIcon = svg('<path d="M8 5v14M16 5v14"/>');
const expandIcon = svg('<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>');
const reduceIcon = svg('<path d="M4 9h5V4m11 5h-5V4M9 20v-5H4m11 5v-5h5"/>');
// El atributo controls del HTML queda como alternativa si no se ejecuta JavaScript.
video.controls = false;
$('#tutorial-brand').src = window.PORTAL_BRANDS[service.id];
$('#tutorial-license-name').textContent = service.name;

function formatTime(seconds) {
  const time = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return Math.floor(time / 60) + ':' + String(time % 60).padStart(2, '0');
}

function syncTimeline() {
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  seek.disabled = !duration;
  seek.value = duration ? Math.round(video.currentTime / duration * 1000) : 0;
  seek.style.setProperty('--played', seek.value / 10 + '%');
  seek.setAttribute('aria-valuetext', formatTime(video.currentTime) + ' de ' + formatTime(duration));
  $('#tutorial-current').textContent = formatTime(video.currentTime);
  $('#tutorial-duration').textContent = formatTime(duration);
  $('#tutorial-forward').disabled = !duration;
}

function syncPlay() {
  const label = video.paused ? 'Reproducir' : 'Pausar';
  playButton.innerHTML = video.paused ? playIcon : pauseIcon;
  playButton.setAttribute('aria-label', label);
  playButton.title = label;
}

function syncFullscreen() {
  const expanded = expandedPlayer.open;
  const label = expanded ? 'Reducir video' : 'Ampliar video';
  fullscreenButton.innerHTML = expanded ? reduceIcon : expandIcon;
  fullscreenButton.setAttribute('aria-label', label);
  fullscreenButton.title = label;
  fullscreenButton.setAttribute('aria-pressed', String(expanded));
}

function showTutorialError() {
  if (!tutorialVideoUrl) return;
  closeExpandedVideo();
  tutorialCover.hidden = false;
  video.hidden = true;
  controls.hidden = true;
  tutorialLoading.hidden = true;
  tutorialError.textContent = 'No se pudo cargar el video. Inténtalo nuevamente en unos momentos.';
  tutorialError.hidden = false;
  $('#tutorial-play-label').textContent = 'Reintentar';
}

function playTutorial() {
  const playback = video.play();
  if (playback) playback.catch(error => {
    if (error.name !== 'AbortError') showTutorialError();
  });
}
tutorialCover.addEventListener('click', async () => {
  if (!tutorialVideoUrl) return;
  const version = tutorialSelectionVersion;
  if (tutorialVideoUrl === 'local-tutorial') {
    tutorialCover.disabled = true;
    try {
      const item = await parent.portalTutorials.get(service.id, selectedTutorialDevice);
      if (version !== tutorialSelectionVersion) return;
      if (!item) throw new Error('Tutorial no disponible');
      tutorialVideoUrl = item.blob ? (tutorialBlobUrl = URL.createObjectURL(item.blob)) : item.url;
    } catch (error) {
      if (version === tutorialSelectionVersion) showTutorialError();
      return;
    } finally {
      if (version === tutorialSelectionVersion) tutorialCover.disabled = false;
    }
  }
  tutorialError.hidden = true;
  tutorialCover.hidden = true;
  video.hidden = false;
  controls.hidden = false;
  tutorialLoading.hidden = false;
  if (!video.getAttribute('src') || video.error) {
    video.src = tutorialVideoUrl;
    video.load();
  }
  if (video.ended) video.currentTime = 0;
  playButton.focus({
    preventScroll: true
  });
  playTutorial();
});
playButton.addEventListener('click', () => video.paused ? playTutorial() : video.pause());
video.addEventListener('click', () => video.paused ? playTutorial() : video.pause());
video.addEventListener('keydown', event => {
  if (event.code === 'Space') {
    event.preventDefault();
    video.paused ? playTutorial() : video.pause();
  }
});
seek.addEventListener('input', () => {
  if (Number.isFinite(video.duration) && video.duration > 0) {
    video.currentTime = Number(seek.value) / 1000 * video.duration;
    syncTimeline();
  }
});
$('#tutorial-forward').addEventListener('click', () => {
  if (Number.isFinite(video.duration)) {
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
    syncTimeline();
  }
});
speedButton.addEventListener('click', () => {
  video.playbackRate = video.playbackRate === 1 ? 2 : 1;
});
video.addEventListener('ratechange', () => {
  const rate = video.playbackRate,
    next = rate === 1 ? 2 : 1;
  speedButton.textContent = rate + '×';
  speedButton.setAttribute('aria-label', 'Velocidad ' + rate + '×. Cambiar a ' + next + '×');
  speedButton.title = 'Cambiar velocidad a ' + next + '×';
});
fullscreenButton.addEventListener('click', () => expandedPlayer.open ? closeExpandedVideo() : openExpandedVideo());
['timeupdate', 'loadedmetadata', 'durationchange', 'emptied'].forEach(event => video.addEventListener(event, syncTimeline));
['play', 'pause', 'ended'].forEach(event => video.addEventListener(event, syncPlay));
video.addEventListener('playing', () => {
  tutorialLoading.hidden = true;
  tutorialError.hidden = true;
});
video.addEventListener('waiting', () => {
  if (!video.paused && !video.ended) tutorialLoading.hidden = false;
});
video.addEventListener('pause', () => {
  tutorialLoading.hidden = true;
});
video.addEventListener('error', showTutorialError);
video.addEventListener('ended', () => {
  tutorialCover.hidden = false;
  video.hidden = true;
  controls.hidden = true;
  tutorialLoading.hidden = true;
  $('#tutorial-play-label').textContent = 'Volver a ver';
  tutorialCover.setAttribute('aria-label', 'Volver a reproducir el tutorial de instalación');
  closeExpandedVideo();
  tutorialCover.focus({
    preventScroll: true
  });
});
syncPlay();
syncTimeline();
syncFullscreen();
// Selección automática por sistema operativo; el ancho de pantalla no decide el tutorial.
// iPadOS en modo escritorio se identifica por la plataforma Mac y sus puntos táctiles.
function detectTutorialDevice(nav = navigator) {
  const ua = String(nav.userAgent || '');
  const platform = String(nav.userAgentData?.platform || nav.platform || '');
  if (/iPad/i.test(ua) || (/Mac/i.test(platform) && Number(nav.maxTouchPoints) > 1)) return {
    id: 'iphone',
    label: 'iPad'
  };
  if (/iPhone|iPod/i.test(ua)) return {
    id: 'iphone',
    label: 'iPhone'
  };
  if (/Android/i.test(ua + ' ' + platform)) return {
    id: 'android',
    label: 'Android'
  };
  if (/Windows|Win32|Win64|WinNT/i.test(ua + ' ' + platform)) return {
    id: 'windows',
    label: 'Windows'
  };
  if (/Macintosh|Mac OS X|MacIntel|macOS/i.test(ua + ' ' + platform)) return {
    id: 'mac',
    label: 'Mac'
  };
  return null;
}
const detectedTutorialDevice = detectTutorialDevice();
let selectedTutorialDevice = null,
  tutorialSelectionVersion = 0,
  tutorialBlobUrl = null;
const tutorialDevices = parent.portalTutorials.devices;
const deviceStatus = $('#tutorial-device-status');
async function selectTutorialDevice(deviceId) {
  const device = tutorialDevices.find(d => d.id === deviceId);
  if (!device) return;
  selectedTutorialDevice = deviceId;
  const version = ++tutorialSelectionVersion;
  video.pause();
  closeExpandedVideo();
  video.removeAttribute('src');
  video.load();
  if (tutorialBlobUrl) {
    URL.revokeObjectURL(tutorialBlobUrl);
    tutorialBlobUrl = null;
  }
  tutorialVideoUrl = '';
  video.hidden = true;
  controls.hidden = true;
  tutorialCover.hidden = false;
  tutorialCover.disabled = true;
  tutorialLoading.hidden = true;
  tutorialError.hidden = true;
  $('#tutorial-play-label').textContent = 'Cargando…';
  deviceStatus.textContent = '';
  document.querySelector('.cover-eyebrow').textContent = 'GUÍA PASO A PASO';
  const deviceLabel = detectedTutorialDevice?.label || device.name;
  $('#cover-device-name').textContent = deviceLabel;
  $('#cover-device-icon').innerHTML = device.icon;
  $('#cover-device-watermark').innerHTML = device.icon;
  video.title = 'Tutorial de ' + service.name + ' para ' + deviceLabel;
  $('#tutorial-panel').setAttribute('aria-label', 'Tutorial de ' + service.name + ' para ' + deviceLabel);
  try {
    const item = await parent.portalTutorials.info(service.id, deviceId);
    if (version !== tutorialSelectionVersion) return;
    if (item) {
      tutorialVideoUrl = item.local ? 'local-tutorial' : item.url;
      tutorialCover.disabled = false;
      $('#tutorial-play-label').textContent = 'Ver tutorial';
      tutorialCover.setAttribute('aria-label', 'Reproducir tutorial de ' + service.name + ' para ' + deviceLabel);
    } else {
      $('#tutorial-play-label').textContent = 'Sin video';
      deviceStatus.textContent = 'El tutorial para ' + deviceLabel + ' estará disponible próximamente.';
      tutorialCover.setAttribute('aria-label', 'Tutorial de ' + deviceLabel + ' no disponible');
    }
  } catch (error) {
    if (version !== tutorialSelectionVersion) return;
    $('#tutorial-play-label').textContent = 'No disponible';
    deviceStatus.textContent = 'No se pudo abrir el almacenamiento de tutoriales en este navegador.';
  }
}

function refreshUploadedTutorial(event) {
  if (event.detail?.service === service.id && event.detail?.device === selectedTutorialDevice) selectTutorialDevice(selectedTutorialDevice);
}
parent.addEventListener('tutorials-updated', refreshUploadedTutorial);
window.addEventListener('pagehide', () => {
  video.pause();
  video.removeAttribute('src');
  video.load();
  tutorialSelectionVersion++;
  parent.removeEventListener('tutorials-updated', refreshUploadedTutorial);
  if (tutorialBlobUrl) URL.revokeObjectURL(tutorialBlobUrl);
});
if (detectedTutorialDevice) {
  selectTutorialDevice(detectedTutorialDevice.id);
} else {
  tutorialCover.disabled = true;
  video.hidden = true;
  controls.hidden = true;
  $('#tutorial-play-label').textContent = 'No disponible';
  $('#cover-device-name').textContent = 'Tu dispositivo';
  $('#cover-device-icon').replaceChildren();
  $('#cover-device-watermark').replaceChildren();
  tutorialCover.setAttribute('aria-label', 'Tutorial no disponible para este dispositivo');
  deviceStatus.textContent = 'Aún no tenemos un tutorial compatible con este sistema.';
}

/* ═══════════════════════════════════════════════════════════════════
   CONTROL DE VERSIÓN DE LA EXTENSIÓN
   - Usa PORTAL_CONFIG (el que existe en el iframe, no ULTRASHOP_CONFIG)
   - Busca el archivo por nombre exacto, por nombre del catálogo, por prefijo
   - Muestra badge "Nueva versión" / "Al día" / "Última versión"
   ═══════════════════════════════════════════════════════════════════ */
const ExtensionVersion = (() => {
  const badge = document.getElementById("version-badge");
  const versionText = document.getElementById("version-text");
  const downloadBtn = document.getElementById("download");
  if (!badge || !versionText || !downloadBtn) {
    console.warn("[version] Elementos del badge no encontrados");
    return { run() {}, info: null };
  }

  const STORAGE_KEY = `ultrashop-ext-version:${service.id}`;
  const BUCKET = "extensions";

  /* FIX: usar PORTAL_CONFIG, que SÍ existe en el iframe */
  const cfg = window.PORTAL_CONFIG || {};
  const SUPA_URL  = (cfg.supabaseUrl  || "").replace(/\/+$/, "");
  const SUPA_ANON = (cfg.supabaseAnonKey || "");

  console.log("[version] init →", {
    service: service.id,
    supabaseUrl: SUPA_URL ? "✓" : "✗",
    anonKey: SUPA_ANON ? "✓" : "✗",
    expired,
    catalogDownloadUrl: service.downloadUrl || "(vacío)"
  });

  /* ── Fechas ──────────────────────────────────────────────── */
  const fmtDate = (iso) => {
    try {
      return new Intl.DateTimeFormat("es-BO", {
        day: "numeric", month: "short", year: "numeric"
      }).format(new Date(iso));
    } catch { return "—"; }
  };
  const daysSince = (iso) => {
    const ms = Date.now() - new Date(iso).getTime();
    const d = Math.floor(ms / 86400000);
    if (d <= 0) return "hoy";
    if (d === 1) return "ayer";
    return `hace ${d} días`;
  };
  const publicUrl = (name) => `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${name}`;

  /* ── Persistencia ────────────────────────────────────────── */
  function readStored() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return obj && obj.date ? obj : null;
    } catch { return null; }
  }
  function writeStored(info) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        date: info.lastModified,
        kind: info.kind,
        size: info.size || 0,
        url: info.url
      }));
    } catch {}
  }

  /* ── Detección de archivo (3 estrategias en orden) ───────── */
  function pickFile(list, serviceId, catalogDownloadUrl) {
    /* 1) Nombre exacto: chatgpt.zip / chatgpt.crx */
    const exactZip = list.find(f => f.name === `${serviceId}.zip`);
    const exactCrx = list.find(f => f.name === `${serviceId}.crx`);
    if (exactZip) return { file: exactZip, kind: "zip", mode: "exact" };
    if (exactCrx) return { file: exactCrx, kind: "crx", mode: "exact" };

    /* 2) Nombre del archivo en el downloadUrl del catálogo
          (ej: catalogo.js dice ".../GPT_Pro_Licencia.zip" → busca ese nombre) */
    if (catalogDownloadUrl) {
      try {
        const filename = decodeURIComponent(
          catalogDownloadUrl.split("/").pop().split("?")[0]
        );
        if (filename) {
          const match = list.find(f => f.name === filename);
          if (match) {
            const kind = match.name.toLowerCase().endsWith(".crx") ? "crx" : "zip";
            return { file: match, kind, mode: "catalog" };
          }
        }
      } catch {}
    }

    /* 3) Prefijo: chatgpt-*.zip / chatgpt-*.crx */
    const lower = serviceId.toLowerCase();
    const startZip = list.find(f =>
      f.name.toLowerCase().startsWith(lower + "-") &&
      f.name.toLowerCase().endsWith(".zip")
    );
    const startCrx = list.find(f =>
      f.name.toLowerCase().startsWith(lower + "-") &&
      f.name.toLowerCase().endsWith(".crx")
    );
    if (startZip) return { file: startZip, kind: "zip", mode: "prefix" };
    if (startCrx) return { file: startCrx, kind: "crx", mode: "prefix" };

    return null;
  }

  /* ── Consulta al bucket ──────────────────────────────────── */
  async function fetchExtensionInfo() {
    if (!SUPA_URL || !SUPA_ANON) {
      console.warn("[version] sin config → abortado");
      return { ok: false, reason: "no-config" };
    }

    try {
      const res = await fetch(`${SUPA_URL}/storage/v1/object/list/${BUCKET}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPA_ANON}`,
          "apikey": SUPA_ANON
        },
        body: JSON.stringify({ prefix: "", limit: 200, sortBy: { column: "updated_at", order: "desc" } })
      });

      console.log("[version] list →", res.status);

      if (!res.ok) {
        console.warn("[version] HTTP error", res.status);
        return { ok: false, reason: "error" };
      }

      const list = await res.json();
      if (!Array.isArray(list)) {
        console.warn("[version] respuesta no es array:", list);
        return { ok: false, reason: "error" };
      }

      console.log("[version] archivos en bucket:", list.map(f => f.name));
      const picked = pickFile(list, service.id, service.downloadUrl);
      if (!picked) {
        console.log("[version] no hay archivo para", service.id);
        return { ok: false, reason: "not-found" };
      }
      console.log("[version] archivo elegido:", picked.file.name, "· modo:", picked.mode);

      return {
        ok: true,
        kind: picked.kind,
        mode: picked.mode,
        fileName: picked.file.name,
        url: publicUrl(picked.file.name),
        lastModified: picked.file.updated_at || picked.file.created_at,
        size: picked.file.metadata?.size || picked.file.metadata?.contentLength || 0
      };
    } catch (err) {
      console.warn("[version] fetch error:", err);
      return { ok: false, reason: "error", message: err?.message };
    }
  }

  /* ── Render del badge ────────────────────────────────────── */
  let currentInfo = null;
  function paint(state, info) {
    if (state === "error") {
      badge.className = "version-badge is-error";
      versionText.textContent = "No se pudo comprobar la versión";
      badge.hidden = false;
      return;
    }
    if (state === "not-found") {
      badge.hidden = true;
      return;
    }

    const stored = readStored();
    const serverTime = new Date(info.lastModified).getTime();
    const storedTime = stored ? new Date(stored.date).getTime() : 0;
    const isNew = stored && serverTime > storedTime + 60000;
    const neverDownloaded = !stored;

    if (isNew) {
      badge.className = "version-badge is-new";
      versionText.innerHTML = `<strong>Nueva versión disponible</strong> · ${fmtDate(info.lastModified)}`;
    } else if (neverDownloaded) {
      badge.className = "version-badge is-info";
      versionText.textContent = `Última versión: ${fmtDate(info.lastModified)}`;
    } else {
      badge.className = "version-badge is-ok";
      versionText.textContent = `Al día · descargada ${daysSince(stored.date)}`;
    }
    badge.hidden = false;

    downloadBtn.dataset.extensionUrl  = info.url;
    downloadBtn.dataset.extensionKind = info.kind;
    downloadBtn.dataset.extensionDate = info.lastModified;
    downloadBtn.dataset.extensionSize = String(info.size || 0);
    downloadBtn.dataset.extensionFile = info.fileName || "";

    currentInfo = info;
    console.log("[version] pintado:", state, "→", versionText.textContent, "| URL:", info.url);
  }

  /* ── Ejecución principal ─────────────────────────────────── */
  async function run() {
    if (expired) { badge.hidden = true; return; }
    const info = await fetchExtensionInfo();
    if (!info.ok) {
      paint(info.reason === "error" || info.reason === "no-config" ? "error" : "not-found", null);
      return;
    }
    paint("ok", info);
  }

  /* ── Hook: guardar la fecha al pulsar Descargar ──────────── */
  downloadBtn.addEventListener("click", () => {
    const url = downloadBtn.dataset.extensionUrl;
    const date = downloadBtn.dataset.extensionDate;
    const kind = downloadBtn.dataset.extensionKind;
    const size = parseInt(downloadBtn.dataset.extensionSize || "0", 10);
    if (url && date) {
      writeStored({ url, kind, size, lastModified: date });
      setTimeout(run, 500);
    }
  }, true);

  return { run, get info() { return currentInfo; } };
})();

/* ── Listener original del botón Descargar (con prioridad al bucket) ─ */
$('#download').addEventListener('click', () => {
  if (expired) return;
  const bucketUrl = $('#download').dataset.extensionUrl;
  const targetUrl = bucketUrl || service.downloadUrl;
  if (targetUrl) {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  } else {
    const message = $('#download-notice');
    message.hidden = false;
    message.textContent = `La extensión de ${service.name} aún no está cargada.`;
  }
});

/* ── Lanzar el chequeo de versión al cargar ───────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ExtensionVersion.run());
} else {
  ExtensionVersion.run();
}

// Start on visibility so the animation is not missed below the tutorial on mobile.
(function animateBalance() {
  const total = Math.max(1, Number(membership.totalDays) || 30);
  const remaining = Math.max(0, Math.min(total, Number(membership.remainingDays) || 0));
  const number = $('#remaining-days'),
    ring = $('#subscription-progress');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frameId = 0,
    started = false,
    last = null;

  function paint(days, ratio) {
    if (days !== last) {
      const previous = last === null ? '' : String(last),
        next = String(days);
      number.setAttribute('aria-label', next + ' días disponibles');
      number.replaceChildren();
      [...next].forEach((digit, i) => {
        const cell = document.createElement('span');
        cell.className = 'balance-digit';
        cell.setAttribute('aria-hidden', 'true');
        const current = document.createElement('span');
        current.textContent = digit;
        if (previous && previous[i] !== digit && !reduced.matches) {
          const old = document.createElement('span');
          old.className = 'digit-old';
          old.textContent = previous[i] || '';
          cell.append(old);
          current.className = 'digit-next';
        }
        cell.append(current);
        number.append(cell);
      });
      last = days;
    }
    ring.style.setProperty('--ring-offset', 100 - ratio * 100);
  }

  function finish() {
    cancelAnimationFrame(frameId);
    paint(remaining, remaining / total);
    ring.classList.remove('is-counting');
    ring.classList.add('is-complete');
  }
  if (reduced.matches || window.ULTRA_LITE || remaining === 0) {
    finish();
    return;
  }
  paint(total, 0);

  function start() {
    if (started) return;
    started = true;
    ring.classList.add('is-counting');
    const begin = performance.now(),
      fillTime = 250,
      holdTime = 0,
      countTime = 500;

    function tick(now) {
      if (reduced.matches || document.hidden) {
        finish();
        return;
      }
      const elapsed = now - begin;
      if (elapsed < fillTime) {
        const t = elapsed / fillTime;
        paint(total, 1 - Math.pow(1 - t, 3));
      } else if (elapsed < fillTime + holdTime) {
        paint(total, 1);
      } else {
        const t = Math.min(1, (elapsed - fillTime - holdTime) / countTime),
          ease = t,
          value = total - (total - remaining) * ease,
          days = Math.round(value);
        paint(days, value / total);

        if (t === 1) {
          finish();
          return;
        }
      }
      frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        observer.disconnect();
        start();
      }
    }, {
      threshold: .65
    });
    observer.observe(ring);
  } else start();
  window.addEventListener('pagehide', () => cancelAnimationFrame(frameId), {
    once: true
  });
})();

// No se reproduce video cuando la página queda en segundo plano.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) video.pause();
});
