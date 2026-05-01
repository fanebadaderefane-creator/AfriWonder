# AfriWonder Mobile Release README

Ce document est la référence de pré-lancement mobile Android/iOS.

## Cible de production

- Mobile canonique: `frontend/` (Expo React Native)
- Backend canonique: `backend/` (Node.js/Express/Prisma)
- API source de vérité: `GET /api/openapi.json` et `GET /api-docs`

## Fonctions mobiles critiques et endpoints

- Feed: `GET /api/feed`, `GET /api/videos`, `POST /api/videos/:id/like`
- Discover: `GET /api/search`, `GET /api/search/suggest`, `GET /api/recommendations`
- Inbox: `GET /api/messages/conversations`, `GET /api/messages/:conversationId`, `POST /api/messages/send`
- Profil: `GET /api/users/:id`, `PUT /api/users/me`
- Live: `POST /api/live/start`, `GET /api/live/:id/token`, `POST /api/live/:id/gift`
- Paiements: `POST /api/payments/orange-money`, `POST /api/payments/stripe`, `POST /api/payments/wave`

## Alias mobile Expo

Le client mobile utilise `.../api/proxy` comme baseURL:

- `POST /api/proxy/auth/login`
- `GET /api/proxy/search`
- `GET /api/proxy/messages/conversations`
- `GET /api/proxy/users/:id`
- `POST /api/proxy/live/start`

## Vérifications pré-lancement obligatoires

1. Backend env:
   - `node backend/scripts/check-prod-env.js`
2. API santé:
   - `GET /health`
   - `GET /api/mobile/health`
3. Auth:
   - `POST /api/auth/login` retourne 200/401 (pas 500)
4. Messagerie temps réel:
   - socket URL release configurée (`EXPO_PUBLIC_SOCKET_URL` ou `EXPO_PUBLIC_BACKEND_URL`)
5. Permissions mobile:
   - caméra, micro, galerie, localisation présentes dans `frontend/app.json`

## Notes publication stores

- Achats numériques (abonnements, gifts, crédits) doivent respecter StoreKit / Google Play Billing.
- Les paiements tiers doivent rester pour biens/services éligibles selon les règles stores.
