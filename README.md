# AfriWonder

Repo monorepo AfriWonder (web + mobile + backend).

## Références officielles pour audit

- **Standards d’ingénierie (durabilité)** : `docs/ENGINEERING_STANDARDS.md` — entrée sémantique : `docs/DURABILITY_STANDARDS.md`
- Règles courtes (agents + humains) : `AGENTS.md`
- Architecture: `docs/ARCHITECTURE.md`
- API source de vérité: `GET /api-docs` et `GET /api/openapi.json`
- Index API rapide: `docs/API.md`
- Pré-lancement mobile: `docs/MOBILE_RELEASE_README.md`

## Cibles de livraison actuelles

- Mobile iOS/Android: `frontend/` (Expo React Native)
- Backend API: `backend/` (Node.js/Express/Prisma)
- Web/PWA: `src/`

## Note importante

Ne pas conclure "endpoint absent" à partir d'un seul fichier markdown: toujours valider sur OpenAPI (`/api/openapi.json`) ou directement dans `backend/src/app.ts`.
