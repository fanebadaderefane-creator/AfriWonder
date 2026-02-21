# Pipeline HLS (Netflix/TikTok) — AfriWonder

Objectif : remplacer le MP4 unique par du **HLS multi-qualité** pour lecture adaptative, zéro buffering visible, et scale à des millions d’utilisateurs (CDN + segments).

## Pourquoi HLS

- Charge **petit à petit** (segments), pas tout le fichier
- **Qualité adaptative** selon la connexion (2G/3G/4G)
- Pas de buffering visible si bien configuré
- Standard utilisé par Netflix, YouTube, TikTok
- Idéal pour l’Afrique (connexions variables)

## Prérequis

- **FFmpeg** avec support HLS (segments + master playlist)
- Stockage : **CDN** obligatoire (Cloudflare R2 + CDN, AWS S3 + CloudFront, BunnyCDN). Ne pas servir les vidéos depuis le serveur d’app.

## Conversion FFmpeg (3 qualités)

Commande pour générer **master.m3u8** + 3 rendus (360p, 480p, 720p) :

```bash
ffmpeg -i input.mp4 \
  -filter_complex "[0:v]split=3[v1][v2][v3]" \
  -map "[v1]" -b:v:0 800k -s:v:0 640x360 \
  -map "[v2]" -b:v:1 1400k -s:v:1 842x480 \
  -map "[v3]" -b:v:2 2800k -s:v:2 1280x720 \
  -map a:0 -c:a aac -b:a 128k \
  -f hls \
  -hls_time 4 \
  -hls_playlist_type vod \
  -hls_segment_filename "output_%v_%03d.ts" \
  -master_pl_name master.m3u8 \
  output_%v.m3u8
```

Résultat :

- `master.m3u8` — playlist maître (à servir au player)
- `output_0.m3u8` + `output_0_*.ts` — 360p
- `output_1.m3u8` + `output_1_*.ts` — 480p
- `output_2.m3u8` + `output_2_*.ts` — 720p

## Intégration backend

1. **Upload** : réception du fichier source (MP4).
2. **File d’attente** (optionnel) : job qui lance la conversion FFmpeg (ou script `scripts/convert-to-hls.sh`).
3. **Stockage** : upload de `master.m3u8` et de tous les `.m3u8` / `.ts` vers le bucket CDN (R2/S3/Bunny).
4. **Base de données** : enregistrer l’URL publique du **master.m3u8** dans `video.video_url` (ou champ dédié `video.hls_url`). Le front utilise cette URL pour HLS.js.

## Frontend (déjà en place)

- **VideoCard** : si `video_url` se termine par `.m3u8`, le player utilise **HLS.js** avec config Afrique (buffer court, qualité adaptative, `abrEwmaDefaultEstimate` bas).
- **Safari** : lecture native HLS si `canPlayType('application/vnd.apple.mpegurl')`.
- **Service Worker** : cache des requêtes `.m3u8` et `.ts` pour relecture offline.

## Métriques (algo type TikTok)

Pour un feed intelligent, tracker côté API :

- `watchTime` (secondes)
- `completed` (bool)
- `skip` (avant X secondes)
- `rewatch` (relecture)
- `like` / `share` / `comment`

Exemple : `POST /api/videos/:id/view` ou `POST /api/track` avec `{ videoId, watchTime, completed }`. Le backend peut s’appuyer sur `recordView` existant et étendre le schéma si besoin.

## Checklist déploiement

- [ ] FFmpeg installé sur la machine qui fait la conversion
- [ ] Bucket CDN configuré (R2/S3/Bunny) avec URLs publiques
- [ ] Script ou worker qui convertit chaque nouvel upload en HLS
- [ ] `video.video_url` (ou `hls_url`) pointe vers l’URL du **master.m3u8**
- [ ] Front : déjà prêt (HLS.js + cache SW)
