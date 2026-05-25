# AfriWonder — Plan d'exécution Live + Messagerie + Appels

## Vue d'ensemble du périmètre découvert

Votre repo contient déjà une implémentation **massive et professionnelle** :

### Backend TypeScript Express (Render prod — `afriwonder.onrender.com`)
- **Messagerie** : 50+ endpoints dans `src/routes/messages.routes.ts` (903 lignes)
  - Conversations 1-1 + groupes
  - Messages texte / image / vidéo / voix / audio / document / **location** / contact
  - Réactions, pin, star, forward, edit, delete (me / everyone)
  - DM requests (accept / decline)
  - Drafts, scheduled messages, search, archive, notifications
  - **Transcription IA (Whisper)** : `POST /messages/message/:id/transcribe` — utilise `OPENAI_API_KEY`
  - Polls dans les messages, ephemeral mode
- **Live** : 50+ endpoints dans `src/routes/live.routes.ts` (1051 lignes)
  - Agora App ID/Token (RTC role broadcaster/audience)
  - Catégories, discovery, recommendations
  - Wallet + recharge (Mobile Money inclus)
  - Cadeaux, économie, niveaux créateur
  - Subscriptions créateur, bell notifications
  - Start / join / leave / heartbeat / end
  - Chat live, replay chat, tips, raise-hand, age-ack
  - Captions broadcast
- **Appels** : `src/routes/calls.routes.ts` (210 lignes) + `me/call-history`
  - TURN credentials (`/calls/turn-credentials`)
  - Session signaling (initiate, upsert, state, end)
  - **Historique d'appels** : `GET /me/call-history` (DM + groupes)

### Frontend Mobile (Expo React Native — `/app/frontend`)
- `app/messages/index.tsx` (1007 lignes) — Inbox 3 onglets : Discussions / Statuts / Appels
- `app/messages/[id].tsx` (2207 lignes) — Chat individuel/groupe complet
- `app/messages/call.tsx` (1444 lignes) — UI d'appel WebRTC + audio/vidéo
- `app/messages/requests.tsx` — DM Requests
- `app/messages/new-group.tsx` — Création groupe
- `app/live/*` — 9 écrans (start, stream, [id], replay, gifts, analytics, coin-recharge, etc.)
- 30+ fichiers utilitaires dans `src/live/` (sons cadeaux, qualité vidéo, polls, geo, etc.)
- `src/call/` — WebRTC quality, ringtone, push navigation

---

## Lot 1 — Messagerie (en cours)

### ✅ Livrés cette session
1. **Transcription IA des notes vocales** (UI mobile)
   - Long-press sur message vocal → "Transcrire (IA)" dans le context menu
   - Appel `POST /messages/message/:id/transcribe` (backend Whisper existant)
   - Affichage texte transcrit sous la bulle vocale avec icône ✨ + bordure orange
   - Indicateur de chargement ("Transcription en cours...")
2. **Onglet Appels — Historique réel**
   - Branchement `GET /me/call-history` (DM + groupes, pagination)
   - Liste avec avatar, nom, flèche direction (in/out), badge missed rouge
   - Format: "il y a Xh · 14:32 · 2min 15s"
   - Tap pour rappel direct (audio ou vidéo selon l'historique)
   - Refresh-control + loading
3. **FAB Appels** ouvre désormais le picker de contact (au lieu d'une simple alerte)

### 🔧 À configurer côté Render prod (action utilisateur)
- **`OPENAI_API_KEY`** dans les variables d'env Render
  - Sans cette clé, l'endpoint `/messages/message/:id/transcribe` retourne 503
  - Vous pouvez utiliser votre clé OpenAI ou demander la clé universelle Emergent
- Pousser les modifs frontend via "Save to GitHub" pour build APK / EAS

### 📋 Pour tester complètement en production
Il me faut :
1. **Identifiants test** d'un compte utilisateur sur `afriwonder.onrender.com` (email + password)
2. Idéalement un **2e compte** pour tester chats 1-1 et appels (sinon je peux en créer deux via l'endpoint register)

---

## Lots suivants (à enchaîner après validation Lot 1)

### Lot 2 — Appels audio/vidéo WebRTC
- Vérifier `app/messages/call.tsx` (1444 lignes — déjà très avancé)
- TURN server credentials (Twilio/Metered)
- Push notifications d'appel entrant (callkit iOS / FCM Android)
- Auto-reconnect en cas de perte réseau
- Tests E2E avec 2 devices

### Lot 3 — Live streaming Agora
- Vérifier `app/live/stream.tsx` + `app/live/[id].tsx`
- Configurer `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` sur Render
- Tester broadcast + viewing
- Gérer ABR (adaptive bitrate)

### Lot 4 — Live gifts, multi-host, replay
- Catalogue cadeaux étendu (déjà codé dans `src/live/extendedGiftCatalog.ts`)
- Multi-host invite (raise-hand → approval)
- Replay avec chat synchronisé
- Analytics créateur

---

## Notes importantes
- **Expo Go ne supporte PAS** `react-native-agora`, `react-native-webrtc`, `react-native-vision-camera`
- Pour tester en natif : **EAS Build dev-client** obligatoire (Android APK ou iOS IPA)
- Une fois l'APK installé, ouvrir l'app et pointer vers le tunnel ngrok du Metro pour HMR

## Comment je propose de continuer
1. Vous validez les changements messagerie (voir git diff)
2. Vous configurez OPENAI_API_KEY sur Render
3. Vous me donnez des identifiants test
4. Je passe au Lot 2 (Appels) puis Lot 3 (Live)
