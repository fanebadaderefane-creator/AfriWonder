# AfriWonder - PRD & Setup Memory

## Original Problem Statement
Repo: https://github.com/fanebadaderefane-creator/AfriWonder

Demande utilisateur :
1. Connexion à son repo GitHub (frontend Expo + backend) — ✅ FAIT
2. Compléter et tester pour la production : **Messagerie (Inbox)**, **Appels vidéo/vocaux**, **Live (TikTok-like)**

**Clients cibles : Mobile (Android, iOS) uniquement — pas web.**

## Architecture réelle (découverte)
- `/app/frontend/` → Expo React Native SDK 54 (mobile uniquement)
- `/app/backend/` → 2 backends coexistent :
  - `backend/src/` → TypeScript Express + Prisma + Supabase → déployé sur **Render prod** (`afriwonder.onrender.com`)
  - `backend/server.py` → FastAPI Python (complément mobile : messaging local, wallet, lives) → port 8001 supervisor
- `/app/src/` → PWA Vite (non utilisé pour mobile clients)

## What's Been Implemented (Sessions cumulées)

### Session 1 (2026-05-23) — Connexion repo
- Repo cloné dans `/app`, `.git` et `.emergent` préservés
- Frontend `.env` : `EXPO_PUBLIC_BACKEND_URL=https://afriwonder.onrender.com`
- Backend Python `.env` + dépendances installées
- Supervisor : backend uvicorn :8001, frontend `yarn start` → `expo start --web --tunnel --port 3000`
- Tunnel ngrok actif pour Expo Go (URL change à chaque restart Metro)
- Backend Python `/api/health` → 200 OK
- Frontend Metro bundling OK (2599 modules)

### Session 2 (2026-05-23) — Lot 1 Messagerie (partiel)
**Fichiers modifiés** : 
- `frontend/app/messages/[id].tsx` (+120 lignes)
- `frontend/app/messages/index.tsx` (+205 lignes)

**Fonctionnalités ajoutées** :
1. ✅ **Transcription IA des notes vocales (Whisper)**
   - Long-press sur message vocal → "Transcrire (IA)" dans context menu
   - Appel `POST /messages/message/:id/transcribe` (backend existant)
   - Affichage texte transcrit sous bulle vocale (icône ✨ orange)
   - Indicateur loading "Transcription en cours..."
   - Bouton "Voir la transcription" si déjà transcrit
2. ✅ **Onglet Appels — Historique réel**
   - `GET /me/call-history` (DM + groupes)
   - Liste avec avatar, nom, flèche in/out, badge missed rouge
   - Format temps : "il y a Xh · 14:32 · 2min 15s"
   - Tap row ou bouton callback pour rappeler (audio/vidéo)
   - Refresh control
3. ✅ **FAB Appels** → ouvre picker contact pour nouveau call (au lieu d'alert)

## What's NOT yet implemented (Lots restants)

### Lot 1 Messagerie — finition restante
- [ ] Vérifier le mode ephemeral (disparition auto) UI complète
- [ ] Tester E2E avec compte réel (besoin identifiants)
- [ ] Audit `requests.tsx` (DM Requests)
- [ ] Audit `new-group.tsx` (création groupes)
- [ ] Push notifications messagerie

### Lot 2 — Appels Audio/Vidéo WebRTC
- [ ] Audit `app/messages/call.tsx` (1444 lignes existantes)
- [ ] TURN server (Twilio/Metered/Xirsys)
- [ ] CallKit iOS / Notifee FCM Android pour incoming calls
- [ ] Tests E2E 2 devices

### Lot 3 — Live Streaming Agora (TikTok-like)
- [ ] Audit 9 écrans `app/live/*` + 30 utilitaires `src/live/*`
- [ ] Config `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` sur Render
- [ ] Tests broadcast + viewing

### Lot 4 — Live Cadeaux / Multi-host / Replay
- [ ] Gifts catalog UI (déjà codé `src/live/extendedGiftCatalog.ts`)
- [ ] Raise-hand → multi-host approval
- [ ] Replay avec chat synchronisé
- [ ] Analytics créateur

## Configuration Render prod requise (action utilisateur)
- ⚠️ `OPENAI_API_KEY` → pour transcription Whisper
- ⚠️ `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` → pour Live
- ⚠️ TURN server creds (`TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`) → pour appels WebRTC

## Tests requis (besoin de l'utilisateur)
- Identifiants test sur `afriwonder.onrender.com` (2 comptes pour tester chat/calls 1-1)
- OU autoriser la création de comptes test via `/api/proxy/auth/register`

## Notes critiques
- `react-native-agora`, `react-native-webrtc`, `react-native-vision-camera` **ne fonctionnent PAS sur Expo Go**
- Test en natif obligatoire = EAS Build dev-client
- Pour deployer les changements mobile : "Save to GitHub" → trigger Render redeploy (uniquement si backend modifié) + nouveau EAS Build pour APK

## Next Action Items
1. Utilisateur configure `OPENAI_API_KEY` sur Render
2. Utilisateur fournit identifiants test ou autorise création test accounts
3. Continuer Lot 2 (Appels WebRTC) puis Lot 3 (Live Agora)
