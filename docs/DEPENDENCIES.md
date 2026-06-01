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
| `@shopify/react-native-skia` | Effets visuels GPU (overlay AR caméra : blur, lumière chaude, écran vert). Choisi vs Tensorflow.js (~6-9 Mo APK) et MediaPipe (config native lourde). Skia ≈ 1.8 Mo APK, fonctionne sur appareils 2 Go RAM (cible Mali / Afrique). |
| `react-native-vision-camera` | Caméra haute performance avec **frame processors** — accès aux pixels en temps réel pour appliquer les effets AR (blur, LUT, chroma key) via worklets. Choisi vs `expo-camera` qui ne supporte PAS les frame processors. Coût : +~6 Mo APK + Expo Go cassé (besoin EAS Build). Limité au composant `IntegratedCameraRecorder` (caméra publication TikTok-like) ; les autres écrans (live, QR scan, profil photo) restent sur `expo-camera` pour limiter la surface de migration. |
| `expo-image` | Cache disque + mémoire, formats modernes (ch.9.3 compression) |
| `expo-image-manipulator` | Rotation / recadrage profil en JS — évite l’éditeur natif Android instable avec `expo-image-picker` |
| `@react-native-community/netinfo` | Qualité connexion / mode dégradé |
| `expo-media-library` | Enregistrer une photo/vidéo reçue dans la galerie (visionneur média façon WhatsApp). Choisi vs téléchargement manuel + partage : seul moyen fiable d'écrire dans la galerie système Android/iOS. |
| `react-native-incall-manager` | Routage audio natif appels WebRTC (HP / écouteur / micro Android-iOS). Choisi vs expo-av seul qui bloque souvent le duplex audio avec `react-native-webrtc`. |
| `react-native-webrtc` | Appels vocaux/vidéo P2P natifs (PeerConnection, RTCView) |
| `expo-sqlite` | Persistance locale (hors-ligne partiel) |
| `expo-secure-store` | Secrets / tokens hors stockage AsyncStorage en clair |
| `react-native-iap` | Conformité Play Store pour biens numériques (coins) |
| `react-native-device-info` | Détection `hasGms()` avant FCM / Play Billing — évite le dialogue système « Google Play » au boot sur appareils sans GMS (Huawei, émulateurs) |
| `socket.io-client` | Temps réel (messages, présence) |
| `@peculiar/webcrypto` / `react-native-quick-crypto` | Crypto côté client (E2EE, flux sensibles) |

Les versions exactes sont dans `frontend/package-lock.json` — mettre à jour **de façon contrôlée** (npm audit en CI sur `frontend/`).

## Backend / PWA

Voir `backend/package.json` et `package.json` (racine) pour la stack API et la PWA Vite. Même règle : **raison d’ajout** dans la PR.

---

*Document aligné sur les standards d’ingénierie (ch.1.1 dépendances documentées).*
