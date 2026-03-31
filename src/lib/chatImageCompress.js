/**
 * Réduit taille des images chat (audit 3G) : JPEG ~0.72, max 1080px côté long.
 */
export async function compressImageFileForChat(file, { maxEdge = 1080, quality = 0.72 } = {}) {
  if (!file?.type?.startsWith('image/')) return file;
  if (typeof document === 'undefined') return file;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (!w || !h) {
        resolve(file);
        return;
      }
      const scale = Math.min(1, maxEdge / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
          resolve(
            new File([blob], `${base}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
          );
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
      resolve(file);
    };
    img.src = url;
  });
}
