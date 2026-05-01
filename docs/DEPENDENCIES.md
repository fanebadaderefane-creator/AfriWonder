# Dépendances — traçabilité (manuel durabilité ch.1.1)

Toute **nouvelle** librairie npm doit avoir une **justification** dans la PR (alternative écartée). Ce fichier résume les dépendances **clés** déjà présentes.

## Application mobile Expo (`frontend/`)

| Dépendance | Rôle (pourquoi) |
|------------|-----------------|
| `expo` + `expo-router` | Runtime Expo, navigation fichier, deep links |
| `@tanstack/react-query` | État serveur, cache, retry — évite logique réseau dans les écrans |
| `axios` | Client HTTP vers `apiClient` / proxy |
| `zustand` | État global minimal (auth, préférences) |
| `@sentry/react-native` | Observabilité erreurs (ch.5) — DSN via `EXPO_PUBLIC_SENTRY_DSN` |
| `@shopify/flash-list` | Listes virtualisées — scroll 60 FPS / basse conso mémoire (ch.6) |
| `expo-image` | Cache disque + mémoire, formats modernes (ch.9.3 compression) |
| `expo-image-manipulator` | Rotation / recadrage profil en JS — évite l’éditeur natif Android instable avec `expo-image-picker` |
| `@react-native-community/netinfo` | Qualité connexion / mode dégradé |
| `expo-sqlite` | Persistance locale (hors-ligne partiel) |
| `expo-secure-store` | Secrets / tokens hors stockage AsyncStorage en clair |
| `react-native-iap` | Conformité Play Store pour biens numériques (coins) |
| `socket.io-client` | Temps réel (messages, présence) |
| `@peculiar/webcrypto` / `react-native-quick-crypto` | Crypto côté client (E2EE, flux sensibles) |

Les versions exactes sont dans `frontend/package-lock.json` — mettre à jour **de façon contrôlée** (npm audit en CI sur `frontend/`).

## Backend / PWA

Voir `backend/package.json` et `package.json` (racine) pour la stack API et la PWA Vite. Même règle : **raison d’ajout** dans la PR.

---

*Document aligné sur les standards d’ingénierie (ch.1.1 dépendances documentées).*
