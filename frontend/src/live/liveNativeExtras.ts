import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';

/**
 * Fonctions « lourdes » (PiP natif, partage d’écran, STT, IAP) : garde-fous produit.
 * Fond virtuel : moteur vidéo natif (hors JS) — détail côté studio live.
 */

export async function tryEnterPictureInPicture(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    // expo-pip (dev build) — API `enterPipMode` (Android) ; fallback legacy si présent.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-pip') as Record<string, unknown>;
    const ExpoPip = (mod?.default ?? mod) as {
      enterPipMode?: (p: { width: number; height: number }) => Promise<void>;
      isAvailable?: () => Promise<boolean>;
      enterPictureInPictureAsync?: () => Promise<void>;
    };
    if (typeof ExpoPip.enterPipMode === 'function') {
      const ok =
        typeof ExpoPip.isAvailable === 'function' ? await ExpoPip.isAvailable().catch(() => true) : true;
      if (!ok) {
        Alert.alert('Picture-in-Picture', 'Le PiP n’est pas disponible sur cet appareil (Android 8+ recommandé).');
        return false;
      }
      await ExpoPip.enterPipMode({ width: 200, height: 300 });
      return true;
    }
    if (typeof ExpoPip.enterPictureInPictureAsync === 'function') {
      await ExpoPip.enterPictureInPictureAsync();
      return true;
    }
  } catch {
    // module absent ou build sans PiP
  }
  Alert.alert(
    'Picture-in-Picture',
    'Installez le module expo-pip et refaites un build natif (Android) pour activer le PiP.',
  );
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

export function openWalletForCoins(): void {
  router.push('/wallet/coins' as never);
}

export function openMobileMoneyInfo(): void {
  Alert.alert(
    'Achat de coins',
    'Rechargez via Mobile Money depuis l’écran Wallet (Orange Money, etc.). Les IAP App Store / Play Store sont à configurer selon votre compte marchand.',
    [{ text: 'Ouvrir Wallet', onPress: () => router.push('/wallet/coins' as never) }],
  );
}
