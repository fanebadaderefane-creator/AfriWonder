import { Platform } from 'react-native';

/**
 * Limite le parallélisme de `expo-video-thumbnails.getThumbnailAsync` (I/O + décodeur natif)
 * pour éviter ANR / pic mémoire quand la grille lance 20+ extractions d’un coup.
 *
 * **Android** : 2 tâches — OOM / crash natif du décodeur (MediaMetadataRetriever) si on monte
 * devant 3+ extractions lourdes + Image `file://` en grille.
 */
function maxThumbExtractParallel(): number {
  if (Platform.OS === 'android') return 2;
  if (Platform.OS === 'ios') return 3;
  return 3;
}

const queue: (() => void)[] = [];
let inFlight = 0;

function pump() {
  const cap = maxThumbExtractParallel();
  while (inFlight < cap && queue.length) {
    const start = queue.shift();
    if (start) start();
  }
}

export function runWithThumbnailExtractConcurrency<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      inFlight += 1;
      void fn()
        .then(resolve, reject)
        .finally(() => {
          inFlight -= 1;
          pump();
        });
    };
    if (inFlight < maxThumbExtractParallel()) {
      run();
    } else {
      queue.push(run);
    }
  });
}
