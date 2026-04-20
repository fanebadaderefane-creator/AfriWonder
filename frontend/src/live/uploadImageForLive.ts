import { Platform } from 'react-native';
import apiClient from '../api/client';

function mimeForImageExt(ext: string): string {
  const e = String(ext || '').toLowerCase().replace(/^\./, '');
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  if (e === 'gif') return 'image/gif';
  return 'image/jpeg';
}

/** Upload image → URL absolue pour `thumbnail_url` du live. */
export async function uploadImageForLive(localUri: string): Promise<string> {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const res = await fetch(localUri);
    const blob = await res.blob();
    let mime = String(blob.type || '').toLowerCase().trim();
    if (!mime || mime === 'application/octet-stream') mime = 'image/jpeg';
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    formData.append('file', new File([blob], `live_thumb.${ext}`, { type: mime }));
  } else {
    const raw = (localUri.split('.').pop() || '').split('?')[0] || '';
    const ext = raw.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'jpg';
    formData.append('file', {
      uri: localUri,
      name: `live_thumb.${ext}`,
      type: mimeForImageExt(ext),
    } as unknown as Blob);
  }
  const uploadRes = await apiClient.post('/upload/image', formData, {
    timeout: 120000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  const fileUrl = uploadRes.data?.data?.file_url || uploadRes.data?.file_url;
  if (!fileUrl || typeof fileUrl !== 'string') throw new Error('Réponse upload invalide');
  return fileUrl;
}
