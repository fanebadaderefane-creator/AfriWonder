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
  const fallbackMime =
    mode === 'document' ? 'application/pdf' : 'audio/mpeg';
  const ct = (mime || '').trim() || fallbackMime;

  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    const type = ct || blob.type || fallbackMime;
    formData.append('file', new File([blob], safe, { type }));
    return;
  }
  formData.append('file', { uri, name: safe, type: ct } as any);
}
