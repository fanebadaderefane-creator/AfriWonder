import { router } from 'expo-router';

type RouterStore = {
  store: {
    navigationRef?: {
      isReady: () => boolean;
      current?: { canGoBack?: () => boolean };
    };
  };
};

/**
 * Sur le web, `router.canGoBack()` lève une erreur (Expo Router : IS_DOM, voir `routing.js`).
 * La ref React Navigation reste la source fiable pour savoir si un POP est possible.
 */
function canNavigateBack(): boolean {
  try {
    // Accès interne expo-router pour canGoBack sur le web (voir routing.js).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { store } = require('expo-router/build/global-state/router-store') as RouterStore;
    const ref = store?.navigationRef;
    if (!ref?.isReady?.()) return false;
    return Boolean(ref.current?.canGoBack?.());
  } catch {
    return false;
  }
}

/**
 * Évite l’avertissement dev « GO_BACK was not handled » quand la pile est vide
 * (ex. ouverture directe d’URL web, deep link sans historique).
 */
export function goBackOrFallback(fallback: string = '/(tabs)') {
  if (canNavigateBack()) {
    router.back();
  } else {
    router.replace(fallback as Parameters<typeof router.replace>[0]);
  }
}
