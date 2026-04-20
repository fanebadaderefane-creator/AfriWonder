# AfriWonder Mobile APIs

## POST `/api/mobile/biometric-session`
- Auth: oui (JWT valide après déverrouillage biométrique côté app)
- Body (objet JSON, champs optionnels) :
```json
{ "intent": "unlock" }
```
- Réponse :
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "intent": "unlock",
    "validated_at": "2026-04-14T12:00:00.000Z"
  }
}
```
- Note : les jetons restent dans **SecureStore** ; cette route sert d’audit / cohérence serveur.

## POST `/api/mobile/push-token`
- Auth: oui
- Body:
```json
{ "token": "ExponentPushToken[xxx]", "platform": "android" }
```
- Réponse:
```json
{ "success": true, "data": { "id": "sub_id", "endpoint": "fcm:android:ExponentPushToken[xxx]" } }
```

- **Envoi** : les jetons `ExponentPushToken[...]` partent vers l’API Expo Push (`POST https://exp.host/--/api/v2/push/send`). Définir `EXPO_ACCESS_TOKEN` (compte Expo) sur le backend est recommandé en production. Les jetons **FCM natifs** (hors Expo) restent sur l’API legacy `FIREBASE_SERVER_KEY` + `registration_ids`.

## GET `/api/mobile/videos/:id/download-url`
- Auth: optionnelle
- Réponse:
```json
{ "success": true, "data": { "download_url": "https://..." } }
```

## GET `/api/mobile/resolve-deeplink?url=afriwonder://video/123`
- Auth: optionnelle
- Réponse:
```json
{ "success": true, "data": { "entity_type": "video", "entity_id": "123", "route": "/watch/123", "exists": true } }
```

## PUT `/api/mobile/device-settings`
- Auth: oui
- Body supporté:
```json
{
  "data_saver_mode": true,
  "preferred_language": "fr",
  "timezone": "Africa/Bamako",
  "theme": "dark",
  "preferred_categories": ["music", "news"],
  "messaging_e2e_enabled": true,
  "messaging_read_receipts_enabled": false,
  "messaging_cdc_moderation": { "forwardLimit": 5 }
}
```

## GET `/api/mobile/device-settings`
- Auth: oui
- Réponse:
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "data_saver_mode": true,
    "preferred_language": "fr"
  }
}
```

## POST `/api/mobile/sync`
- Auth: oui
- Body:
```json
{
  "actions": [
    { "client_id": "offline-1", "type": "like_video", "target_id": "video_id", "payload": { "liked": true } },
    { "client_id": "offline-2", "type": "comment_video", "target_id": "video_id", "payload": { "content": "🔥🔥" } }
  ]
}
```
- Types supportés:
  - `like_video`
  - `save_video`
  - `follow_user`
  - `comment_video`

## POST `/api/mobile/analytics/event`
- Auth: oui
- Body:
```json
{
  "eventType": "mobile_feed_open",
  "entityType": "screen",
  "entityId": "home",
  "metricValue": 1,
  "metadata": { "platform": "android" }
}
```

## POST `/api/live/:liveId/chapters/:chapterId/republish`
- Auth: oui (JWT) — **créateur** du live uniquement.
- Prérequis : live terminé, chapitre avec `replay_url` renseigné.
- Effet : crée une entrée **Video** réutilisant la même URL replay, avec `trim_start_sec` / `trim_end_sec` dérivés du chapitre (et `editor_metadata` `{ "source": "live_highlight", "live_id", "chapter_id" }`).
- Réponse **201** :
```json
{
  "success": true,
  "data": { "id": "…", "video_url": "…", "trim_start_sec": 0, "trim_end_sec": 120, "…": "…" }
}
```
- Usage mobile : bouton **Feed** sur `frontend/app/live/replay.tsx` ; le feed home applique la fenêtre temps quand `trim_start_sec` / `trim_end_sec` sont présents.
