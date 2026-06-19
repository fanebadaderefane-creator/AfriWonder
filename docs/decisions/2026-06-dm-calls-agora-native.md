# ADR — Appels DM 1:1 : Agora sur natif, WebRTC sur web

**Date** : 2026-06  
**Statut** : Accepté — validé terrain Mali / Maroc  
**Contexte** : WebRTC + TURN instable cross-border (Mali↔Maroc), régressions signalisation SDP récurrentes sur natif.

## Décision

1. **Android / iOS (Expo dev client / EAS)** : média **Agora RTC** pour les appels DM 1:1.
2. **Signalisation** : conserver **Socket.io** (`call:invite`, `call:accept`, `call:end`, etc.) — Agora ne remplace pas le cycle d’appel produit.
3. **Expo web / PWA** : conserver **WebRTC** (`CallScreenInner`, `DirectCall.jsx`) avec TURN prod.
4. **Canal Agora** : `dm_{callId}` ; token via `GET /api/calls/:callId/agora-token`.

## Conséquences

- Dépendance `react-native-agora` — **fichiers `.native.*` uniquement** ; stubs `.web.*` obligatoires.
- `shouldUseAgoraDmCalls()` = `false` sur `Platform.OS === 'web'`.
- Feature flag `EXPO_PUBLIC_DM_CALLS_AGORA` (défaut `true`) pour rollback d’urgence vers WebRTC natif.
- Backend : `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` sur Render (`capabilities.agora_rtc`).

## Preuve de non-régression

```bash
cd frontend && npm run verify:dm-calls
cd frontend && npm run verify:pre-apk
```

Règles Cursor : `call-dm-agora-locked.mdc`, `call-signaling-locked.mdc`, `call-native-crash-locked.mdc`.

## Alternatives écartées

| Option | Raison |
|--------|--------|
| TURN seul sur natif | Échecs 4G cross-border, maintenance Metered |
| Agora pour signalisation | Coût + duplication avec socket existant |
| Agora sur Expo web | SDK natif incompatible ; WebRTC suffit sur desktop |
