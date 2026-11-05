/* Almacenamiento local de demostración. Adaptar estas funciones a la API del servidor.
 * Los listados consultan metadatos; los Blobs se leen solamente al reproducir/exportar.
 * Conserva el nombre de la base anterior y migra sin borrar videos existentes.
 */
(function() {
  const devicePaths = [
    ['windows', 'Windows', 'M3 5l8-1v8H3zm10-1 8-1v9h-8zM3 14h8v7l-8-1zm10 0h8v9l-8-1z'],
    ['mac', 'Mac', 'M4 4h16v13H4zM2 21h20M9 17v4m6-4v4'],
    ['iphone', 'iPhone', 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm3 3h4m-3 14h2'],
    ['android', 'Android', 'M5 11h14v8H5zM5 9a7 7 0 0 1 14 0M7 3 5 1m12 2 2-2M8 7h.01M16 7h.01M2 12v5m20-5v5M8 19v3m8-3v3']
  ];
  const devices = devicePaths.map(([id, name, path]) => ({
    id,
    name,
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + path + '"/></svg>'
  }));
  const key = (service, device) => service + ':' + device;
  const metadata = record => ({
    key: record.key,
    service: record.service,
    device: record.device,
    name: record.name,
    size: record.size || record.blob?.size || 0,
    duration: record.duration,
    updatedAt: record.updatedAt,
    deleted: Boolean(record.deleted),
    local: true
  });
  let dbPromise;

  function database() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('ultrashop-tutoriales-v1', 2);
      let blocked = false;
      request.onupgradeneeded = () => {
        const db = request.result;
        const videos = db.objectStoreNames.contains('videos') ? request.transaction.objectStore('videos') : db.createObjectStore('videos', {
          keyPath: 'key'
        });
        if (!db.objectStoreNames.contains('metadata')) {
          const meta = db.createObjectStore('metadata', {
            keyPath: 'key'
          });
          const cursor = videos.openCursor();
          cursor.onsuccess = () => {
            if (!cursor.result) return;
            meta.put(metadata(cursor.result.value));
            cursor.result.continue();
          };
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        if (blocked) {
          db.close();
          return;
        }
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
      request.onblocked = () => {
        blocked = true;
        dbPromise = null;
        reject(new Error('Cierra otras pestañas antiguas del portal y vuelve a intentarlo.'));
      };
    });
    return dbPromise;
  }

  function valid(service, device) {
    if (!serviceIds.includes(service) || !devices.some(item => item.id === device)) throw new Error('Licencia o dispositivo no válido.');
  }
  async function readStore(store, id) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const request = db.transaction(store).objectStore(store).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function readRecord(service, device) {
    valid(service, device);
    return readStore('videos', key(service, device));
  }
  async function allMetadata() {
    const db = await database();
    return new Promise((resolve, reject) => {
      const request = db.transaction('metadata').objectStore('metadata').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  let channel;
  try {
    channel = new BroadcastChannel('ultrashop-tutoriales');
    channel.onmessage = event => window.dispatchEvent(new CustomEvent('tutorials-updated', {
      detail: event.data
    }));
  } catch {
    /* La sincronización dentro de esta ventana sigue disponible. */ }
  async function saveRecord(record) {
    const db = await database();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['videos', 'metadata'], 'readwrite');
      tx.objectStore('videos').put(record);
      tx.objectStore('metadata').put(metadata(record));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('No se guardaron los cambios.'));
    });
    const detail = {
      service: record.service,
      device: record.device
    };
    window.dispatchEvent(new CustomEvent('tutorials-updated', {
      detail
    }));
    channel?.postMessage(detail);
  }
  async function get(service, device) {
    valid(service, device);
    let record;
    try {
      record = await readRecord(service, device);
    } catch (error) {
      if (!TUTORIAL_DEFAULTS[key(service, device)]) throw error;
    }
    return record ? (record.deleted ? null : record) : TUTORIAL_DEFAULTS[key(service, device)] || null;
  }
  async function info(service, device) {
    valid(service, device);
    let record;
    try {
      record = await readStore('metadata', key(service, device));
    } catch (error) {
      if (!TUTORIAL_DEFAULTS[key(service, device)]) throw error;
    }
    return record ? (record.deleted ? null : record) : TUTORIAL_DEFAULTS[key(service, device)] || null;
  }
  window.portalTutorialStore = {
    devices,
    readRecord,
    saveRecord,
    allMetadata
  };
  window.portalTutorials = {
    devices,
    get,
    info
  };
  window.addEventListener('pagehide', () => {
    channel?.close();
  });
})();
