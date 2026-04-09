# Documentation API AfriWonder

La source de vérité est l'OpenAPI générée côté backend et exposée par Swagger UI:

- `GET /api-docs` (interface Swagger)
- `GET /api/openapi.json` (spécification OpenAPI JSON)

## Authentification

Les requêtes protégées utilisent `Authorization: Bearer <token>`.
Certaines routes navigateur utilisent aussi les cookies httpOnly (`access_token`, `refresh_token`) avec protection CSRF.

## Endpoints (exemples)

- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh`
- Vidéos: `GET /api/videos`, `POST /api/videos`, `POST /api/videos/:id/like`
- Marketplace: `GET /api/products`, `POST /api/orders`, `PUT /api/orders/:id/status`
- Paiements: `POST /api/payments/orange-money`, `GET /api/payments/:id/status`
- Appels: `POST /api/calls/initiate`, `GET /api/calls/turn-credentials`
- RGPD — export données (JSON immédiat): `GET /api/me/export` ou `GET /api/users/me/export`
- RGPD — suppression compte (demande + délai, annulation possible): `DELETE /api/users/me` (body optionnel `{ "reason": "..." }`), ou `POST /api/privacy/delete-account`

## Codes de réponse

- `200` succès
- `201` ressource créée
- `400` requête invalide
- `401` authentification requise
- `403` accès interdit
- `404` ressource introuvable
- `429` limite de requêtes atteinte
- `500` erreur interne

## Variables d'environnement

Référence: `backend/.env.example` et `docs/ENV_REFERENCE.md`.

