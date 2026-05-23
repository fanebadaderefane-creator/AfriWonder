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
  - `backend/server.py` → FastAPI Python (complément mobile) → port 8001 supervisor
- `/app/src/` → PWA Vite (non utilisé pour mobile clients)

## What's Been Implemented

### Session 1 — Connexion repo
- Repo cloné dans `/app`, `.git` et `.emergent` préservés
- Frontend `.env` : `EXPO_PUBLIC_BACKEND_URL=https://afriwonder.onrender.com`
- Backend Python `.env` + dépendances installées
- Supervisor : backend uvicorn :8001, frontend `yarn start` → `expo start --web --tunnel --port 3000`
- Tunnel ngrok actif pour Expo Go
- Backend Python `/api/health` → 200 OK
- Frontend Metro bundling OK

### Session 2 — Lot 1 Messagerie (transcription + historique appels)
**Fichiers modifiés** :
- `frontend/app/messages/[id].tsx` (+120 lignes)
- `frontend/app/messages/index.tsx` (+205 lignes)

**Fonctionnalités** :
1. ✅ Transcription IA Whisper sur vocaux (UI + appel backend)
2. ✅ Onglet Appels = historique réel `/me/call-history`
3. ✅ FAB Appels → picker contact

### Session 3 — Traduction GPT-5.2 multi-langue
**Fichiers créés/modifiés** :
- `backend/src/utils/openaiTranslate.ts` (NEW) — utilitaire OpenAI Chat API
- `backend/src/routes/messages.routes.ts` — ajout 2 routes :
  - `GET /api/messages/translation/languages` (liste langues)
  - `POST /api/messages/message/:id/translate` (transcrit puis traduit)
- `frontend/app/messages/[id].tsx` — UI chips drapeaux 🇫🇷🇬🇧🇲🇱🇸🇳 sous transcription

**Détails traduction** :
- Modèle : `gpt-5.2` (OpenAI) via `OPENAI_API_KEY`
- Langues : Français (fr), Anglais (en), Bambara (bm), Wolof (wo)
- Prompt système optimisé pour low-resource languages (Bambara/Wolof orthographe latine)
- Conserve noms propres, ton, registre
- Cap 4000 chars en entrée, 8000 en sortie
- Affichage : zone violette sous transcription orange (couleurs distinctes)

## What's NOT yet implemented

### Lot 1 Messagerie — finition restante
- [ ] Audit `requests.tsx` (DM Requests)
- [ ] Audit `new-group.tsx` (création groupes)
- [ ] Audit groupes : `app/messages/[id].tsx` route group → mêmes features
- [ ] Push notifications messagerie
- [ ] Tests E2E avec compte réel (besoin identifiants)

### Lot 2 — Appels Audio/Vidéo WebRTC
- [ ] Audit `app/messages/call.tsx` (1444 lignes existantes)
- [ ] TURN server (Twilio/Metered/Xirsys)
- [ ] CallKit iOS / Notifee FCM Android pour incoming calls
- [ ] Tests E2E 2 devices

### Lot 3 — Live Streaming Agora
- [ ] Audit 9 écrans `app/live/*`
- [ ] Config `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` sur Render
- [ ] Tests broadcast + viewing

### Lot 4 — Live Cadeaux / Multi-host / Replay
- [ ] Gifts catalog UI complète
- [ ] Multi-host approval flow
- [ ] Replay chat sync
- [ ] Analytics créateur

## Configuration Render prod requise (action utilisateur)
- ⚠️ **`OPENAI_API_KEY`** → pour Whisper transcription ET GPT-5.2 traduction
- ⚠️ `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` → pour Live (Lot 3)
- ⚠️ TURN server creds (`TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`) → pour appels (Lot 2)

## Tests requis (besoin de l'utilisateur)
- Identifiants test sur `afriwonder.onrender.com` (2 comptes pour tester chat/calls 1-1)

## Notes critiques
- `react-native-agora`, `react-native-webrtc`, `react-native-vision-camera` **ne fonctionnent PAS sur Expo Go**
- Test natif obligatoire = EAS Build dev-client
- Pour déployer : "Save to GitHub" → Render auto-redeploy + nouveau EAS Build

## Next Action Items
1. Utilisateur push to GitHub → Render redeploy (pour activer endpoints translate)
2. Utilisateur configure `OPENAI_API_KEY` sur Render
3. Utilisateur fournit identifiants test
4. Continuer Lot 2 (Appels WebRTC) puis Lot 3 (Live Agora)
