# Inventaire Fonctionnel (preuve d'exécution)

Convention:

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done + tested

## Core

- `[~]` Auth JWT + refresh + logout + révocation access/refresh (middleware + blacklist Redis si `REDIS_URL` ; tests IP blacklist `blacklist.service.test.ts`)
- `[x]` RGPD export JSON: `GET /api/me/export`, `GET /api/users/me/export` (tests: `backend/src/__tests__/users.me.gdpr.test.ts`)
- `[x]` RGPD suppression: `DELETE /api/users/me` + flux `POST /api/privacy/delete-account`
- `[~]` Feed vidéo (garde-fou layout Firefox : `tests/e2e/feed-layout-firefox.spec.ts`, `data-afw-feed-column`)
- `[~]` Messaging + appels WebRTC
- `[~]` Marketplace (produits/commandes ; liste services authentifiée : `backend/__tests__/services.test.ts`)

## Paiements

- `[~]` Orange Money (test webhook signé CI : `backend/src/payments/__tests__/orange-money.webhook.test.ts`)
- `[~]` Stripe (webhook signé : `backend/src/payments/__tests__/stripe.webhook.test.ts` + CI ; CSP nginx Stripe ; checkout `/api/payments/stripe/checkout` à durcir avec tests auth métier)

## Super-app

- `[~]` Transport
- `[~]` Food delivery
- `[~]` Microcrédit
- `[~]` Billetterie
- `[~]` Immobilier
- `[~]` Assurance

## Modules sensibles

- `[~]` Télémédecine (désactivé en prod par défaut tant que validation juridique non actée)

## Infra & audit (preuves dans le dépôt)

- `[x]` En-têtes nginx (`nginx.conf`) : durcissement + CSP fonts + **Stripe** (`script-src` / `frame-src`)
- `[x]` API sans rebuild : `public/config.json` + `src/lib/apiBaseUrl.js` / bootstrap `main.jsx`
- `[x]` Orchestration : `Makefile` (`test-backend-coverage`, `test-e2e-ci`, `verify-root-docs`, `audit-quick`)

## Méthode de mise à jour

1. Une feature ne passe en `[x]` que si un test automatisé existe et passe en CI.
2. Ajouter un lien vers test/evidence dans la PR.
3. Revue manuelle obligatoire avant release.
