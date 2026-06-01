import { Platform } from 'react-native';
import type { Purchase, PurchaseError } from 'react-native-iap';
import apiClient from '../api/client';
import { isGoogleMobileServicesReady } from '../lib/googlePlayServices';

/**
 * IMPORTANT:
 * - `react-native-iap` n'existe pas dans Expo Go (native module absent) → import statique = crash au boot.
 * - On le charge dynamiquement uniquement au moment d'un achat, et on renvoie une erreur claire sinon.
 */
async function loadIapModule(): Promise<any> {
  try {
    return await import('react-native-iap');
  } catch {
    throw new Error(
      "Achat in-app indisponible sur Expo Go. Utilisez un development build (EAS) / APK rebuildée pour activer l'IAP."
    );
  }
}

/** JSON : { "sku_store": "uuid_du_CoinPackage" } — même clés iOS/Android si SKU alignés. */
export function parseCoinIapSkuToPackageIdMap(): Record<string, string> {
  const raw = process.env.EXPO_PUBLIC_COIN_IAP_SKU_MAP?.trim();
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [sku, pid] of Object.entries(o)) {
      const s = String(sku || '').trim();
      const p = String(pid || '').trim();
      if (s && p) out[s] = p;
    }
    return out;
  } catch {
    return {};
  }
}

function skuForPackageId(packageId: string): string | null {
  const map = parseCoinIapSkuToPackageIdMap();
  for (const [sku, pid] of Object.entries(map)) {
    if (pid === packageId) return sku;
  }
  return null;
}

export function coinIapConfiguredForPackage(packageId: string): boolean {
  return !!skuForPackageId(packageId);
}

/**
 * Achat consumable → POST /coins/iap/credit (idempotence transaction_id).
 * Pré-requis : produits créés dans App Store Connect / Play Console + EXPO_PUBLIC_COIN_IAP_SKU_MAP.
 */
export async function purchaseCoinPackageViaIap(packageId: string): Promise<{ coins_balance: number }> {
  const sku = skuForPackageId(packageId);
  if (!sku) {
    throw new Error(
      'SKU Store non mappé pour ce pack. Ajoutez EXPO_PUBLIC_COIN_IAP_SKU_MAP (JSON : { "com.votre.sku": "uuid-pack" }).',
    );
  }

  if (Platform.OS === 'android' && !(await isGoogleMobileServicesReady())) {
    throw new Error(
      'Google Play Services est requis pour acheter des coins. Mettez à jour le Play Store sur votre appareil.',
    );
  }

  const IAP = await loadIapModule();
  await IAP.initConnection();

  const products = await IAP.fetchProducts({ skus: [sku], type: 'in-app' });
  const list = Array.isArray(products) ? products : [];
  const found = list.some((p: { id?: string; productId?: string }) => p.id === sku || p.productId === sku);
  if (!found) {
    await IAP.endConnection().catch(() => {});
    throw new Error(
      'Produit introuvable sur le store (sandbox / production). Vérifiez le SKU et la signature de l’app.',
    );
  }

  return await new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Délai d’achat dépassé.'));
    }, 120_000);

    const cleanup = () => {
      clearTimeout(timeout);
      sub?.remove();
      errSub?.remove();
      void IAP.endConnection().catch(() => {});
    };

    const finishOk = (bal: number) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ coins_balance: bal });
    };

    const finishErr = (e: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(e instanceof Error ? e : new Error(String(e)));
    };

    const sub = IAP.purchaseUpdatedListener(async (purchase: Purchase) => {
      const prodId = String((purchase as { productId?: string }).productId || '');
      if (prodId !== sku) return;
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const p = purchase as { transactionId?: string; id?: string; purchaseToken?: string | null };
      const transaction_id = String(p.transactionId || p.id || p.purchaseToken || '').trim();
      if (!transaction_id) {
        finishErr(new Error('transaction_id manquant sur le reçu.'));
        return;
      }
      try {
        const res = await apiClient.post('/coins/iap/credit', {
          transaction_id,
          platform,
          package_id: packageId,
        });
        const d = res.data?.data ?? res.data;
        await IAP.finishTransaction({ purchase, isConsumable: true });
        finishOk(Math.round(Number(d?.coins_balance ?? d?.coinsBalance ?? 0)) || 0);
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string; message?: string } } };
        finishErr(new Error(String(err.response?.data?.error || err.response?.data?.message || 'Crédit IAP échoué')));
      }
    });

    const errSub = IAP.purchaseErrorListener((e: PurchaseError) => {
      finishErr(new Error(String(e?.message || 'Achat annulé ou erreur store')));
    });

    void IAP.requestPurchase({
      type: 'in-app',
      request:
        Platform.OS === 'ios'
          ? { apple: { sku, andDangerouslyFinishTransactionAutomatically: false } }
          : { google: { skus: [sku] } },
    }).catch((e: unknown) => finishErr(e instanceof Error ? e : new Error(String(e))));
  });
}
