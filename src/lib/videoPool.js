/**
 * Video Pool — réutilisation de N lecteurs <video> pour tout le feed (TikTok / Reels / Shorts).
 * Réduit RAM, rebuffer et lags sur mobile (surtout Android faible puissance).
 * @param {number} size - Nombre de lecteurs dans le pool (défaut 3 : précédent, actuel, suivant)
 * @returns {HTMLVideoElement[]}
 */
export function createVideoPool(size = 3) {
  const pool = [];

  for (let i = 0; i < size; i++) {
    const video = document.createElement('video');
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');
    video.muted = true;
    video.loop = true;
    video.preload = 'auto';
    video.className = 'absolute inset-0 w-full h-full object-cover';
    video.style.pointerEvents = 'auto';
    video.dataset.afwPoolPlayer = '1';

    pool.push(video);
  }

  return pool;
}

/**
 * Détache un lecteur du pool de son parent et le met en pause (pour réutilisation).
 * On ne vide pas src/load() pour éviter tout flash noir ; la prochaine affectation mettra la nouvelle source.
 * @param {HTMLVideoElement} player
 */
export function releasePoolPlayer(player) {
  if (!player || !player.parentNode) return;
  try {
    player.pause();
    player.parentNode.removeChild(player);
  } catch (_) {}
}
