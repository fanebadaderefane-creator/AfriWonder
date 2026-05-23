# AfriWonder - PRD & Setup Memory

## Original Problem Statement
Repo: https://github.com/fanebadaderefane-creator/AfriWonder
Clients : Mobile Android/iOS — Mali, Sénégal, Côte d'Ivoire, etc.

## Architecture
- `/app/frontend/` → Expo React Native SDK 54 (mobile)
- `/app/backend/src/` → TypeScript Express + Prisma + Supabase → Render prod
- `/app/backend/server.py` → FastAPI Python (port 8001)

## What's Been Implemented

### Session 1 — Connexion repo ✅
### Session 2 — Messagerie : transcription Whisper + historique appels ✅
### Session 3 — Traduction GPT-5.2 multi-langue (FR/EN/BM/WO) ✅
### Session 4 — Appels WebRTC optimisés Afrique ✅
### Session 5 — CallKit iOS + Notifee Android (background incoming) ✅
### Session 6 — VoIP Push iOS + FCM data-only Android ✅
- `frontend/src/services/voipPushService.ts` (NEW) — PushKit iOS
- `frontend/app/_layout.tsx` : init service + intercept push `incoming_call` → displayIncomingCall
- `backend/src/routes/calls.routes.ts` : endpoint `POST /api/calls/voip-token` (stocke en `PushSubscription`)
- `react-native-voip-push-notification@3.3.3` ajouté

### Session 7 — Lot 3 Live TikTok-like ✅
**Floating Hearts ❤️** :
- `frontend/src/live/FloatingHeartsBurst.tsx` (NEW, 130 lignes) — composant cœurs flottants
- `frontend/app/live/[id].tsx` : zone tap invisible + bursts locaux + envoi backend batché (1.2s) + socket relay
- `frontend/app/live/stream.tsx` : host voit les cœurs de son audience
- `backend/src/index.ts` : socket relay event `live:hearts` avec rate-limit 30/min/socket

**Guide créé** : `memory/GUIDE_LIVE_AGORA.md` (audit complet 22 fonctionnalités, config Render, tests, coûts Agora)

## What's NOT yet implemented

### Lot 3 Live — Restant (TikTok-like)
- [ ] Swipe up/down navigation entre lives (Reels-style)
- [ ] Stickers AR / Lenses (nécessite Banuba/ARKit)
- [ ] Live battle 1v1
- [ ] Tests E2E sur APK (user action)

### Lot 4 (futur) — Live shopping, multi-host battle, replay analytics avancé

## Configuration Render prod requise
- ⚠️ `OPENAI_API_KEY` → Whisper + GPT-5.2
- ⚠️ TURN server (Metered.ca free recommandé) → cf. GUIDE_TURN_SERVER.md
- ⚠️ `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` → Live (cf. GUIDE_LIVE_AGORA.md)
- ⚠️ Optionnel : APNs VoIP cert pour iOS PushKit (à configurer dans Render env si app killed sur iPhone)

## Tests à faire (action utilisateur)
1. Save to GitHub → Render redeploy
2. Configure les env vars ci-dessus
3. `eas build --platform android --profile development`
4. Tester sur 2 devices physiques :
   - Messagerie (transcription + traduction)
   - Appels audio/vidéo (cross-NAT)
   - Background incoming call (Notifee)
   - Live broadcast + viewer
   - Floating hearts TikTok ❤️
   - Co-host + raise-hand
   - Cadeaux

## Files in /app/memory
- PRD.md (ce fichier)
- PLAN_LOTS.md (plan général)
- GUIDE_TURN_SERVER.md (config TURN options)
- GUIDE_TEST_APK.md (procédure test sur APK)
- GUIDE_LIVE_AGORA.md (audit Live + config Agora + tests)

## Cumul total sessions 1-7
- 9 fichiers modifiés / 6 fichiers créés
- ~1100 lignes ajoutées
- 5 fonctionnalités IA/réseau/UX majeures :
  1. Transcription IA (Whisper)
  2. Traduction multi-langue (GPT-5.2, FR/EN/BM/WO)
  3. Appels WebRTC optimisés Afrique (STUN multi, profil adaptatif, NetInfo)
  4. CallKit iOS + Notifee Android (background incoming)
  5. VoIP Push iOS + FCM hooks (app killed wake-up)
  6. Live TikTok-like floating hearts (tap + socket relay)

## Next Action Items
1. User : Save to GitHub → configure env vars Render → EAS Build APK
2. User : Tester 6 scenarios Live + 7 scenarios Messages/Calls
3. Si tout OK → on peut faire Lot 4 (swipe-to-next-live, live shopping, live battles)
4. Si bugs → fix par session

## Suggestions business
- **Top 1** : Activer les cadeaux Mobile Money (Orange Money/Wave) — déjà partial, finir le wiring = revenu direct
- **Top 2** : Push notif "Tel ami est en live maintenant" — boost massif des views (TikTok le fait)
- **Top 3** : Live battle 1v1 entre 2 streamers (audience vote avec cadeaux) — viralité explosive
