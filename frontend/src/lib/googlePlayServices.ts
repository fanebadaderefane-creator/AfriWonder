/** iOS / fallback : pas de Google Play Services. */
export async function isGoogleMobileServicesReady(): Promise<boolean> {
  return true;
}

/** Tests unitaires uniquement. */
export function resetGoogleMobileServicesCacheForTests(): void {
  /* no-op */
}
