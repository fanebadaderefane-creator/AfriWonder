import { cacheDirectory, copyAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import apiClient from '../api/client';
import { beginUploadNetworkPriority, endUploadNetworkPriority } from '../api/uploadNetworkPriority';

export type DmUploadKind = 'image' | 'video' | 'audio' | 'document';

export function normalizeDmUploadMime(
  mime: string | null | undefined,
  kind: DmUploadKind,
  fileName?: string | null,
): string {
  let m = String(mime || '').toLowerCase().trim();
  if (m === 'image/jpg') m = 'image/jpeg';
  if (m === 'audio/m4a' || m === 'audio/x-m4a') m = 'audio/mp4';

  const ext = String(fileName || '')
    .split('.')
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (!m || m === 'application/octet-stream' || m === 'binary/octet-stream') {
    if (kind === 'image') {
      if (ext === 'png') return 'image/png';
      if (ext === 'webp') return 'image/webp';
      if (ext === 'gif') return 'image/gif';
      return 'image/jpeg';
    }
    if (kind === 'video') {
      if (ext === 'webm') return 'video/webm';
      if (ext === 'mov') return 'video/quicktime';
      return 'video/mp4';
    }
    if (kind === 'audio') {
      if (ext === 'mp3') return 'audio/mpeg';
      if (ext === 'wav') return 'audio/wav';
      if (ext === 'ogg') return 'audio/ogg';
      return 'audio/mp4';
    }
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'doc') return 'application/msword';
    if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return kind === 'document' ? 'application/pdf' : 'application/octet-stream';
  }
  return m;
}

/**
 * Android : `content://` peut être révoqué pendant un POST multipart → copie cache `file://`.
 */
export async function copyNativeUriToCacheForDmUpload(uri: string, extHint: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  const u = uri.trim();
  /** Android : copie systématique avant PUT/upload — URI galerie parfois révoquée en cours de transfert. */
  const shouldCopy =
    Platform.OS === 'android' ||
    u.startsWith('content://') ||
    u.startsWith('ph://') ||
    u.startsWith('assets-library://');
  if (!shouldCopy) return u;
  const dir = cacheDirectory;
  if (!dir) return u;
  const safeExt = extHint.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin';
  const dest = `${dir}afw-dm-upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${safeExt}`;
  try {
    await copyAsync({ from: u, to: dest });
    return dest;
  } catch {
    return u;
  }
}

function defaultExtForKind(kind: DmUploadKind, mime: string): string {
  if (kind === 'video') return mime.includes('webm') ? 'webm' : mime.includes('quicktime') ? 'mov' : 'mp4';
  if (kind === 'audio') return mime.includes('mpeg') ? 'mp3' : mime.includes('wav') ? 'wav' : 'm4a';
  if (kind === 'document') return mime.includes('pdf') ? 'pdf' : 'bin';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'jpg';
}

export async function appendDmUploadFile(
  formData: globalThis.FormData,
  uri: string,
  index: number,
  kind: DmUploadKind,
  opts?: { mimeType?: string | null; fileName?: string | null },
): Promise<void> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    let mime = String(blob.type || '').toLowerCase().trim();
    if (!mime || mime === 'application/octet-stream') {
      mime = kind === 'video' ? 'video/mp4' : kind === 'audio' ? 'audio/mp4' : kind === 'document' ? 'application/pdf' : 'image/jpeg';
    }
    mime = normalizeDmUploadMime(mime, kind);
    const ext = defaultExtForKind(kind, mime);
    formData.append('file', new File([blob], `upload_${index}.${ext}`, { type: mime }));
    return;
  }

  const providedName = String(opts?.fileName || '').trim();
  const mimeType = normalizeDmUploadMime(opts?.mimeType, kind, providedName);
  const ext = defaultExtForKind(kind, mimeType);
  const safeName =
    providedName.replace(/[^\w.\- \u00C0-\u024F]+/g, '_').slice(0, 180) || `upload_${index}.${ext}`;
  const uploadUri = await copyNativeUriToCacheForDmUpload(uri, ext);
  formData.append('file', { uri: uploadUri, name: safeName, type: mimeType } as any);
}

export async function postDmMediaUpload(kind: DmUploadKind, formData: globalThis.FormData) {
  const path =
    kind === 'document'
      ? '/upload/document'
      : kind === 'audio'
        ? '/upload/audio'
        : kind === 'video'
          ? '/upload/video'
          : '/upload/image';
  const timeout = kind === 'image' || kind === 'audio' ? 120_000 : 300_000;
  beginUploadNetworkPriority();
  try {
    return await apiClient.post(path, formData, {
      timeout,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  } finally {
    endUploadNetworkPriority();
  }
}

export function extractUploadedMediaUrl(responseData: unknown): {
  mediaUrl: string;
  thumbnailUrl?: string;
} {
  const root = responseData as { data?: { data?: Record<string, unknown> } & Record<string, unknown> };
  const ud = (root?.data?.data ?? root?.data ?? responseData) as Record<string, unknown>;
  const mediaUrl = String(ud?.file_url || ud?.url || '').trim();
  const thumbnailUrl = ud?.thumbnail_url ? String(ud.thumbnail_url) : undefined;
  return { mediaUrl, thumbnailUrl };
}
