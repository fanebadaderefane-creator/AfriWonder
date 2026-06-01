import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { PermissionsAndroid, Platform } from 'react-native';
import { tryLoadReactNativeWebRtc } from './tryLoadReactNativeWebRtc';

type InCallManagerLike = {
  start: (opts: { media: string; auto?: boolean; ringback?: string }) => void;
  stop: () => void;
  setSpeakerphoneOn: (on: boolean) => void;
  setForceSpeakerphoneOn: (on: boolean) => void;
};

function loadInCallManager(): InCallManagerLike | null {
  if (Platform.OS === 'web') return null;
  try {
    const mod = require('react-native-incall-manager') as { default?: InCallManagerLike };
    return mod?.default ?? null;
  } catch {
    return null;
  }
}

let incallSessionActive = false;

/** `mediaDevices` après `registerGlobals()` — pas seulement l’export nommé du module. */
export function resolveWebRtcMediaDevices(): MediaDevices | undefined {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  }
  const mod = tryLoadReactNativeWebRtc() as { mediaDevices?: MediaDevices } | null;
  const fromModule = mod?.mediaDevices;
  const fromNavigator =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { mediaDevices?: MediaDevices }).mediaDevices
      : undefined;
  return fromModule || fromNavigator;
}

export async function requestNativeCallPermissions(isVideo: boolean): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    if (Platform.OS === 'android') {
      const audio = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (audio !== PermissionsAndroid.RESULTS.GRANTED) return false;
      if (isVideo) {
        const cam = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (cam !== PermissionsAndroid.RESULTS.GRANTED) return false;
      }
      return true;
    }
    const mic = await Audio.requestPermissionsAsync();
    if (!mic.granted) return false;
    if (isVideo) {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Libère la session `expo-av` (sonnerie / feed) pour que `react-native-webrtc` prenne le micro + HP.
 * Ne pas appeler `setAudioModeAsync` juste avant getUserMedia — ça bloque l’audio des deux côtés.
 */
export async function releaseExpoAvForWebRtcCall(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Audio.setIsEnabledAsync(false);
  } catch {
    /* ignore */
  }
  try {
    await Audio.setIsEnabledAsync(true);
  } catch {
    /* ignore */
  }
}

/**
 * Session audio native pour appels WebRTC (HP / écouteur / micro).
 * `react-native-incall-manager` est recommandé sur Android — sinon fallback expo-av.
 */
/** Démarre la session audio native une seule fois par appel (InCallManager / expo-av). */
export async function startNativeCallAudioSession(isVideo: boolean, speakerOn: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  if (incallSessionActive) {
    await applyNativeCallSpeakerRoute(speakerOn);
    return;
  }
  const incall = loadInCallManager();
  if (incall) {
    try {
      incall.start({ media: isVideo ? 'video' : 'audio', auto: true, ringback: '' });
      incall.setSpeakerphoneOn(speakerOn);
      incall.setForceSpeakerphoneOn(speakerOn);
      incallSessionActive = true;
      return;
    } catch {
      /* fallback expo-av */
    }
  }
  await applyNativeCallSpeakerRoute(speakerOn);
  incallSessionActive = true;
}

export async function stopNativeCallAudioSession(): Promise<void> {
  if (Platform.OS === 'web' || !incallSessionActive) return;
  incallSessionActive = false;
  const incall = loadInCallManager();
  if (incall) {
    try {
      incall.stop();
    } catch {
      /* ignore */
    }
  }
}

/** Haut-parleur / écouteur — toggle utilisateur ou connexion établie. */
export async function applyNativeCallSpeakerRoute(speakerOn: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  const incall = loadInCallManager();
  if (incall && incallSessionActive) {
    try {
      incall.setSpeakerphoneOn(speakerOn);
      incall.setForceSpeakerphoneOn(speakerOn);
      return;
    } catch {
      /* fallback */
    }
  }
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: !speakerOn,
      staysActiveInBackground: true,
    });
  } catch {
    /* ignore */
  }
}
