import DeviceInfo from 'react-native-device-info';
import { devLog } from '../utils/devLog';

let cached: boolean | null = null;

/**
 * Android : FCM (push Expo) et Play Billing exigent Google Mobile Services.
 * Sans GMS (Huawei, émulateur sans Play, GMS désactivé), on évite tout appel
 * natif qui affiche le dialogue système « Something went wrong ».
 */
export async function isGoogleMobileServicesReady(): Promise<boolean> {
  if (cached !== null) return cached;
  try {
    cached = await DeviceInfo.hasGms();
    if (!cached) {
      devLog(
        '[GMS] Google Play Services indisponibles — notifications push distantes et achats Play ignorés.',
      );
    }
    return cached;
  } catch (err) {
    devLog('[GMS] Vérification impossible — FCM/IAP Play désactivés par précaution:', err);
    cached = false;
    return false;
  }
}

export function resetGoogleMobileServicesCacheForTests(): void {
  cached = null;
}
