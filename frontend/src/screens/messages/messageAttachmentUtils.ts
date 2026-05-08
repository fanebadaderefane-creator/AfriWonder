import { Platform, Linking } from 'react-native';
import type { ExistingContact } from 'expo-contacts';

/** Ligne lisible pour un message type contact (backend accepte `contact_name`). */
export function formatContactShareLine(c: ExistingContact): string {
  const name =
    [c.firstName, c.lastName].filter(Boolean).join(' ').trim() ||
    (c.company || '').trim() ||
    (c.name || '').trim() ||
    'Contact';
  const phone = c.phoneNumbers?.find((p) => p.number)?.number?.trim();
  const line = phone ? `${name} · ${phone}` : name;
  return line.slice(0, 500);
}

export function openMaps(lat: number, lng: number, label?: string): void {
  const q = label ? encodeURIComponent(label) : `${lat},${lng}`;
  const url =
    Platform.OS === 'ios'
      ? `maps:0,0?q=${q}&ll=${lat},${lng}`
      : Platform.OS === 'android'
        ? `geo:${lat},${lng}?q=${lat},${lng}(${q})`
        : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
  void Linking.openURL(url);
}

/** Append fichier document ou audio pour POST multipart /upload/document | /upload/audio */
export async function appendBlobOrFileField(
  formData: globalThis.FormData,
  uri: string,
  fileName: string,
  mime: string,
  mode: 'document' | 'audio',
): Promise<void> {
  const safe =
    fileName.replace(/[^\w.\- \u00C0-\u024F]+/g, '_').slice(0, 180) ||
    (mode === 'document' ? 'document.pdf' : 'audio.m4a');
  const fallbackMime = mode === 'document' ? 'application/pdf' : 'audio/mpeg';
  const ext = (safe.split('.').pop() || '').toLowerCase();

  const inferMimeFromExt = (): string => {
    if (mode === 'audio') {
      if (ext === 'm4a' || ext === 'mp4' || ext === 'aac') return 'audio/mp4';
      if (ext === 'mp3') return 'audio/mpeg';
      if (ext === 'wav') return 'audio/wav';
      if (ext === 'ogg' || ext === 'oga') return 'audio/ogg';
      return 'audio/mpeg';
    }
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'doc') return 'application/msword';
    if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (ext === 'xls') return 'application/vnd.ms-excel';
    if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (ext === 'ppt') return 'application/vnd.ms-powerpoint';
    if (ext === 'pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    if (ext === 'txt') return 'text/plain';
    return 'application/pdf';
  };

  let ct = (mime || '').trim().toLowerCase();
  if (!ct || ct === 'application/octet-stream') {
    ct = inferMimeFromExt();
  }
  if (mode === 'audio' && ct === 'audio/m4a') {
    // Backend whitelist accepte audio/mp4 (conteneur m4a)
    ct = 'audio/mp4';
  }
  if (!ct) ct = fallbackMime;

  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    const type = ct || blob.type || fallbackMime;
    formData.append('file', new File([blob], safe, { type }));
    return;
  }
  formData.append('file', { uri, name: safe, type: ct } as any);
}
