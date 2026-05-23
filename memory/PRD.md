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

### Session 5 — CallKit iOS + Notifee Android (background incoming calls) ✅
**Packages ajoutés** :
- `@notifee/react-native@9.1.8` (full-screen notifications Android)
- `react-native-callkeep@4.3.16` (CallKit iOS)

**Fichiers créés** :
- `frontend/src/services/incomingCallService.ts` (NEW, 280 lignes)
- `memory/GUIDE_TEST_APK.md` (NEW, instructions test)

**Fichiers modifiés** :
- `frontend/app.json` : permissions Android (USE_FULL_SCREEN_INTENT, FOREGROUND_SERVICE_PHONE_CALL, DISABLE_KEYGUARD, TURN_SCREEN_ON, MANAGE_OWN_CALLS) + iOS UIBackgroundModes += "voip"
- `frontend/app/_layout.tsx` : init CallKit/Notifee au démarrage + wire socket `call:invite`
- `frontend/eas.json` : profile development complet avec env vars

**Fonctionnalités** :
1. ✅ **Notification full-screen Android** : sonnerie + boutons Repondre/Refuser au-dessus écran lock
2. ✅ **CallKit iOS** : popup système natif (même app killed via PushKit + VoIP push)
3. ✅ **Channel haute priorité** Android avec `bypassDnd`, `lightUpScreen`, `loopSound`
4. ✅ **Wire socket `call:invite`** → affiche notif uniquement si app en background (foreground = IncomingCallOverlay existant)
5. ✅ **Routing après accept** : `/messages/call` avec `peerId/peerName/peerAvatar/callType/role=receiver`
6. ✅ **Signaling socket** : émission `call:accept`/`call:decline` au tap utilisateur

## What's NOT yet implemented

### Lot 2 Appels — Restant
- [ ] **VoIP Push iOS** (PushKit) pour réveiller app killed — nécessite cert APNs VoIP + endpoint backend qui envoie push silencieux
- [ ] **FCM data-only Android** pour réveiller app killed — nécessite Firebase config + endpoint backend
- [ ] Tests E2E 2 devices physiques (à faire par utilisateur après EAS Build)
- [ ] Group calls multi-party (>2 personnes)

### Lot 3 — Live Streaming Agora (à venir)
### Lot 4 — Live Cadeaux / Multi-host / Replay

## Configuration Render prod requise (action utilisateur)
- ⚠️ `OPENAI_API_KEY` → Whisper + GPT-5.2
- ⚠️ TURN server (Metered.ca free recommandé) → `TURN_URL`, `TURN_SHARED_SECRET`, `TURN_REALM`
- ⚠️ Optionnel : Firebase Server Key (FCM) si vous voulez wake-up app killed
- ⚠️ Optionnel : APNs VoIP cert (iOS PushKit) si app killed sur iPhone

## Tests requis
- 2 comptes test sur Render prod
- 2 devices Android physiques (1 au Mali idéal pour test Carrier-Grade NAT)
- EAS Build dev-client APK (cf. `GUIDE_TEST_APK.md`)

## Files created in /app/memory
- PRD.md (ce fichier)
- PLAN_LOTS.md (plan général)
- GUIDE_TURN_SERVER.md (config TURN options)
- GUIDE_TEST_APK.md (procédure test sur APK)

## Next Action Items
1. **User** : Save to GitHub → Render redeploy
2. **User** : `OPENAI_API_KEY` + TURN config sur Render
3. **User** : `eas build --platform android --profile development` → APK
4. **User** : Installer APK sur 2 devices + tester (cf. GUIDE_TEST_APK.md)
5. **User** : Report bugs/issues observés
6. **Agent** : Si bugs → fix. Sinon → **Lot 3 (Live Agora TikTok-like)**
