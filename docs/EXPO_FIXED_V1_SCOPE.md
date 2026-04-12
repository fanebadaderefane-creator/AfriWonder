# Périmètre « figé v1 » — application mobile Expo (AfriWonder)

Document de **cadrage livraison** : ce qui est considéré **contractuel** pour une version mobile figée v1, et ce qui est **hors périmètre** (explicite).

## Routes et zones contractuelles (v1)

Ces parcours doivent être **stables**, **sans données factices silencieuses**, avec **erreurs utilisateur** en cas d’échec API.

### Navigation principale (onglets)

| Route | Description |
|-------|-------------|
| `/(tabs)/index` | Feed vidéo Accueil |
| `/(tabs)/explore` | Découverte (grille issue de l’API ou état vide / erreur) |
| `/(tabs)/create` | Création de contenu |
| `/(tabs)/market` | Marketplace |
| `/(tabs)/profile` | Profil (badges alignés API gamification quand connecté) |

### Menu « toutes les fonctions » (`/menu-plus`)

Toutes les entrées listées dans [frontend/app/menu-plus.tsx](../frontend/app/menu-plus.tsx) : wallet, services (dont assurances), feed, créateur, cours, gamification (badges, classement, hub), assistant, paramètres, légal, etc.

### Écrans associés « figés v1 » (données réelles ou message d’erreur)

- **Assurances** : `/services/insurance` — API `/api/insurance/*`
- **Gamification** : `/badges-profile`, `/leaderboard`, `/gamification-hub`, `/challenges` — API `/api/gamification/*`, `/api/leaderboard`
- **Crowdfunding liste** : `/crowdfunding` — API `/crowdfunding` (pas de maintien silencieux de jeux de données seed en cas d’erreur)
- **Wallet, news, courses, notifications, settings**, etc. — selon implémentation existante dans `frontend/app/`

## Hors périmètre v1 (non garanti « figé »)

| Zone | Raison |
|------|--------|
| **Live studio** (`/live/stream`, replay, etc.) | Placeholders caméra / lecteur ; flux broadcast complet = chantier séparé |
| **Parité pixel-perfect** avec chaque page PWA | Objectif v1 = **même backend** et **UX mobile cohérente**, pas recopie exhaustive de tous les dialogs web |
| **Console admin mobile** | `/admin-dashboard` — redirection navigateur ; administration complète = PWA / back-office |
| **Protection des données** | `/data-protection` — texte d’information + lien politique ; contenu juridique détaillé peut suivre la PWA |

## Preuve de livraison (v1)

- `npm run verify:delivery` — enchaîne audit dépôt, tests Vitest **PWA** (`src/`), puis **`verify:delivery:expo`** (lint + `tsc` + Vitest dans `frontend/`).
- `npm run verify:delivery:expo` — uniquement la chaîne Expo (utile en itération).

La branche de release doit faire passer **`verify:delivery`** en entier.

## Révision

Adapter ce document quand de nouvelles routes deviennent contractuelles ou quand un module sort du hors-périmètre.
