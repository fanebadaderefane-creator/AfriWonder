import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { featureFlags } from '../config/featureFlags';
import { prepareCallSessionMemory } from './callSessionStability';
import { isWebRtcRuntimeAvailable } from './tryLoadReactNativeWebRtc';
import {
  outboundVideoDowngradeMessage,
  resolveOutboundCallTypeForNetwork,
  type NetworkSnapshot,
} from './callNetworkConfig';
import {
  buildReceiverCallRouteParams,
  getNativeCallLaunchBlockReason,
  nativeCallLaunchBlockedMessage,
  type ReceiverCallScreenInput,
} from './openNativeCallScreenLogic';
import { clearWebCallMediaCapture, primeWebCallMediaCapture } from './webCallMediaSession';
import { shouldUseAgoraDmCalls } from './dmCallMediaEngine';
import { logAfwCall } from './callDiagnosticLog';

export type { NativeCallLaunchBlockReason } from './openNativeCallScreenLogic';
export { getNativeCallLaunchBlockReason, nativeCallLaunchBlockedMessage } from './openNativeCallScreenLogic';

export type OpenNativeCallScreenParams = {
  peerUserId: string;
  peerName: string;
  peerAvatar?: string;
  type: 'audio' | 'video';
};

/**
 * Sonde réseau plafonnée : `NetInfo.fetch()` peut être lent sur réseaux dégradés
 * (Mali / 4G instable). Sans plafond, la navigation vers l'écran d'appel attendait
 * cette promesse pour un appel vidéo → « rien ne se passe après accepter ». On
 * renvoie `null` après le délai pour ne jamais bloquer l'ouverture de l'appel.
 */
const NETWORK_SNAPSHOT_TIMEOUT_MS = 1_500;

async function fetchCallNetworkSnapshot(): Promise<NetworkSnapshot | null> {
  try {
    const timed = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), NETWORK_SNAPSHOT_TIMEOUT_MS),
    );
    const fetched = NetInfo.fetch().then((st) => {
      const details = (st.details || {}) as { cellularGeneration?: string | null };
      return { type: st.type, cellularGeneration: details.cellularGeneration } as NetworkSnapshot;
    });
    return await Promise.race([fetched, timed]);
  } catch {
    return null;
  }
}

function pushCallerCallScreen(params: OpenNativeCallScreenParams, callType: 'audio' | 'video'): void {
  router.push({
    pathname: '/messages/call',
    params: {
      name: params.peerName,
      avatar: params.peerAvatar || '',
      type: callType,
      otherUserId: String(params.peerUserId),
      role: 'caller',
      sessionNonce: String(Date.now()),
    },
  } as never);
}

/** Ouvre `/messages/call` ou affiche une alerte si l’appareil ne peut pas passer d’appel natif. */
export function openNativeCallScreen(params: OpenNativeCallScreenParams): boolean {
  const block = getNativeCallLaunchBlockReason({
    platformOs: Platform.OS,
    callsOnNative: featureFlags.callsOnNative,
    hasWebRtcRuntime: isWebRtcRuntimeAvailable(),
    hasAgoraRtc: Platform.OS !== 'web',
    dmCallsUseAgora: shouldUseAgoraDmCalls(),
    peerUserId: params.peerUserId,
  });
  if (block) {
    Alert.alert('Appel', nativeCallLaunchBlockedMessage(block));
    return false;
  }
  prepareCallSessionMemory();
  /**
   * Web : getUserMedia doit être invoqué pendant le clic « Appeler ».
   * Si on attend NetInfo (~1,5 s) avant prime, Firefox renvoie NotFoundError
   * (« The object can not be found here ») sans popup permission.
   */
  if (Platform.OS === 'web') {
    primeWebCallMediaCapture(params.type === 'video');
  }
  void (async () => {
    let callType = params.type;
    if (params.type === 'video') {
      const net = await fetchCallNetworkSnapshot();
      const resolved = resolveOutboundCallTypeForNetwork('video', net);
      callType = resolved.type;
      if (resolved.downgradedFromVideo && Platform.OS === 'web') {
        clearWebCallMediaCapture();
      }
      const downgradeMsg = resolved.downgradedFromVideo ? outboundVideoDowngradeMessage(net) : null;
      if (downgradeMsg) {
        Alert.alert('Appel', downgradeMsg);
      }
    }
    pushCallerCallScreen(params, callType);
  })();
  return true;
}

export type { ReceiverCallScreenInput };

/**
 * Ouvre l’écran d’appel en tant que destinataire (overlay, CallKit, Notifee, push).
 * Prépare la mémoire et pré-capture le micro web pendant le geste utilisateur.
 */
export function navigateToReceiverCallScreen(input: ReceiverCallScreenInput): void {
  prepareCallSessionMemory();
  if (Platform.OS === 'web') {
    primeWebCallMediaCapture(input.type === 'video');
  }
  void (async () => {
    /** Appel vidéo entrant : ne pas rétrograder en audio seul (sinon pas de `autoSubscribeVideo` Agora). */
    const callType = input.type;
    const pushReceiverScreen = () => {
      router.push({
        pathname: '/messages/call',
        params: buildReceiverCallRouteParams({ ...input, type: callType }),
      } as never);
    };
    logAfwCall('receiver_nav_push', { callId: input.callId, type: callType });
    try {
      pushReceiverScreen();
    } catch (e) {
      // Cold start (accept depuis notif / écran verrouillé) : le router peut ne pas être
      // monté au 1er push. On loggue (plus de catch silencieux) et on retente une fois.
      logAfwCall('receiver_nav_push_failed', { callId: input.callId, error: String(e) });
      setTimeout(() => {
        try {
          pushReceiverScreen();
          logAfwCall('receiver_nav_push_retry_ok', { callId: input.callId });
        } catch (e2) {
          logAfwCall('receiver_nav_push_retry_failed', { callId: input.callId, error: String(e2) });
        }
      }, 400);
    }
  })();
}
