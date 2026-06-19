# Runbook — Appels DM vocal / vidéo (AfriWonder)

> **État validé (juin 2026)** : Mali↔Mali, Maroc↔Maroc, Mali↔Maroc — vocal et vidéo.

## Avant chaque build APK/IPA

```bash
cd frontend
npm run verify:dm-calls
npm run verify:pre-apk
```

Optionnel — token Agora réel sur prod :

```powershell
$env:AFW_TEST_EMAIL="..."
$env:AFW_TEST_PASSWORD="..."
npm run verify:agora-dm
```

## Test manuel obligatoire (2 téléphones)

1. **Vocal** : A appelle B → sonnerie → décrocher → **audio des 2 côtés** ≥ 30 s.
2. **Vidéo** : idem → **caméra locale + distante**.
3. **Réseau** : répéter en **Wi‑Fi**, puis **4G** (ou inverse).
4. **Géo** : tester au moins une paire **pays différents** si cible cross-border.
5. **Entrant** : app en arrière-plan → notification → décrocher sans crash.
6. **Manqué** : pas de réponse → écran « Sans réponse » + rappeler.

## Zones verrouillées (ne pas modifier sans ticket)

| Règle Cursor | Périmètre |
|--------------|-----------|
| `call-dm-agora-locked.mdc` | Agora natif, stubs web, UI WhatsApp |
| `call-signaling-locked.mdc` | SDP/ICE WebRTC (web + fallback) |
| `call-native-crash-locked.mdc` | Teardown RTCView (fallback WebRTC) |

## Symptômes rapides

| Problème | Vérifier |
|----------|----------|
| Web `npm start` crash Agora | `npm run verify:web-call-bundle` (via verify:dm-calls) |
| Silence après décrocher | `call:accept` émis trop tôt ? InCallManager libéré ? |
| Token Agora 401 | Login JWT, route `/agora-token`, session upsert |
| `agora_rtc: false` sur prod | `AGORA_APP_ID` + certificat Render |

## Rollback d’urgence (natif → WebRTC)

Définir `EXPO_PUBLIC_DM_CALLS_AGORA=false` + rebuild EAS. Le chemin WebRTC dans `call.tsx` reste maintenu pour web et fallback.
