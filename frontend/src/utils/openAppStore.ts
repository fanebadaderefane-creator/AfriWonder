import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';

export const ANDROID_PACKAGE_ID = 'com.afriwonder.app';

export const DEFAULT_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}`;

/** Ouvre la fiche Play Store (Android) ou App Store (iOS). */
export function openAppStore(storeUrl?: string): void {
  const playHttps = (storeUrl || DEFAULT_PLAY_STORE_URL).trim() || DEFAULT_PLAY_STORE_URL;
  if (Platform.OS === 'android') {
    void Linking.openURL(`market://details?id=${ANDROID_PACKAGE_ID}`).catch(() => Linking.openURL(playHttps));
    return;
  }
  if (Platform.OS === 'ios') {
    const appStoreId = (Constants.expoConfig?.extra as { appStoreId?: string } | undefined)?.appStoreId;
    if (appStoreId) {
      void Linking.openURL(`https://apps.apple.com/app/id${appStoreId}`);
      return;
    }
    const iosUrl = storeUrl?.trim();
    if (iosUrl) {
      void Linking.openURL(iosUrl);
      return;
    }
    void Linking.openURL('https://apps.apple.com/search?term=AfriWonder');
  }
}
