# R2 en production : pourquoi l’upload marche sur Chrome mais pas sur iPhone/Android

## Ce qui se passe

- **Sur Chrome (souvent en local)** : le front appelle votre backend **local** (`npm run dev`), qui charge le fichier `.env` avec `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`. L’upload fonctionne.
- **Sur iPhone/Android** : l’app (ex. PWA ou site déployé sur Vercel) appelle le **backend de production** (ex. Render). Ce serveur n’utilise **pas** votre `.env` local ; il utilise uniquement les variables d’environnement définies sur l’hébergeur. Si R2 n’y est pas configuré, l’API renvoie *« Upload non disponible : R2 non configuré »*.

## Solution : configurer R2 sur le backend de production

Sur l’hébergeur du backend (Render recommandé, Fly.io, etc.) :

1. Ouvrez le **tableau de bord** du service qui exécute l’API (backend).
2. Allez dans **Environment** / **Variables d’environnement**.
3. Ajoutez exactement les mêmes variables que dans votre `.env` local :

   | Variable             | Exemple / description |
   |----------------------|------------------------|
   | `R2_ENDPOINT`        | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
   | `R2_ACCESS_KEY_ID`   | Clé d’accès S3 API (Cloudflare R2 → bucket → Settings → S3 API) |
   | `R2_SECRET_ACCESS_KEY` | Secret S3 API |
   | `R2_BUCKET_NAME`     | `afriwonder` (ou le nom de votre bucket) |
   | `R2_PUBLIC_URL`      | URL publique du bucket (ex. `https://pub-xxxx.r2.dev` ou custom domain) |

4. **Enregistrez** et **redémarrez** le service backend (redeploy si besoin).

Après ça, les requêtes venant du mobile (iPhone/Android) qui passent par ce backend auront R2 configuré et l’upload pourra fonctionner comme sur Chrome.

## Vérification rapide

- Backend en prod : ouvrir `https://votre-backend.onrender.com/health` (ou l’URL réelle).
- Tester l’upload depuis l’app sur **le même réseau que la prod** (ou depuis le téléphone sur 4G) pour être sûr d’appeler le bon backend.

## Référence

- Variables détaillées : `ENV_TEMPLATE.txt` (section Cloudflare R2).
- Configuration R2 et accès public : `R2_PUBLIC_ACCESS_SETUP.md`.
