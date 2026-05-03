import { Alert, Platform } from 'react-native';

/**
 * Feedback utilisateur sur **toutes** les plateformes : sur Expo Web, `Alert.alert`
 * peut ne rien afficher ; `window.alert` garantit un retour visible.
 */
export function appAlert(title: string, message?: string): void {
  const msg = message?.trim();
  const text = msg ? `${title}\n\n${msg}` : title;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(text);
    }
    return;
  }
  if (msg) {
    Alert.alert(title, msg);
  } else {
    Alert.alert(title);
  }
}
