/**
 * Validation explicite Mobile Money / agrégateurs — pas de paiement fictif,
 * sandbox autorisé hors production, erreurs lisibles en production.
 */
export type PaymentEnvValidation = {
  readyForProduction: boolean;
  readyForDevelopment: boolean;
  errors: string[];
  warnings: string[];
  summary: string;
};

function bool(v: string | undefined): boolean {
  return Boolean((v ?? '').trim());
}

export function validateMobileMoneyConfig(): PaymentEnvValidation {
  const isProd = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  const orangeMerchant = bool(process.env.ORANGE_MONEY_MERCHANT_ID || process.env.VITE_ORANGE_MERCHANT_ID);
  const orangeKey = bool(process.env.ORANGE_MONEY_API_KEY || process.env.VITE_ORANGE_API_KEY);
  const orangeMock = String(process.env.ORANGE_MONEY_MOCK || '').toLowerCase() === 'true';
  const orangeEnv = (process.env.ORANGE_MONEY_ENV || '').toLowerCase();
  const wave = bool(process.env.WAVE_API_KEY);
  const mtnSub = bool(process.env.MTN_MOBILE_MONEY_SUBSCRIPTION_KEY || process.env.MTN_MOMO_SUBSCRIPTION_KEY);
  const mtnRtp = bool(process.env.MTN_MOMO_RTP_URL) && bool(process.env.MTN_MOMO_ACCESS_TOKEN);
  const mtnTarget = (process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'sandbox').toLowerCase();

  if (isProd) {
    if (orangeMock) errors.push('ORANGE_MONEY_MOCK=true interdit en production');
    if (!orangeMerchant || !orangeKey) errors.push('Orange Money : merchant + API key requis en production');
    if (orangeEnv && orangeEnv !== 'production') {
      errors.push(`ORANGE_MONEY_ENV=${orangeEnv} — utiliser production pour les appels réels`);
    }
    if (!wave) errors.push('WAVE_API_KEY requis en production');
    if (mtnSub) {
      if (!mtnRtp) errors.push('MTN : abonnement présent mais RTP (URL + token) manquant — pas de stub en prod');
      if (mtnTarget === 'sandbox') errors.push('MTN_MOMO_TARGET_ENVIRONMENT=sandbox interdit en production');
    }
  } else {
    if (!orangeMerchant || !orangeKey) warnings.push('Orange Money incomplet (normal en local)');
    if (!wave) warnings.push('Wave non configuré');
    if (mtnSub && !mtnRtp) warnings.push('MTN : RTP non configuré — stub local hors production uniquement');
    if (orangeMock) warnings.push('ORANGE_MONEY_MOCK=true — réservé au développement');
  }

  const readyForProduction = isProd && errors.length === 0;
  const readyForDevelopment = isProd ? errors.length === 0 : true;

  const summary = [
    isProd ? 'Mode production (strict)' : 'Mode développement (sandbox / mocks autorisés avec avertissements)',
    errors.length ? `Erreurs: ${errors.join(' | ')}` : '',
    warnings.length ? `Avertissements: ${warnings.join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join(' — ');

  return {
    readyForProduction,
    readyForDevelopment,
    errors,
    warnings,
    summary,
  };
}
