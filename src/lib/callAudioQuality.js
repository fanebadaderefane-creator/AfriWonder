/**
 * Parité PWA avec frontend/src/call/callAudioQuality.ts — fonctions utilisées par DirectCall.
 */

function transceiverKind(t) {
  return String(t.sender?.track?.kind || t.receiver?.track?.kind || '');
}

function transceiverIsSending(t) {
  return Boolean(t.sender?.track);
}

export function selectRedundantTransceivers(transceivers) {
  const keptSenderByKind = new Set();
  const redundant = [];
  for (const t of transceivers) {
    const kind = transceiverKind(t);
    if (kind !== 'audio' && kind !== 'video') continue;
    if (transceiverIsSending(t)) {
      if (keptSenderByKind.has(kind)) {
        redundant.push(t);
        continue;
      }
      keptSenderByKind.add(kind);
      continue;
    }
    redundant.push(t);
  }
  return redundant.filter((t) => keptSenderByKind.has(transceiverKind(t)));
}

/** Neutralise les transceivers en doublon avant createOffer/createAnswer. */
export function pruneRedundantCallTransceivers(pc) {
  if (!pc?.getTransceivers) return 0;
  let stopped = 0;
  try {
    const all = pc.getTransceivers();
    for (const t of selectRedundantTransceivers(all)) {
      try {
        t.stop?.();
        stopped += 1;
      } catch {
        /* best-effort */
      }
    }
  } catch {
    /* getTransceivers absent — best-effort */
  }
  return stopped;
}
