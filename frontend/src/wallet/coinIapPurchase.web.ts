/** Web : pas de Store billing — utiliser Mobile Money / Wave ou un build iOS/Android. */
export function parseCoinIapSkuToPackageIdMap(): Record<string, string> {
  return {};
}

export function coinIapConfiguredForPackage(_packageId: string): boolean {
  return false;
}

export async function purchaseCoinPackageViaIap(_packageId: string): Promise<{ coins_balance: number }> {
  throw new Error('IAP : disponible sur les builds iOS/Android uniquement.');
}
