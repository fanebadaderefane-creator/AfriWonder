/**
 * Doit être importé une fois au démarrage (avant WebCrypto / clés E2EE).
 * Requis pour `crypto.getRandomValues` sur certaines builds React Native.
 */
import 'react-native-get-random-values';
