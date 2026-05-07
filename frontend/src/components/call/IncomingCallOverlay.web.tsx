import React from 'react';

/**
 * Web : l’overlay natif utilise Reanimated + RNGH worklets (non pris en charge comme sur iOS/Android
 * dans ce bundle). Évite le crash au boot : `createSerializableObject should never be called in JSWorklets`.
 * Les appels navigateur passent par `/messages/call` sans cet overlay plein écran.
 */
export function IncomingCallOverlay() {
  return null;
}
