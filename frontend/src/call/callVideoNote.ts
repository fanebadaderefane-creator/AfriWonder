import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import apiClient from '../api/client';
import { sendDmOutboundMedia } from '../messages/sendDmOutboundMedia';
import { getAlertMessageForCaughtError } from '../utils/userFacingError';

/** Enregistre une courte note vidéo (style WhatsApp « Sans réponse ») et l’envoie en DM. */
export async function recordAndSendCallVideoNote(input: {
  recipientId: string;
  peerName: string;
}): Promise<{ ok: boolean; message?: string }> {
  if (Platform.OS === 'web') {
    return { ok: false, message: 'Note vidéo disponible sur l’application mobile.' };
  }
  const recipientId = String(input.recipientId || '').trim();
  if (!recipientId) return { ok: false, message: 'Destinataire invalide.' };

  try {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      return { ok: false, message: 'Autorisez la caméra pour enregistrer une note vidéo.' };
    }
    const mic = await Audio.requestPermissionsAsync();
    if (!mic.granted) {
      return { ok: false, message: 'Autorisez le micro pour enregistrer une note vidéo.' };
    }

    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 60,
      quality: 0.75,
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) {
      return { ok: false, message: 'Enregistrement annulé.' };
    }

    let conversationId = '';
    try {
      const r = await apiClient.get(`/messages/conversation/${encodeURIComponent(recipientId)}`);
      const conv = r.data?.data;
      if (conv?.id) conversationId = String(conv.id);
    } catch {
      /* fil créé au send */
    }

    const asset = picked.assets[0];
    await sendDmOutboundMedia({
      kind: 'video',
      localUri: asset.uri,
      messageId: `vnote-${Date.now()}`,
      recipientId,
      conversationId: conversationId || recipientId,
      content: `📹 Note vidéo — ${input.peerName}`,
      fileName: asset.fileName || `note-${Date.now()}.mp4`,
      mimeType: asset.mimeType || 'video/mp4',
    });
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, message: getAlertMessageForCaughtError(e) };
  }
}

export function alertVideoNoteResult(result: { ok: boolean; message?: string }, peerName: string): void {
  if (result.ok) {
    Alert.alert('Note vidéo', `Votre message vidéo a été envoyé à ${peerName}.`);
    return;
  }
  if (result.message && result.message !== 'Enregistrement annulé.') {
    Alert.alert('Note vidéo', result.message);
  }
}
