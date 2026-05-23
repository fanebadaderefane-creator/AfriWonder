# AfriWonder - PRD & Setup Memory

## Original Problem Statement
Repo: https://github.com/fanebadaderefane-creator/AfriWonder
Clients : Mobile Android/iOS uniquement — Mali, Sénégal, Côte d'Ivoire, etc.

## Architecture
- `/app/frontend/` → Expo React Native SDK 54 (mobile)
- `/app/backend/src/` → TypeScript Express + Prisma + Supabase → Render prod
- `/app/backend/server.py` → FastAPI Python (complément) — port 8001

## What's Been Implemented

### Session 1 — Connexion repo ✅
### Session 2 — Messagerie : transcription Whisper + historique appels ✅
### Session 3 — Traduction GPT-5.2 multi-langue (FR/EN/BM/WO) ✅

### Session 4 — Lot 2 Appels WebRTC optimisé Afrique ✅
**Fichiers modifiés** :
- `backend/src/routes/calls.routes.ts` (+/- 30 lignes)
- `frontend/app/messages/call.tsx` (+/- 80 lignes)
- `memory/GUIDE_TURN_SERVER.md` (NEW)

**Améliorations backend (à pousser sur Render)** :
1. ✅ `urls` toujours retourné en array (cohérence clients)
2. ✅ Liste STUN publics renvoyée (publicStun) — clients toujours à jour
3. ✅ Fallback graceful : si TURN non configuré, retourne 200 + STUN (au lieu de 503)
4. ✅ Champ `turnConfigured: bool` pour debug

**Améliorations frontend mobile** :
1. ✅ **Bug fix** : params mismatch inbox → call.tsx (peerId/peerName/peerAvatar/callType + rétro-compat)
2. ✅ **STUN multiples** : Google ×2, Cloudflare, Twilio public (résilience NAT)
3. ✅ **Détection bande passante** via NetInfo (`@react-native-community/netinfo`)
4. ✅ **Profil vidéo adaptatif** :
   - 2G/3G mobile → 320x240 @ 15fps, max 200 kbps
   - 4G mobile → 640x480 @ 24fps, max 500 kbps
   - WiFi → 1280x720 @ 30fps, max 1.5 Mbps
5. ✅ **Cap bitrate** appliqué via `RTCRtpSender.setParameters()` (évite bursts qui dropent en 3G)
6. ✅ **Audio amélioré** : echoCancellation + noiseSuppression + autoGainControl (marchés, motos)
7. ✅ **bundlePolicy max-bundle + rtcpMuxPolicy require** (moins de ports — meilleur sur restrict carrier-grade NAT)
8. ✅ **iceCandidatePoolSize: 4** — connexion plus rapide
9. ✅ **Détection changement réseau** en cours d'appel (WiFi ↔ 4G handover) avec notification
10. ✅ **Toast erreur réseau** auto-clear après 4s

**Documentation** :
- `memory/GUIDE_TURN_SERVER.md` : 4 options (Metered free, Twilio, Coturn DO, Xirsys) + variables Render à ajouter + tests

## What's NOT yet implemented

### Lot 2 Appels — Reste
- [ ] CallKit iOS (incoming call native UI) — nécessite `react-native-callkeep`
- [ ] Notifee + FCM Android (incoming call full-screen)
- [ ] Background killed app : wake-up via push to receive call
- [ ] Group calls multi-party (>2 personnes) — actuellement 1-1 uniquement
- [ ] Recording d'appel (optionnel, légal selon pays)

### Lot 3 — Live Streaming Agora (TikTok-like)
- [ ] Audit 9 écrans `app/live/*`
- [ ] Config `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` sur Render
- [ ] Tests broadcast + viewing

### Lot 4 — Live Cadeaux / Multi-host / Replay

## Configuration Render prod requise (action utilisateur)
- ⚠️ **`OPENAI_API_KEY`** → Whisper + GPT-5.2 (déjà demandé)
- ⚠️ **TURN server** (4 options dans `GUIDE_TURN_SERVER.md`, gratuit possible via Metered.ca) :
  - `TURN_URL` (comma-separated URLs avec ports + transports)
  - `TURN_SHARED_SECRET`
  - `TURN_REALM`
  - `TURN_CREDENTIAL_TTL_SEC` (optionnel, default 3600)
- ⚠️ `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` → Live (Lot 3)

## Tests requis
- 2 comptes test sur Render prod
- 2 devices physiques (1 en France + 1 au Mali via 4G idéal)

## Next Action Items
1. User push to GitHub → Render redeploy
2. User configure `OPENAI_API_KEY` + TURN sur Render
3. User fait EAS Build dev-client Android + installe APK
4. User teste appels sur 2 devices
5. Je passe au **Lot 3 (Live Agora)**
