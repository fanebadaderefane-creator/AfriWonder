import {
  cacheDirectory,
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { normalizeDmUploadMime, type DmUploadKind } from './dmMediaUpload';

const QUEUE_DIR = `${documentDirectory || ''}afw-dm-outbound/`;

export type PinnedDmMedia = {
  uri: string;
  fileName: string;
  mimeType: string;
};

function uploadKindFromOutbound(kind: string): DmUploadKind {
  if (kind === 'video') return 'video';
  if (kind === 'document') return 'document';
  if (kind === 'voice' || kind === 'audio') return 'audio';
  return 'image';
}

function extFromKind(kind: DmUploadKind, mime: string, fileName?: string): string {
  const fromName = String(fileName || '')
    .split('.')
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (fromName) return fromName.slice(0, 8);
  if (kind === 'video') return mime.includes('quicktime') ? 'mov' : 'mp4';
  if (kind === 'audio') return 'm4a';
  if (kind === 'document') return mime.includes('pdf') ? 'pdf' : 'bin';
  return mime.includes('png') ? 'png' : 'jpg';
}

async function ensureQueueDir(): Promise<string> {
  const base = QUEUE_DIR;
  if (!base || Platform.OS === 'web') return '';
  try {
    await makeDirectoryAsync(base, { intermediates: true });
  } catch {
    /* existe déjà */
  }
  return base;
}

/** Vérifie qu’un fichier local est lisible (taille > 0). */
export async function verifyReadableNativeFile(uri: string): Promise<boolean> {
  if (Platform.OS === 'web') return Boolean(uri);
  const u = String(uri || '').trim();
  if (!u) return false;
  try {
    const info = await getInfoAsync(u);
    return Boolean(info.exists && (info.size == null || info.size > 0));
  } catch {
    return false;
  }
}

/**
 * Copie durable dans `documentDirectory` — survit fermeture discussion / nettoyage cache Expo.
 * Appelé avant tout upload DM natif (Android/iOS).
 */
export async function pinDmMediaFile(input: {
  sourceUri: string;
  messageId: string;
  kind: 'voice' | 'audio' | 'image' | 'video' | 'document';
  fileName?: string;
  mimeType?: string;
}): Promise<PinnedDmMedia> {
  const sourceUri = String(input.sourceUri || '').trim();
  if (!sourceUri) throw new Error('DM_MEDIA_URI_MISSING');

  const uploadKind = uploadKindFromOutbound(input.kind);
  const mimeType = normalizeDmUploadMime(input.mimeType, uploadKind, input.fileName);
  const ext = extFromKind(uploadKind, mimeType, input.fileName);
  const safeName =
    String(input.fileName || `media_${input.messageId}.${ext}`)
      .replace(/[^\w.\- \u00C0-\u024F]+/g, '_')
      .slice(0, 180) || `media_${input.messageId}.${ext}`;

  if (Platform.OS === 'web') {
    return { uri: sourceUri, fileName: safeName, mimeType };
  }

  const queueBase = await ensureQueueDir();
  if (!queueBase) {
    return { uri: sourceUri, fileName: safeName, mimeType };
  }

  const dest = `${queueBase}${input.messageId}.${ext}`;
  const alreadyPinned = sourceUri.startsWith(queueBase) && sourceUri.includes(input.messageId);
  if (!alreadyPinned) {
    try {
      await copyAsync({ from: sourceUri, to: dest });
    } catch {
      /** Fallback cache éphémère si documentDirectory indisponible */
      const cache = cacheDirectory;
      if (cache) {
        const cacheDest = `${cache}afw-dm-${input.messageId}.${ext}`;
        await copyAsync({ from: sourceUri, to: cacheDest });
        const ok = await verifyReadableNativeFile(cacheDest);
        if (!ok) throw new Error('DM_MEDIA_FILE_UNREADABLE');
        return { uri: cacheDest, fileName: safeName, mimeType };
      }
      throw new Error('DM_MEDIA_FILE_UNREADABLE');
    }
  }

  const finalUri = alreadyPinned ? sourceUri : dest;
  const ok = await verifyReadableNativeFile(finalUri);
  if (!ok) throw new Error('DM_MEDIA_FILE_UNREADABLE');
  return { uri: finalUri, fileName: safeName, mimeType };
}

export async function releasePinnedDmMedia(messageId: string): Promise<void> {
  if (Platform.OS === 'web' || !messageId) return;
  const base = await ensureQueueDir();
  if (!base) return;
  const prefixes = [`${base}${messageId}.`];
  try {
    for (const prefix of prefixes) {
      const dir = base;
      if (!dir) continue;
      /** Suppression best-effort par motif id — extensions variables */
      const exts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'm4a', 'mp3', 'wav', 'pdf', 'doc', 'docx', 'bin'];
      await Promise.all(
        exts.map((ext) =>
          deleteAsync(`${dir}${messageId}.${ext}`, { idempotent: true }).catch(() => undefined),
        ),
      );
      void prefix;
    }
  } catch {
    /* ignore */
  }
}
