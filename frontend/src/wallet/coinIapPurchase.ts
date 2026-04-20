/**
 * Point d’entrée pour `tsc` : `coinIapPurchase.native.ts` / `coinIapPurchase.web.ts`
 * sont résolus par Metro selon la plateforme. Ce fichier évite TS2307 sur l’import sans suffixe.
 */
export * from './coinIapPurchase.web';
