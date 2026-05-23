/**
 * Module Messaging — frontière domaine.
 * Implémentation : `src/routes/messages.routes.ts`, `message.service.ts`, temps réel.
 * Ne pas importer depuis `../payment` ou `../marketplace`.
 */
export const MESSAGING_MODULE = 'messaging' as const;
export const MESSAGING_ROUTES_FILE = 'messages.routes.ts' as const;
