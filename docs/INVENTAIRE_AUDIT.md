# INVENTAIRE AUDIT AFRIWONDER

## Contexte
- **Alignement tracker :** ce fichier reste la matrice fonctionnelle détaillée ; le statut **« contrat dépôt vs extension produit »** par phase est centralisé dans `docs/PHASES_0_24_CONTRACT_TRACKER.md` (mise à jour **2026-04-15**).
- Livrable mobile principal observé dans le repo: `frontend/` (Expo Router), pas `mobile-afriwonder/`.
- Backend partagé observé dans `backend/` (Express + Prisma) avec alias Expo sous `/api/proxy/*`.
- PWA existante observée dans `src/`.
- Dossier `functions/`: logique métier TypeScript parallèle basée sur `@base44/sdk`, à considérer comme héritage / divergence potentielle vis-à-vis du backend Express.
- SDK mini-apps observé dans `sdk/afriwonder-miniapp-sdk/`.

## Sources de vérité lues
- `frontend/package.json`
- `frontend/app.json`
- `frontend/app.config.js`
- `frontend/app/_layout.tsx`
- `frontend/app/(tabs)/_layout.tsx`
- `frontend/app/admin-dashboard.tsx`
- `frontend/app/live/stream.tsx`
- `frontend/app/live/start.tsx`
- `frontend/app/live/replay.tsx`
- `frontend/app/downloads.tsx`
- `frontend/app/settings/index.tsx`
- `frontend/app/(auth)/login.tsx`
- `frontend/app/(auth)/register.tsx`
- `frontend/app/(tabs)/index.tsx`
- `backend/src/app.ts`
- `backend/src/routes/admin.routes.ts`
- `backend/src/routes/mobile.routes.ts`
- `backend/src/routes/live.routes.ts`
- `backend/src/routes/coins.routes.ts`
- `backend/src/routes/withdrawals.routes.ts`
- `backend/src/routes/creators.routes.ts`
- `backend/src/routes/auth.routes.ts`
- `backend/src/services/admin.service.ts`
- `backend/src/services/withdrawal.service.ts`
- `backend/prisma/schema.prisma`
- `src/pages/AdminPage.jsx`
- `docs/EXPO_PWA_MENU_MATRIX.md`
- `docs/CLIENT_DELIVERY_CONTRACT.md`
- `sdk/afriwonder-miniapp-sdk/README.md`
- `functions/liveStreaming.ts`
- `functions/payments.ts`

## Matrice fonctionnelle

| Fonctionnalité | Backend API | PWA | Mobile Expo | Statut | Notes d'audit |
|---|---|---|---|---|---|
| Auth email/mot de passe | Oui | Oui | Oui | Partiel | Login/register OK (password register min 8 + username 2..30 normalisé côté mobile). Biométrie, vrai forgot password, 2FA mobile absents/incomplets. |
| OAuth Google | Oui | Oui | Non (UI mobile) / Partiel (backend) | ⚠️ | Backend: `GET /api/auth/google` + callback redirige vers `.../Landing?token=...` (PWA). Mobile Expo: aucune UI/flow trouvé dans `frontend/app/(auth)/*` (à implémenter via deep link). |
| OAuth Facebook | Oui | Oui | Non (UI mobile) / Partiel (backend) | ⚠️ | Backend: `GET /api/auth/facebook` + callback redirige vers `.../Landing?token=...` (PWA). Mobile Expo: aucune UI/flow trouvé dans `frontend/app/(auth)/*`. |
| Refresh token | Oui | Oui | Oui | OK | `apiClient` et `mobileApiClient` gèrent le refresh. |
| Profil courant `/auth/me` | Oui | Oui | Oui | OK | Utilisé dans les stores/auth mobile. |
| Feed vidéo vertical | Oui | Oui | Oui | Partiel | Feed Expo avancé avec `expo-video`, likes, commentaires, sauvegarde, partage, offline queue. |
| Upload vidéo | Oui | Oui | Oui | Partiel | Création présente, mais audit détaillé à continuer pour trim/background upload complet. |
| Commentaires texte | Oui | Oui | Oui | OK | Modal commentaires fonctionnelle. |
| Commentaires vocaux | API partielle | PWA partielle | Oui | Partiel | UI vocale présente; dépendance backend `audio_url` à confirmer sur tout le flux. |
| Likes / saves / follow | Oui | Oui | Oui | OK | Online + queue offline supportées. |
| Offline queue | Oui | N/A | Oui | Partiel | Supporte `like_video`, `save_video`, `follow_user`, `comment_video` seulement. |
| Téléchargement vidéo | Oui | N/A | Oui | Partiel | `GET /api/mobile/videos/:id/download-url` renvoie actuellement `download_url = video.video_url` (non signé) → à durcir en URL signée quand stockage privé (R2/S3) est activé. |
| Data saver | Oui | Oui | Oui | Partiel | Device settings backend + UI mobile; écran dédié encore incomplet au moment de l'audit. |
| Push token registration | Oui | Oui | Oui | OK | `/api/mobile/push-token` présent. |
| Push logout unregister | Oui | N/A | Oui | OK | `DELETE /api/mobile/push-token/:token` implémenté dans `backend/src/routes/mobile.routes.ts`. |
| Notifications push locales | N/A | N/A | Oui | Partiel | `expo-notifications` initialisé, mais dépend d'un vrai projectId EAS. |
| Deep links mobile | Oui | N/A | Oui | OK | `/api/mobile/resolve-deeplink` + routage Expo. |
| Analytics mobile | Oui | Oui | Oui | OK | `/api/mobile/analytics/event` présent. |
| Device settings mobile | Oui | N/A | Oui | OK | GET/PUT présents, fallback `platform_settings`. |
| Dashboard admin mobile | Oui | Oui | Oui | Partiel | Écran unique `admin-dashboard.tsx`, pas encore la couverture 7/7 attendue. |
| Analytics admin overview | Partiel | Oui | Partiel | Partiel | `/api/admin/dashboard` existe; pas les endpoints dédiés `analytics/overview`, `users`, `revenue`, `content`. |
| Gestion utilisateurs admin | Oui | Oui | Partiel | Partiel | Listing et suspension existent; recherche/filtres avancés/cursor-based manquent. |
| Modération reports admin | Partiel | Oui | Partiel | Partiel | Mobile utilise `/moderation/reports`; alignement backend/admin mobile incomplet. |
| Transactions admin | Partiel | Oui | Partiel | Partiel | Export et finance dashboard existent, mais pas la forme exacte demandée côté mobile. |
| Retraits admin | Oui | Oui | Partiel | Partiel | Routes `/withdrawals/pending` et `/:id/process` existent; alias admin mobile dédiés absents. |
| Lives actifs admin | Partiel | Oui | Partiel | Partiel | `/api/live` + status live existent; pas d'alias `/api/admin/lives/active`. |
| Terminer un live admin | Non dédié | Oui | Partiel | Partiel | Fin live existe via `/api/live/:id/end` mais pensée créateur, pas admin dédiée. |
| Paramètres plateforme admin | Partiel | Oui | Partiel | Partiel | Kill-switch, feature flags et commissions existent, mais pas un endpoint agrégé `/api/admin/settings`. |
| Broadcast notification admin | Non | Oui | Non | MANQUANT | Route dédiée absente. |
| Live viewer | Oui | Oui | Oui | Partiel | Viewer live Expo fonctionnel, dépendant d'Agora/token/config. |
| Live creator start | Oui | Oui | Oui | OK | `frontend/app/live/start.tsx` redirige vers `/live/stream` (écran hôte réel). |
| Replay live | Oui | Oui | Oui | Partiel | Backend supporte **enregistrement automatique** via Agora Cloud Recording: `startLiveRecording()` au start, `stopLiveRecording()` au end → renseigne `replay_url`. Dépend de variables Agora/R2 configurées. |
| Highlights / clips live | Oui | Oui | Oui | Partiel | Présent sous forme de **chapters**: `GET/POST /api/live/:id/chapters`. Pas encore un flux complet “clip → republier dans feed” (republish highlight manquant). |
| Gifts live | Oui | Oui | Oui | Partiel | Catalogue et envoi présents; finition UX/animations/admin à compléter. |
| Coins | Oui | Oui | Oui | OK | Routes `/api/coins/*` présentes, écran Expo dédié présent. |
| Retraits créateurs | Oui | Oui | Oui | Partiel | Demande de retrait fonctionnelle; flow admin et méthodes multiples à durcir. |
| Creator dashboard | Oui | Oui | Oui | Partiel | Présent, mais couverture produit complète à vérifier. |
| Marketplace listing | Oui | Oui | Oui | OK | Surface Expo existante. |
| Cart / checkout | Oui | Oui | Oui | Partiel | Flows présents; couverture réelle des méthodes à vérifier. |
| Orange Money | Oui | Oui | Oui | Partiel | Parcours présents, dépendance webhook/external. |
| Wave | Oui | Oui | Oui | Partiel | Parcours présents, dépendance webhook/external. |
| MTN / Moov money | Partiel | Partiel | Partiel | Partiel | Support métier partiel selon services; surface mobile inégale. |
| Stripe | Oui | Oui | Partiel | Partiel | Backend existe; branchement mobile natif à confirmer. |
| Messagerie privée | Oui | Oui | Oui | Partiel | UI et routes présentes; audit détaillé restant sur lecture offline/typing/read receipts. |
| Search / explore | Oui | Oui | Oui | OK | Surfaces Expo présentes. |
| Stories | Oui | Oui | Oui | Partiel | Écran indique encore un mode aperçu. |
| News | Oui | Oui | Oui | OK | Routes et écrans présents. |
| Communities | Oui | Oui | Oui | OK | Routes et écrans présents. |
| Services / super-app | Oui | Oui | Oui | Partiel | Large couverture Expo existante, mais certains modules gardent du placeholder. |
| Transport carte temps réel | Partiel | Oui | Partiel | BUG | `services/transport.tsx` annonce encore une carte bientôt disponible. |
| Mini-apps | Oui | Oui | Oui | OK | Expo + SDK mini-apps présents. |
| Sous-titres auto (Whisper) | Partiel | Non | Non | MANQUANT | Utilitaire `backend/src/utils/whisperTranscription.ts` existe mais **aucune route** `POST /api/videos/:id/generate-captions` n'est montée côté backend. |
| Matching / assistant | Oui | Oui | Oui | BUG | `assistant.tsx` affiche encore un assistant simulé. |
| Build EAS | Oui | N/A | Oui | Partiel | `frontend/eas.json` présent. Reste à remplacer `EXPO_PUBLIC_EAS_PROJECT_ID` / `updates.url` placeholder par un vrai projet Expo. |
| Monitoring mobile natif | Partiel | Oui | Partiel | MANQUANT | Sentry React Native non observé dans `frontend/package.json`. |

## Résumé des écarts majeurs

### Mobile Expo
- Le vrai client mobile est `frontend/`. Le dossier `mobile-afriwonder/` est un **alias npm** (scripts qui délèguent à `../frontend`), pas une seconde codebase.
- `frontend/app.json` et `frontend/app.config.js` utilisent encore un `projectId` et `updates.url` placeholder.
- Aucun `frontend/eas.json` observé au début de l'audit.
- Le menu/settings contient des routes cassées ou auto-référentes.
- `live/start.tsx` est encore un placeholder alors que `live/stream.tsx` porte déjà un vrai flux live.
- Le dashboard admin Expo est une console mobile simplifiée, pas encore la cible complète.

### Backend partagé
- `/api/mobile/*` existe, mais pas d'alias `/api/proxy/mobile`.
- `/api/mobile/sync` ne traite qu'un sous-ensemble d'actions offline.
- Le backend admin expose beaucoup de capacités, mais pas sous les contrats mobiles exacts demandés (`/analytics/overview`, `/settings`, `/broadcast-notification`, etc.).
- Les retraits existent dans `/api/withdrawals/*`, mais pas encore sous des alias admin mobiles dédiés.

### Parité PWA / Mobile
- La PWA admin dans `src/pages/AdminPage.jsx` reste plus riche et plus historique que `frontend/app/admin-dashboard.tsx`.
- `docs/EXPO_PWA_MENU_MATRIX.md` marque encore l'admin Expo comme hors scope v1, alors que le besoin courant l'exige.

### Risques de dérive métier
- `functions/` réimplémente des pans live/paiement sur `@base44/sdk`; ce n'est pas la même pile que `backend/`.
- Sans clarification documentaire, cela crée un risque de divergence de contrat et de faux alignement.

## Priorités de correction
1. Stabiliser la base Expo: config, EAS, routes cassées, admin tab conditionnelle, écrans settings manquants.
2. Remplacer les faux flux visibles: `live/start`, boutons settings cassés, actions replay non branchées, auth sociale mobile non fonctionnelle.
3. Ajouter les endpoints backend/admin manquants réellement utilisés par le mobile.
4. Consolider offline, téléchargements, sécurité/biométrie et notifications.
5. Vérifier puis documenter honnêtement tout ce qui reste dépendant de secrets externes.
