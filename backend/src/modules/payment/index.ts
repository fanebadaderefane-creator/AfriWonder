/**
 * Module Payment — frontière domaine.
 * Implémentation : `src/routes/payments.routes.ts`, `payment.service.ts`, `payment-env.validation.ts`.
 * Ne pas importer depuis `../messaging`.
 */
export const PAYMENT_MODULE = 'payment' as const;
export const PAYMENT_ROUTES_FILE = 'payments.routes.ts' as const;
