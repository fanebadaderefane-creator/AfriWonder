/**
 * Politique UX : écran noir global (_layout) uniquement si le probe LAN est nécessaire
 * (Android + __DEV__ + pas d’URL stable : vide ou origine « locale » type LAN / localhost).
 */
export function shouldHoldUiForAndroidDevBackendProbe(inputs: {
  platformOs: string;
  isDev: boolean;
  needsLanBackendProbe: boolean;
}): boolean {
  if (inputs.platformOs !== 'android' || !inputs.isDev) return false;
  return inputs.needsLanBackendProbe;
}
