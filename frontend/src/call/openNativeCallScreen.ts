import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { featureFlags } from '../config/featureFlags';
import { isWebRtcRuntimeAvailable } from './tryLoadReactNativeWebRtc';
import {
  getNativeCallLaunchBlockReason,
  nativeCallLaunchBlockedMessage,
} from './openNativeCallScreenLogic';

export type { NativeCallLaunchBlockReason } from './openNativeCallScreenLogic';
export { getNativeCallLaunchBlockReason, nativeCallLaunchBlockedMessage } from './openNativeCallScreenLogic';

export type OpenNativeCallScreenParams = {
  peerUserId: string;
  peerName: string;
  peerAvatar?: string;
  type: 'audio' | 'video';
};

/** Ouvre `/messages/call` ou affiche une alerte si l’appareil ne peut pas passer d’appel natif. */
export function openNativeCallScreen(params: OpenNativeCallScreenParams): boolean {
  const block = getNativeCallLaunchBlockReason({
    platformOs: Platform.OS,
    callsOnNative: featureFlags.callsOnNative,
    hasWebRtcRuntime: isWebRtcRuntimeAvailable(),
    peerUserId: params.peerUserId,
  });
  if (block) {
    Alert.alert('Appel', nativeCallLaunchBlockedMessage(block));
    return false;
  }
  router.push({
    pathname: '/messages/call',
    params: {
      name: params.peerName,
      avatar: params.peerAvatar || '',
      type: params.type,
      otherUserId: String(params.peerUserId),
      role: 'caller',
    },
  } as never);
  return true;
}
