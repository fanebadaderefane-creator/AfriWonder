# Débogage appels vocal/vidéo — temps réel (sans rebuild APK)

Objectif : modifier le JS/TS, recharger Metro, tester sur téléphone Android USB, avec backend local et logs immédiats.

---

## 1. Mode de développement AfriWonder (réponse courte)

| Option | Compatible AfriWonder ? | Pourquoi |
|--------|-------------------------|----------|
| **Expo Go** | **Non** | `react-native-webrtc`, CallKit, modules natifs custom → hors Expo Go. |
| **Expo Development Build** (`expo-dev-client`) | **Oui — recommandé** | APK/IPA dev installé **une fois** ; le JS vient de Metro à chaque reload. |
| **EAS Build preview/production** | Oui pour QA finale | JS embarqué sauf si dev client ; rebuild lent. |
| **React Native CLI seul** | Non (projet Expo) | Le repo utilise Expo Router + plugins (`app.json`). |

**Conclusion** : utiliser un **Development Build** (`eas.json` → profil `development` avec `developmentClient: true`).

---

## 2. Installation unique du Development Build

```powershell
cd frontend
# APK dev (une fois, ou quand un module natif change)
eas build --profile development --platform android
# ou local :
npx expo run:android
```

Installez l’APK sur le téléphone. Ensuite, **plus besoin de rebuild** pour les changements JavaScript.

---

## 3. Procédure quotidienne (3 terminaux)

### Terminal 1 — Backend

```powershell
cd backend
npm run dev
```

Copiez les variables TURN depuis Render/production dans `backend/.env` (`METERED_TURN_API_KEY` ou `TURN_URL` + `TURN_USERNAME` + `TURN_CREDENTIAL`).

### Terminal 2 — Metro (Development Build)

```powershell
cd frontend
# Copier .env.example → .env si besoin
# Dev LAN (téléphone physique USB) :
#   EXPO_PUBLIC_DEV_PC_LAN_HOST=192.168.x.x   (IP du PC)
npx expo start --dev-client --host lan
```

Sur le téléphone : ouvrir **AfriWonder** (icône dev) → choisir le packager LAN affiché par Metro.

**Reload après chaque modification** : secouer → **Reload**, ou `r` dans le terminal Metro.

### Terminal 3 — Logcat

```powershell
cd frontend
powershell -File scripts/dev-android-call.ps1
# ou manuellement :
adb logcat -c
adb logcat -v time ReactNativeJS:E ReactNativeJS:W *:S
```

Raccourci npm :

```powershell
cd frontend
npm run dev:android:logs
```

---

## 4. Vérifier TURN en dev local

Même route que l’app mobile (`/api/proxy/calls/turn-credentials`) :

```powershell
cd frontend
# Backend local par défaut http://localhost:3000
$env:AFW_TEST_EMAIL="votre@email.com"
$env:AFW_TEST_PASSWORD="votre_mot_de_passe"
npm run verify:turn-dev
```

Backend distant (comparer avec prod) :

```powershell
$env:BACKEND_ORIGIN="https://afriwonder.onrender.com"
$env:AFW_TEST_EMAIL="..."
$env:AFW_TEST_PASSWORD="..."
node scripts/verify-turn-dev.cjs
```

Attendu : `turnConfigured: true`, URLs `metered.ca` / `metered.live` dans `iceServers`.

---

## 5. Tags logs permanents (Logcat)

Toujours émis via `console.error` (visibles sans `EXPO_PUBLIC_CALL_DEBUG`) :

| Tag | Événement |
|-----|-----------|
| `[AFW_CALL]` | invite, accept, createOffer/Answer, setLocal/RemoteDescription, bootstrap, abort |
| `[SDP_SEND]` | Offre/réponse SDP émise sur socket |
| `[SDP_RECEIVED]` | SDP distant reçu |
| `[ICE_LOCAL]` | Candidat ICE local |
| `[ICE_REMOTE]` | Candidat ICE distant |
| `[CALL_END_EMIT]` | `call:end` émis |
| `[CALL_END_RECEIVED]` | `call:end` reçu |
| `[AFW_CALL_EXIT]` | `finishCall` (raison + état PC) |

Logs détaillés optionnels : `EXPO_PUBLIC_CALL_DEBUG=1` (phases `[Call]` JSON).

---

## 6. Investigation `caller_offer_retries_exhausted`

Symptômes observés :

```
peerAccepted=true  hasRemoteSdp=false  pcState=new  ice=new
exitSource=caller_offer_retries_exhausted
```

### Flux attendu (appelant)

```
call:invite → call:accept → createOffer → setLocalDescription → [SDP_SEND] offer
→ receveur createAnswer → [SDP_RECEIVED] answer → setRemoteDescription → ICE
```

### Cause racine (scénario Android)

Le receveur accepte **avant** la fin du bootstrap appelant (TURN + permissions + `getUserMedia` + `attachLocalTracks`). Les retries d’offre échouaient en ~8 s alors que le PC/micro n’étaient pas prêts.

**Correctif** (dans `call.tsx`) :

- `callerBootstrapReadyRef` + `waitForCallerBootstrap()` (jusqu’à 45 s)
- Retries non comptés tant que bootstrap incomplet

### Checklist logcat après reload Metro

1. `[AFW_CALL] caller_bootstrap_ready` — micro attaché au PC
2. `[AFW_CALL] accept_rx` — décrochage reçu
3. `[AFW_CALL] createOffer` puis `[SDP_SEND] type=offer`
4. `[SDP_RECEIVED] type=answer` — sinon le receveur n’a pas répondu
5. Si échec : `[AFW_CALL] caller_offer_abort` avec `reason` (`bootstrap_timeout`, `no_audio_sender`, `sdp_send_socket_failed`, …)

---

## 7. Quand rebuild APK ?

| Changement | Action |
|------------|--------|
| `call.tsx`, `src/call/*`, logique JS | **Reload Metro** |
| `.env` `EXPO_PUBLIC_*` (déjà dans le bundle dev) | Redémarrer Metro |
| `react-native-webrtc`, plugin Android, `app.json` permissions | **Rebuild dev client** |
| Profil EAS production Play Store | `eas build --profile production` |

---

## 8. Fichiers clés

| Fichier | Rôle |
|---------|------|
| `frontend/app/messages/call.tsx` | Écran appel + signalisation |
| `frontend/src/call/callDiagnosticLog.ts` | Logs permanents Logcat |
| `frontend/src/call/callCallExit.ts` | `[AFW_CALL_EXIT]` |
| `frontend/scripts/dev-android-call.ps1` | Aide terminal + logcat |
| `frontend/scripts/verify-turn-dev.cjs` | Vérif TURN backend dev |
