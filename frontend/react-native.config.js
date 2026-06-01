/**
 * CallKit (react-native-callkeep) = iOS uniquement.
 * Sur Android + New Architecture, le module natif RNCallKeep fait crasher l'app au lancement
 * (TurboModule @ReactMethod dupliqués). Android utilise Notifee pour les appels entrants.
 */
module.exports = {
  dependencies: {
    'react-native-callkeep': {
      platforms: {
        android: null,
      },
    },
  },
};
