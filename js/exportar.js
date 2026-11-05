/* ZIP estándar, sin contraseña, sin base64 y sin dependencias.
 * Se lee cada archivo por bloques de 1 MiB para calcular CRC32.
 * Los recursos comprimidos (PNG/MP4) se guardan sin recomprimir.
 * El navegador conserva el Blob del ZIP hasta iniciar la descarga.
 */
(function() {
  const encoder = new TextEncoder();
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  async function crc32(blob) {
    let crc = 0xffffffff;
    for (let offset = 0; offset < blob.size; offset += 1048576) {
      const bytes = new Uint8Array(await blob.slice(offset, offset + 1048576).arrayBuffer());
      for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
      // Give input/painting a chance between large video blocks.
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  // Los navegadores no permiten fetch(file://). El usuario selecciona la carpeta
  // web al exportar; solo se leen los archivos enumerados en su manifiesto.
  function selectLocalFiles() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.setAttribute('webkitdirectory', '');
      input.hidden = true;
      document.body.append(input);
      input.addEventListener('change', () => {
        const files = new Map();
        for (const file of input.files) {
          const relative = file.webkitRelativePath;
          files.set(relative.slice(relative.indexOf('/') + 1), file);
        }
        input.remove();
        if (!files.has('manifest.json')) reject(new Error('Selecciona la carpeta web que contiene index.html y manifest.json.'));
        else resolve(files);
      }, {once: true});
      input.addEventListener('cancel', () => {
        input.remove();
        reject(new Error('Exportación cancelada.'));
      }, {once: true});
      input.click();
    });
  }

  async function fetchBlob(path, localFiles) {
    if (localFiles) {
      const file = localFiles.get(path);
      if (!file) throw new Error('Falta ' + path + ' en la carpeta seleccionada.');
      return file;
    }
    const response = await fetch(path);
    if (!response.ok) throw new Error('No se pudo exportar ' + path + ' (HTTP ' + response.status + ').');
    return response.blob();
  }

  function definition(name, value) {
    return 'const ' + name + ' = ' + JSON.stringify(value, null, 2) + ';\n';
  }
  window.exportPortalZip = async function({
    catalog,
    appearance,
    deleted,
    status
  }) {
    status(location.protocol === 'file:' ? 'Selecciona la carpeta web para incluir sus archivos en el ZIP…' : 'Preparando archivos…');
    const localFiles = location.protocol === 'file:' ? await selectLocalFiles() : null;
    const manifest = JSON.parse(await (await fetchBlob('manifest.json', localFiles)).text());
    const snapshot = JSON.parse(JSON.stringify({
      catalog,
      appearance,
      deleted
    }));
    const defaults = JSON.parse(JSON.stringify(TUTORIAL_DEFAULTS));
    const active = new Set(snapshot.catalog.map(card => card.id));
    const metadata = await portalTutorialStore.allMetadata();
    const localVideos = new Map();
    for (const record of metadata) {
      if (record.deleted || !active.has(record.service)) {
        delete defaults[record.key];
        continue;
      }
      const path = 'assets/tutorials/' + record.service + '-' + record.device + (/\.webm$/i.test(record.name) ? '.webm' : '.mp4');
      defaults[record.key] = {
        url: path,
        name: record.name,
        size: record.size,
        duration: record.duration
      };
      localVideos.set(path, record);
    }
    for (const key of Object.keys(defaults))
      if (!active.has(key.split(':')[0])) delete defaults[key];
    const paths = new Set(manifest.files.filter(path => !path.startsWith('assets/tutorials/')));
    for (const item of Object.values(defaults)) paths.add(item.url);
    paths.add('manifest.json');
    const data = definition('CATALOG_DEFAULTS', snapshot.catalog) +
      definition('DELETED_CARDS_DEFAULTS', snapshot.deleted) +
      definition('APPEARANCE_DEFAULTS', snapshot.appearance) + definition('TUTORIAL_DEFAULTS', defaults);
    const parts = [],
      central = [];
    let offset = 0,
      done = 0;
    const now = new Date();
    const date = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    for (const path of paths) {
      if (!/^[a-zA-Z0-9_./-]+$/.test(path) || path.includes('..') || path.startsWith('/')) throw new Error('Ruta de exportación no válida.');
      let blob;
      if (path === 'config/datos.js') blob = new Blob([data]);
      else if (path === 'manifest.json') blob = new Blob([JSON.stringify({
        files: [...paths]
      }, null, 2)]);
      else if (localVideos.has(path)) {
        const item = localVideos.get(path);
        const record = await portalTutorialStore.readRecord(item.service, item.device);
        if (!record?.blob || record.deleted) throw new Error('Un video cambió durante la exportación. Reintenta.');
        blob = record.blob;
      } else blob = await fetchBlob(path, localFiles);
      if (offset + blob.size + 2048 >= 0xffffffff || paths.size >= 65535) throw new Error('El ZIP supera 4 GB. Exporta los videos desde el servidor.');
      status('Exportando ' + (++done) + ' / ' + paths.size + '…');
      const name = encoder.encode(path),
        crc = await crc32(blob);
      const header = new Uint8Array(30 + name.length),
        h = new DataView(header.buffer);
      h.setUint32(0, 0x04034b50, true);
      h.setUint16(4, 20, true);
      h.setUint16(6, 0x0800, true);
      h.setUint16(10, time, true);
      h.setUint16(12, date, true);
      h.setUint32(14, crc, true);
      h.setUint32(18, blob.size, true);
      h.setUint32(22, blob.size, true);
      h.setUint16(26, name.length, true);
      header.set(name, 30);
      const record = new Uint8Array(46 + name.length),
        c = new DataView(record.buffer);
      c.setUint32(0, 0x02014b50, true);
      c.setUint16(4, 20, true);
      c.setUint16(6, 20, true);
      c.setUint16(8, 0x0800, true);
      c.setUint16(12, time, true);
      c.setUint16(14, date, true);
      c.setUint32(16, crc, true);
      c.setUint32(20, blob.size, true);
      c.setUint32(24, blob.size, true);
      c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      record.set(name, 46);
      parts.push(header, blob);
      central.push(record);
      offset += header.length + blob.size;
    }
    const directorySize = central.reduce((sum, item) => sum + item.length, 0);
    const end = new Uint8Array(22),
      view = new DataView(end.buffer);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, paths.size, true);
    view.setUint16(10, paths.size, true);
    view.setUint32(12, directorySize, true);
    view.setUint32(16, offset, true);
    const url = URL.createObjectURL(new Blob([...parts, ...central, end], {
      type: 'application/zip'
    }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'UltraShop_Personalizado.zip';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
})();
