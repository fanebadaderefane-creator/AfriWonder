import { devLog } from '../utils/devLog';
import { isGoogleMobileServicesReady } from '../lib/googlePlayServices';
import type { NativeInAppUpdateKind, NativeInAppUpdateResult } from './nativeInAppUpdate';

let flexibleListenerAttached = false;

/**
 * Google Play In-App Updates (Flexible / Immediate).
 * Import dynamique : module natif absent dans Expo Go.
 */
export async function startNativeInAppUpdate(
  kind: NativeInAppUpdateKind,
): Promise<NativeInAppUpdateResult> {
  if (!(await isGoogleMobileServicesReady())) {
    return 'unavailable';
  }
  try {
    const mod = await import('sp-react-native-in-app-updates');
    const SpInAppUpdates = mod.default;
    const { IAUUpdateKind, IAUInstallStatus } = mod;
    const instance = new SpInAppUpdates(false);

    if (kind === 'soft' && !flexibleListenerAttached) {
      flexibleListenerAttached = true;
      instance.addStatusUpdateListener((status) => {
        if (status.status === IAUInstallStatus.DOWNLOADED) {
          try {
            instance.installUpdate();
          } catch (err) {
            devLog('[InAppUpdate] installUpdate failed', err);
          }
        }
      });
    }

    await instance.startUpdate({
      updateType: kind === 'force' ? IAUUpdateKind.IMMEDIATE : IAUUpdateKind.FLEXIBLE,
    });
    return 'started';
  } catch (err) {
    devLog('[InAppUpdate] startUpdate failed', err);
    return 'unavailable';
  }
}
