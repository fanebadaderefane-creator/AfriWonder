import { Alert, Platform } from 'react-native';
import ExpoPip from 'expo-pip';
import { logAfwCall } from '../call/callDiagnosticLog';
import type { PipEnterOptions } from './liveNativeExtras.types';

export type { PipEnterOptions } from './liveNativeExtras.types';

function pipSetParams(params: {
  width: number;
  height: number;
  title: string;
  seamlessResizeEnabled: boolean;
  autoEnterEnabled: boolean;
}): boolean {
  const setParams = ExpoPip?.setPictureInPictureParams;
  if (typeof setParams !== 'function') return false;
  setParams(params);
  return true;
}

export async function prepareVideoCallSystemPip(opts: {
  title?: string;
  silent?: boolean;
}): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    if (
      !pipSetParams({
      width: 200,
      height: 300,
      title: opts.title ?? 'Appel AfriWonder',
      seamlessResizeEnabled: true,
      autoEnterEnabled: false,
      })
    ) {
      return;
    }
    logAfwCall('system_pip_prepared', { title: opts.title ?? null });
  } catch (e) {
    logAfwCall('system_pip_prepare_failed', {
      silent: !!opts.silent,
      error: String((e as Error)?.message ?? e),
    });
  }
}

export async function tryEnterPictureInPicture(opts: PipEnterOptions = {}): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { silent = false, width = 200, height = 300, title } = opts;

  if (Platform.OS !== 'android') {
    logAfwCall('system_pip_skipped', { platform: Platform.OS, silent });
    return false;
  }

  try {
    const isAvailable = ExpoPip?.isAvailable;
    const available = typeof isAvailable === 'function' ? isAvailable() : true;

    if (!available) {
      logAfwCall('system_pip_unavailable', { silent });
      if (!silent) {
        Alert.alert(
          'Picture-in-Picture',
          'Le PiP n’est pas disponible sur cet appareil (Android 8+ recommandé).',
        );
      }
      return false;
    }

    pipSetParams({
      width,
      height,
      title: title ?? 'Appel AfriWonder',
      seamlessResizeEnabled: true,
      autoEnterEnabled: false,
    });

    const enterPip = ExpoPip?.enterPipMode;
    if (typeof enterPip === 'function') {
      await enterPip({ width, height });
      logAfwCall('system_pip_entered', { width, height });
      return true;
    }
  } catch (e) {
    logAfwCall('system_pip_failed', {
      silent,
      error: String((e as Error)?.message ?? e),
    });
  }

  if (!silent) {
    Alert.alert(
      'Picture-in-Picture',
      'Le PiP système nécessite un build natif récent (expo-pip). En attendant, l’appel continue en arrière-plan via le bandeau vert.',
    );
  }
  return false;
}

export async function tryLiveScreenShare(): Promise<void> {
  Alert.alert(
    'Partage d’écran',
    'En tant qu’hôte, ouvrez le studio live : l’icône bureau dans la barre du haut lance le partage d’écran (Android 5+ ou iPhone selon les réglages système).',
  );
}

export async function tryLiveSpeechToText(): Promise<void> {
  Alert.alert(
    'Sous-titres live',
    'Hôte : dictée → Whisper via le tableau de bord live (backend OPENAI_API_KEY). Spectateurs : sous-titres manuels diffusés en direct.',
  );
}

export { openWalletForCoins, openMobileMoneyInfo } from './liveNativeExtras.shared';
