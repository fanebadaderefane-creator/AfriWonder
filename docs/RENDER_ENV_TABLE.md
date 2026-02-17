# Tableau des variables d'environnement — Render (Backend AfriWonder)

À remplir dans **Render** → **Environment Variables** pour le Web Service backend.

---

## 🔴 OBLIGATOIRES (sans elles, le backend ne démarre pas)

| Variable | Valeur | Où la trouver |
|----------|--------|---------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Render → PostgreSQL → **Internal Database URL** (après création de la DB) |
| `JWT_SECRET` | Chaîne secrète min. 32 caractères | Générer : `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Chaîne secrète différente, min. 32 caractères | Générer : `openssl rand -base64 32` |
| `NODE_ENV` | `production` | Fixe |

---

## 🟠 RECOMMANDÉES (CORS, URLs, auth)

| Variable | Valeur | Notes |
|----------|--------|-------|
| `CORS_ORIGIN` | `https://afri-wonder.vercel.app` | URL de ton frontend Vercel. **Obligatoire** si `VITE_API_URL` pointe vers Render. Plusieurs URLs séparées par des virgules. Jamais `*` (incompatible avec credentials). |
| `APP_URL` | `https://afriwonder-backend.onrender.com` | URL de ton backend Render (après déploiement) |
| `PORT` | *(laisser vide)* | Render injecte automatiquement |

---

## 🟡 OPTIONNELLES (fonctionnalités avancées)

| Variable | Valeur | Utilité |
|----------|--------|---------|
| `MARKETPLACE_PHASE1_NO_PAYMENT` | `true` | Pas de paiement intégré, contact vendeur direct |
| `SUPER_ADMIN_EMAIL` | `ton-email@gmail.com` | Email pour accéder au centre admin |
| `REDIS_URL` | *(vide pour commencer)* | Cache Redis — optionnel, fallback en mémoire |
| `SENTRY_DSN` | *(vide)* | Monitoring erreurs |
| `HEALTH_API_KEY` | *(vide)* | Clé pour /health/errors (optionnel) |

---

## 🟢 OPTIONNELLES (OAuth, paiements, etc.)

| Variable | Valeur | Utilité |
|----------|--------|---------|
| `GOOGLE_CLIENT_ID` | *(vide)* | Connexion Google |
| `GOOGLE_CLIENT_SECRET` | *(vide)* | Connexion Google |
| `GOOGLE_REDIRECT_URI` | `https://ton-backend.onrender.com/api/auth/google/callback` | Callback OAuth Google |
| `FACEBOOK_APP_ID` | *(vide)* | Connexion Facebook |
| `FACEBOOK_APP_SECRET` | *(vide)* | Connexion Facebook |
| `FACEBOOK_REDIRECT_URI` | `https://ton-backend.onrender.com/api/auth/google/callback` | Callback OAuth Facebook |
| `ORANGE_MONEY_*` | *(vide)* | Paiements Orange Money |
| `STRIPE_SECRET_KEY` | *(vide)* | Paiements Stripe |
| `R2_*` / `AWS_*` | *(vide)* | Stockage fichiers (R2/S3) |
| `AGORA_*` | *(vide)* | Live streaming |
| `SENDGRID_API_KEY` | *(vide)* | Emails |

---

## 📋 Configuration Render (rappel)

| Paramètre | Valeur |
|-----------|--------|
| **Root Directory** | *(vide)* |
| **Dockerfile Path** | `Dockerfile.backend` ⚠️ **OBLIGATOIRE** — sinon Render utilise le Dockerfile frontend (nginx) et le déploiement échoue |
| **Instance Type** | Free (pour commencer) |
| **Region** | Oregon (US West) ou Frankfurt (EU) |

### ⚠️ Erreur « Port scan timeout » / « failed to detect open port 3000 »

Si tu vois cette erreur, Render utilise le **mauvais Dockerfile** (celui du frontend nginx). Corrige :

1. **Render Dashboard** → **AfriWonder** → **Settings** → **Build & Deploy**
2. Section **Docker** → **Dockerfile Path** → saisir `Dockerfile.backend`
3. **Save Changes** puis **Manual Deploy** → **Deploy latest commit**
4. Si `PORT` est défini manuellement dans Environment, **supprime-le** (Render injecte `PORT=10000`)

---

## 🔗 Après le déploiement

1. Récupère l’URL du backend Render (ex. `https://afriwonder-backend.onrender.com`)
2. Mets à jour `vercel.json` : remplacer `afriwonder-production.up.railway.app` par ton URL Render
3. Push sur GitHub pour redéployer Vercel
