/** Désabonnement sûr — évite `undefined is not a function` au cleanup des effets React. */
export function removeNativeSubscription(
  sub: { remove?: () => void } | (() => void) | null | undefined,
): void {
  if (!sub) return;
  if (typeof sub === 'function') {
    sub();
    return;
  }
  if (typeof sub.remove === 'function') {
    sub.remove();
  }
}
