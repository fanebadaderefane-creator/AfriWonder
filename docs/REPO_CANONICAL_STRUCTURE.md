# Structure canonique du dépôt

Ce document fige les chemins de référence pour éviter les doublons et les erreurs de contribution.

## Cibles officielles

- Frontend web: `src/`
- Backend API: `backend/src/`
- Mobile: `flutter_app/`
- Entités JSON métier: `entities/` (ASCII uniquement)
- Documentation: `docs/`

## Règles de contribution

1. Ne pas créer de nouveaux dossiers parallèles du type `entités/`, `mobile-*`, `backend-go/` sans RFC validée.
2. Toute nouvelle documentation va dans `docs/` (sauf `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE`).
3. En cas de migration de structure, créer une PR dédiée avec plan de rollback.

## État actuel vérifié (avril 2026)

- `entities/` existe.
- `entités/` n'existe pas dans cette copie.
- `mobile/`, `mobile-afriwonder/`, `mobile_flutter/` n'existent pas dans cette copie.
- Le code mobile présent est `flutter_app/`.

