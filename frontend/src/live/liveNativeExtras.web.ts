import { Alert } from 'react-native';
import { router } from 'expo-router';

export type { PipEnterOptions } from './liveNativeExtras.types';

export async function prepareVideoCallSystemPip(_opts?: {
  title?: string;
  silent?: boolean;
}): Promise<void> {
  /* Web — pas de PiP système */
}

export async function tryEnterPictureInPicture(_opts?: import('./liveNativeExtras.types').PipEnterOptions): Promise<boolean> {
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
