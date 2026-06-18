# Audit appel vidéo DM Agora (Android / Expo)

> Dernière passe : juin 2026 — objectif **100 % appels vidéo 1:1 natifs** (Mali / réseaux instables).

## Architecture

| Couche | Fichier | Rôle |
|--------|---------|------|
| Entrée | `app/messages/call.tsx` | Route natif → `DirectCallAgoraScreen` si `shouldUseAgoraDmCalls()` |
| UI + signalisation | `src/call/DirectCallAgoraScreen.tsx` | Socket invite/accept/upgrade + dock WhatsApp |
| Média | `src/hooks/useDirectCallAgoraRtc.native.tsx` | Agora RTC (pas WebRTC/TURN) |
| Token | `GET /api/calls/:callId/agora-token` | Canal `dm_{callId}` |
| Entrant | `IncomingCallOverlay.native.tsx` | Sonnerie → navigation receveur (sans `call:accept` prématuré) |

## Bugs corrigés (cette passe)

1. **Vidéo distante masquée** quand caméra locale off → `shouldShowAgoraVideoStage()` découple remote/local.
2. **Rejoin Agora** au toggle caméra → `videoEnabled` retiré des deps join ; mute via `muteLocalVideoStream`.
3. **Double invite** au toggle HP → bootstrap `bootstrapDoneRef` + retrait `speakerOn` des deps.
4. **`enableLocalVideo(true)`** manquant au join vidéo initial.
5. **Receveur rétrogradé audio** sur 2G alors que l’appelant envoie vidéo → plus de downgrade sur `navigateToReceiverCallScreen`.
6. **`call:invite:ack`** ajouté (parité WebRTC, sync `callId`).
7. **Minimize** → `router.back()` au lieu d’un second push écran d’appel.
8. **HP post-Agora** → `applyNativeCallSpeakerRoute` uniquement pendant la sonnerie (InCallManager).

## Prérequis production

```bash
# Backend Render
AGORA_APP_ID=...
AGORA_APP_CERTIFICATE=...

# Vérifier
curl -H "Authorization: Bearer …" https://…/api/live/agora-status
curl -H "Authorization: Bearer …" https://…/api/calls/{callId}/agora-token
```

## Tests locaux

```bash
cd frontend
npm run test -- src/call/agoraDmVideoUi.test.ts src/call/agoraDmCallSession.test.ts
node scripts/verify-call-media-readiness.cjs
npm run typecheck
```

## Matrice terrain (2 téléphones Android)

| # | Scénario | Attendu |
|---|----------|---------|
| 1 | Appel vidéo WiFi A→B | Les deux voient remote + pip local |
| 2 | Couper caméra locale | **Remote reste visible** |
| 3 | Toggle HP une fois connecté | Pas de nouvelle invite, appel stable |
| 4 | Audio → upgrade vidéo | `call:upgrade` + caméra des deux côtés |
| 5 | Accepter vidéo depuis overlay | Même `callId` / canal Agora dans les logs |
| 6 | Raccrocher | Sonneries coupées immédiatement |

## Logs adb (caller + receiver)

```powershell
adb logcat -c
adb logcat -v time ReactNativeJS:E ReactNativeJS:W *:S
```

Repères : `agora_token_ok`, `agora_join_ok`, `agora_remote_ready`, `agora_upgrade_video`.

## Reste manuel / ops

- Permissions caméra refusées → message FR + Réglages.
- PiP Android (expo-pip) optionnel sur minimize vidéo.
- Appels groupe = flux séparé (`call-add-people` → `group-call`).
