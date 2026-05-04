/**
 * Module Auth — frontière domaine.
 * Implémentation : `src/routes/auth.routes.ts` + services associés.
 * Ne pas importer depuis `../messaging` ou `../payment` (dépendances croisées interdites).
 */
export const AUTH_MODULE = 'auth' as const;
export const AUTH_ROUTES_FILE = 'auth.routes.ts' as const;
