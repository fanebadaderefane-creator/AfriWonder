# Checklist variables d'environnement pour Render

**Alignement avec le local :** les **noms de variables** sont les mêmes que dans `backend/.env` et `backend/.env.example` (notamment `DATABASE_URL` pour Prisma). Sur Render, tu recopies les **mêmes clés** avec les **mêmes valeurs** que ton `.env` local — pas un autre nom (pas de `POSTGRES_URL` à la place de `DATABASE_URL` sauf si tu ajoutes une couche d’alias toi-même).

Coche chaque variable après l'avoir ajoutée dans **Render → ton service → Environment**.

Copie les **valeurs** depuis ton fichier `backend/.env` (ne les note pas ici pour la sécurité).

---

## Obligatoires (sans elles le backend ne fonctionne pas)

- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`
- [ ] `JWT_EXPIRES_IN` (ex: `7d`)
- [ ] `JWT_REFRESH_SECRET`
- [ ] `JWT_REFRESH_EXPIRES_IN` (ex: `30d`)
- [ ] `NODE_ENV` → mettre **`production`**
- [ ] `APP_URL` → mettre l’URL Render du backend (ex: `https://afriwonder-api.onrender.com`)
- [ ] `CORS_ORIGIN` → mettre l’URL du front en prod (ex: `https://afriwonder.vercel.app`)

## R2 (upload vidéo / images – requis pour iPhone & Android)

- [ ] `R2_ENDPOINT`
- [ ] `R2_ACCESS_KEY_ID`
- [ ] `R2_SECRET_ACCESS_KEY`
- [ ] `R2_BUCKET_NAME`
- [ ] `R2_PUBLIC_URL`

## Base de données / cache (si utilisé)

- [ ] `SUPABASE_URL` (si utilisé)
- [ ] `REDIS_URL` — Recommandé en prod (cache + rate limit + Socket.io). Upstash / Redis Cloud / Render Key Value. Voir docs/PRODUCTION_1M_CHECKLIST.md §1. Si absent, pas de cache distribué.
- [ ] `DATABASE_POOL_MAX` — Optionnel. Pour 1M+ users : 20. Voir docs/PRODUCTION_1M_CHECKLIST.md §2.

## Envoi d’emails

- [ ] `SENDGRID_API_KEY`
- [ ] `SENDGRID_FROM_EMAIL`
- [ ] `SMTP_HOST` (optionnel)
- [ ] `SMTP_USER` (optionnel)
- [ ] `SMTP_PASS` (optionnel)

## OAuth (connexion Google / Facebook)

- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_REDIRECT_URI` → **adapter** : `https://TON-BACKEND.onrender.com/api/auth/google/callback`
- [ ] `FACEBOOK_APP_ID`
- [ ] `FACEBOOK_APP_SECRET`
- [ ] `FACEBOOK_REDIRECT_URI` → **adapter** : `https://TON-BACKEND.onrender.com/api/auth/facebook/callback`

## Paiement (Orange Money)

- [ ] `ORANGE_MONEY_MERCHANT_ID`
- [ ] `ORANGE_MONEY_AGENT_CODE`
- [ ] `ORANGE_MONEY_ENV` (ex: `test` ou `production`)
- [ ] `ORANGE_MONEY_CLIENT_ID` (si rempli en local)
- [ ] `ORANGE_MONEY_CLIENT_SECRET` (si rempli en local)
- [ ] `ORANGE_MONEY_API_KEY` (si rempli en local)

## Firebase (notifications push)

- [ ] `FCM_PROJECT_ID`
- [ ] `FCM_PRIVATE_KEY_ID`
- [ ] `FCM_CLIENT_EMAIL`
- [ ] `FCM_CLIENT_ID`
- [ ] `FCM_PRIVATE_KEY`

## Admin & sécurité

- [ ] `SUPER_ADMIN_EMAIL`
- [ ] `ENCRYPTION_SECRET`
- [ ] `WALLET_PIN_SALT`
- [ ] `HEALTH_API_KEY`
- [ ] `INTERNAL_SECRET`

## Marketplace

- [ ] `MARKETPLACE_PHASE1_NO_PAYMENT` (ex: `true`)

## Live (Agora)

- [ ] `AGORA_APP_ID`
- [ ] `AGORA_APP_CERTIFICATE`
- [ ] `STREAM_SECRET`

## Monitoring & alertes

- [ ] `SENTRY_DSN`
- [ ] `ADMIN_EMAIL`
- [ ] `ADMIN_PHONE`

## Optionnel

- [ ] `BACKUP_DIR` (ex: `./backups`)

---

**Rappel :** Remplace `TON-BACKEND` dans les URI Google/Facebook par l’URL réelle de ton backend Render (sans `https://` pour la partie host si tu préfères, mais l’URI complète doit être en `https://`).
