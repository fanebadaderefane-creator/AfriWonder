import { devLog } from '../utils/devLog';
import type { NativeInAppUpdateKind, NativeInAppUpdateResult } from './nativeInAppUpdate';

export type NativeInAppUpdateIosOptions = {
  title?: string;
  message?: string;
  forceUpgrade?: boolean;
};

/**
 * iOS : redirection App Store via react-native-siren (intégré à sp-react-native-in-app-updates).
 */
export async function startNativeInAppUpdate(
  kind: NativeInAppUpdateKind,
  options?: NativeInAppUpdateIosOptions,
): Promise<NativeInAppUpdateResult> {
  try {
    const mod = await import('sp-react-native-in-app-updates');
    const SpInAppUpdates = mod.default;
    const instance = new SpInAppUpdates(false);
    await instance.startUpdate({
      title: options?.title ?? 'Mise à jour disponible',
      message: options?.message,
      buttonUpgradeText: 'Mettre à jour',
      buttonCancelText: 'Plus tard',
      forceUpgrade: options?.forceUpgrade ?? kind === 'force',
    });
    return 'started';
  } catch (err) {
    devLog('[InAppUpdate] iOS startUpdate failed', err);
    return 'unavailable';
  }
}
