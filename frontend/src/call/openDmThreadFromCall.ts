import { router } from 'expo-router';
import apiClient from '../api/client';
import { getAlertMessageForCaughtError } from '../utils/userFacingError';
import { Alert } from 'react-native';

/** Ouvre la discussion DM sans raccrocher (l’écran d’appel reste dans la pile de navigation). */
export async function openDmThreadFromCall(input: {
  otherUserId: string;
  peerName: string;
  peerAvatar?: string;
}): Promise<boolean> {
  const otherUserId = String(input.otherUserId || '').trim();
  if (!otherUserId) return false;
  try {
    const res = await apiClient.get(`/messages/conversation/${encodeURIComponent(otherUserId)}`);
    const conv = res.data?.data;
    const conversationId = conv?.id ? String(conv.id) : otherUserId;
    router.push({
      pathname: '/messages/[id]',
      params: {
        id: conversationId,
        name: input.peerName,
        avatar: input.peerAvatar || '',
        otherUserId,
      },
    } as never);
    return true;
  } catch (e: unknown) {
    Alert.alert('Discussion', getAlertMessageForCaughtError(e));
    return false;
  }
}
