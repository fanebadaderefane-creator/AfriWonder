/**
 * Logs réservés au développement — silence en build production (Play Store / TestFlight).
 */
export function devLog(...args: unknown[]): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(...args);
  }
}
