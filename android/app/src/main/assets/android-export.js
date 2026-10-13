/* Puente únicamente para WebView Android: exporta blobs con el selector de archivos. */
(function () {
  'use strict';
  if (!window.QTEAndroid || window.__qteAndroidExportsReady) return;
  window.__qteAndroidExportsReady = true;
  const original = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (!this.download || !this.href.startsWith('blob:')) return original.apply(this, arguments);
    const filename = this.download || 'QTE_Lab_respaldo.json';
    const url = this.href;
    (async function () {
      let job = null;
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        job = window.QTEAndroid.beginExport(filename);
        for (let offset = 0; offset < blob.size; offset += 49152) {
          const part = blob.slice(offset, offset + 49152);
          const b64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(part);
          });
          if (!window.QTEAndroid.appendExportChunk(job, b64)) throw Error('No se pudo transferir el respaldo');
        }
        window.QTEAndroid.finishExport(job, filename);
      } catch (error) {
        if (job) window.QTEAndroid.cancelExport(job);
        alert('Error al exportar respaldo: ' + (error.message || error));
      }
    })();
  };
})();
