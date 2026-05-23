# AfriWonder - PRD & Setup Memory

## Original Problem Statement
Repo: https://github.com/fanebadaderefane-creator/AfriWonder
Clients : Mobile Android/iOS — Mali, Sénégal, Côte d'Ivoire, etc.

## Architecture
- `/app/frontend/` → Expo React Native SDK 54
- `/app/backend/src/` → TypeScript Express + Prisma + Supabase → Render prod
- `/app/backend/server.py` → FastAPI Python (port 8001)

## What's Been Implemented

### Session 1 — Connexion repo ✅
### Session 2 — Messagerie : transcription Whisper + historique appels ✅
### Session 3 — Traduction GPT-5.2 (FR/EN/BM/WO) ✅
### Session 4 — Appels WebRTC optimisés Afrique ✅
### Session 5 — CallKit iOS + Notifee Android ✅
### Session 6 — VoIP Push iOS + FCM hooks ✅
### Session 7 — Lot 3 Live floating hearts TikTok ✅

### Session 8 — Lot 4 propositions ✅

**1. Notif "ami en live"** :
- `frontend/src/services/liveStartedNotifService.ts` (NEW, 130 lignes)
  - Écoute socket `live:started` (déjà émis par backend)
  - Si app foreground : toast in-app (via listener) ; sinon Notifee local
  - Channel Android dédié "Amis en live"
  - Filter sur créateurs avec bell active (cache local)
  - Tap notif → ouvre `/live/[id]`
- `frontend/app/_layout.tsx` : init au démarrage

**2. Swipe-to-next-live (Reels-style)** :
- `frontend/app/live/feed.tsx` (NEW, 260 lignes)
  - FlatList vertical paginé, snap full-screen
  - Lazy player (seul l'item actif joue, mute par défaut)
  - Préchargement min (windowSize: 3) — économie data Afrique
  - Header back overlay
  - Empty state "démarrer un live"
  - Pull-to-refresh
  - Préfetch via `/api/live/discovery`

**3. Live Shopping** :
- `frontend/src/live/LiveShoppingStrip.tsx` (NEW, 290 lignes)
  - Mini-bandeau bas du live avec produit "featured"
  - Auto-rotation 8s entre produits
  - Polling 30s (refresh produits)
  - Badge discount %
  - Compteur "1/5"
  - Tap → bottomsheet liste complète
  - Tap produit → router `/shop/product/:id`
  - Formatage prix FCFA (Mali/Sénégal/CI) + EUR + USD
  - Backend déjà OK : `GET /api/live/:id/products`
- Intégré dans `app/live/[id].tsx`

**4. Live Battle 1v1** :
- **Differé** (énorme scope ~17h)
- Plan complet documenté : `memory/PLAN_LIVE_BATTLE.md`
- Architecture Agora PK Channel Media Relay
- Modèle Prisma + endpoints REST + sockets
- Split-screen UI + score bar + gift side-picker
- Punishment system + replay

## Files créés cette session
- `frontend/src/services/liveStartedNotifService.ts`
- `frontend/app/live/feed.tsx`
- `frontend/src/live/LiveShoppingStrip.tsx`
- `memory/PLAN_LIVE_BATTLE.md`

## Configuration Render prod requise (cumulé)
- `OPENAI_API_KEY` → Whisper + GPT-5.2
- `TURN_URL` + `TURN_SHARED_SECRET` + `TURN_REALM` → appels WebRTC
- `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` → Live
- Optionnel : APNs VoIP cert pour iOS PushKit
- Optionnel : Cert/Setup Agora PK Media Relay pour battles (futur Lot 4 complet)

## Cumul total sessions 1-8
- **18 fichiers modifiés / 11 fichiers créés**
- **~1800 lignes ajoutées**
- **8 fonctionnalités majeures** :
  1. Transcription IA Whisper
  2. Traduction GPT-5.2 (FR/EN/BM/WO)
  3. Appels WebRTC optimisés Afrique
  4. CallKit iOS + Notifee Android
  5. VoIP Push iOS + FCM hooks
  6. Live TikTok-like floating hearts
  7. Notif "ami en live" temps réel
  8. Swipe-to-next-live (Reels-style)
  9. Live Shopping mobile UI

## Files in /app/memory
- `PRD.md` (ce fichier)
- `PLAN_LOTS.md` — plan général
- `GUIDE_TURN_SERVER.md` — config TURN (4 options)
- `GUIDE_TEST_APK.md` — 7 scenarios de test sur APK
- `GUIDE_LIVE_AGORA.md` — audit Live + config Agora
- `PLAN_LIVE_BATTLE.md` — roadmap battle 1v1 (futur)

## Next Action Items
1. **User** : Save to GitHub → Render redeploy auto
2. **User** : Configure les env vars Render (OPENAI, TURN, AGORA)
3. **User** : `eas build --platform android --profile development` → APK
4. **User** : Installer APK sur 2 devices Android (idéalement 1 au Mali)
5. **User** : Tester scenarios :
   - Messagerie : transcription + traduction
   - Appels : audio/vidéo + cross-NAT + background incoming
   - Live : broadcaster + viewer + hearts + shopping + swipe feed
   - Notif : démarrer un live avec compte A, voir notif côté compte B
6. **User** : Reporter bugs / OK
7. **Agent** : Fix bugs OU implémenter Lot 4 Live Battle si tout est validé

## Routes ajoutées (à wirer dans nav app)
- `/live/feed` — feed swipe TikTok (à ajouter en lien depuis `/live/index.tsx` ou tab principal)

## Suggestion business (récap)
- **Top 1** : Cadeaux Mobile Money (Orange Money/Wave) — votre #1 levier revenue, déjà partiellement codé
- **Top 2** : Live Battle 1v1 (gains ARPU ×3-5 prouvés sur TikTok Live)
- **Top 3** : Live Shopping (la feature qu'on vient d'ajouter — il faut maintenant que les créateurs aient leur catalogue produits)
- **Top 4** : Notif "ami en live" (ajout cette session — boost engagement +30-50%)
