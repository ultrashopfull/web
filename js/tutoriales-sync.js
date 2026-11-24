/* Sincroniza portalTutorialStore con Supabase (solo YouTube por ahora).
 * Debe cargarse DESPUÉS de js/tutoriales.js y ANTES de js/portal.js
 * en el HTML, para que admin.js capture el wrapper de saveRecord. */
(function () {
  const store = window.portalTutorialStore;
  if (!store) {
    console.warn('[tutorials-sync] falta portalTutorialStore');
    return;
  }

  const cfg = window.ULTRASHOP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase?.createClient) {
    console.warn('[tutorials-sync] Supabase no configurado, sync deshabilitado');
    return;
  }

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 5 } },
  });

  const TABLE = 'portal_tutorials';
  const originalSave = store.saveRecord.bind(store);

  /* ══════════ Convertidores ══════════ */

  function rowToRecord(row) {
    const rec = {
      key: row.key,
      service: row.service,
      device: row.device,
      type: row.type || 'youtube',
      url: row.url || '',
      name: row.name || '',
      deleted: !!row.deleted,
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    };
    if (rec.type === 'youtube') {
      rec.provider = 'youtube';
      rec.videoId = row.video_id || null;
    }
    return rec;
  }

  function recordToRow(rec) {
    return {
      key: rec.key,
      service: rec.service,
      device: rec.device,
      type: rec.type || (rec.provider === 'youtube' ? 'youtube' : 'file'),
      url: rec.url || '',
      video_id: rec.videoId || null,
      name: rec.name || '',
      deleted: !!rec.deleted,
      updated_at: new Date(rec.updatedAt || Date.now()).toISOString(),
    };
  }

  /* ══════════ Envolver saveRecord ══════════ */
  store.saveRecord = async function (record) {
    const local = await originalSave(record);

    // Los blobs (videos subidos) no se pueden mandar a Postgres.
    if (record.blob) {
      console.warn('[tutorials-sync] archivo local sin sincronizar:', record.key);
      return local;
    }

    const { error } = await sb
      .from(TABLE)
      .upsert(recordToRow(record), { onConflict: 'key' });

    if (error) {
      console.warn('[tutorials-sync] upsert falló:', error);
      throw new Error('No se pudo guardar el tutorial en el servidor: ' + error.message);
    }
    return local;
  };

  /* ══════════ Sembrar + hidratar ══════════ */
  async function sync() {
    try {
      const { data: existing } = await sb.from(TABLE).select('key');

      // Primera vez: subir lo que hubiera en IndexedDB
      if (!existing || existing.length === 0) {
        const metas = await store.allMetadata();
        for (const rec of metas) {
          if (rec.blob) continue;
          await sb.from(TABLE).upsert(recordToRow(rec), { onConflict: 'key' });
        }
      }

      // Bajar todo lo del servidor a IndexedDB
      const { data } = await sb.from(TABLE).select('*');
      for (const row of data || []) {
        await originalSave(rowToRecord(row));
      }

      window.dispatchEvent(new CustomEvent('tutorials-updated', { detail: {} }));
    } catch (e) {
      console.warn('[tutorials-sync] sync inicial falló:', e);
    }
  }

  /* ══════════ Realtime ══════════ */
  sb.channel('portal_tutorials_rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE },
      async payload => {
        // INSERT/UPDATE traen payload.new completo.
        // DELETE solo trae la PK en payload.old (REPLICA IDENTITY DEFAULT).
        let row = payload.new && Object.keys(payload.new).length
          ? payload.new
          : payload.old;
        if (!row || !row.key) return;

        if (payload.eventType === 'DELETE') {
          const [service, device] = String(row.key).split(':');
          row = {
            key: row.key,
            service,
            device,
            type: 'youtube',
            url: '',
            video_id: null,
            name: '',
            deleted: true,
            updated_at: new Date().toISOString(),
          };
        }

        try {
          await originalSave(rowToRecord(row));
          window.dispatchEvent(new CustomEvent('tutorials-updated', {
            detail: { service: row.service, device: row.device },
          }));
        } catch (e) {
          console.warn('[tutorials-sync] no se pudo aplicar en IDB:', e);
        }
      })
    .subscribe();

  /* ══════════ API pública ══════════ */
  window.portalTutorialsSync = sync;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync, { once: true });
  } else {
    sync();
  }
})();
