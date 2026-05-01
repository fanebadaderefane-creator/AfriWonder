/**
 * Doit être importé une fois au démarrage (avant WebCrypto / clés E2EE).
 * Requis pour `crypto.getRandomValues` sur certaines builds React Native.
 */
import 'react-native-get-random-values';

/**
 * Web : `expo-font` / FontFaceObserver peut rejeter avec `6000ms timeout exceeded` si la police
 * vector-icons n'est pas prête assez vite. Le handler dans `_layout` arrive trop tard pour le
 * LogBox — on enregistre ici avant tout autre module React.
 */
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  const swallowFontTimeout = (raw: unknown) => {
    const text = String(
      typeof raw === 'object' && raw !== null && 'message' in raw
        ? (raw as Error).message
        : raw ?? ''
    ).toLowerCase();
    return text.includes('ms timeout exceeded') || text.includes('timeout exceeded');
  };
  window.addEventListener('unhandledrejection', (event) => {
    if (swallowFontTimeout((event as PromiseRejectionEvent).reason)) {
      event.preventDefault();
    }
  });
  window.addEventListener('error', (event) => {
    if (swallowFontTimeout((event as ErrorEvent).message)) {
      event.preventDefault();
    }
  });
}
