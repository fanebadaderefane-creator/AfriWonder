# AfriConnect — Référence complète des variables d'environnement

Document unique listant **toutes** les clés utilisées dans le projet (backend + frontend), de A à Z.

---

## Où sont les fichiers

| Fichier | Rôle |
|--------|------|
| **`.env.example`** (racine) | Template **frontend** (Vite) — copier en `.env` ou `.env.local` |
| **`backend/.env.example`** | Template **backend** — copier en `backend/.env` |
| **`backend/ENV_TEMPLATE.txt`** | Liste détaillée backend avec commentaires |
| **`env.local.CONFIGURER`** / **`TEMPLATE_ENV.txt`** | Anciens templates Base44 / config |

**Ne jamais commiter** les fichiers `.env` ou `.env.local` (ils contiennent des secrets).

---

## 1. Backend — Variables utilisées dans le code

### Obligatoires (production)

| Variable | Utilisation | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | Connexion PostgreSQL (Prisma) | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Signature des tokens JWT (auth) | Min. 32 caractères |
| `JWT_REFRESH_SECRET` | Signature des refresh tokens | Différent de JWT_SECRET |

### Serveur & CORS

| Variable | Utilisation | Défaut |
|----------|-------------|--------|
| `PORT` | Port d'écoute du serveur | `3000` |
| `NODE_ENV` | `development` \| `test` \| `production` | — |
| `APP_URL` | URL publique du backend (callbacks, Swagger, liens mails) | `http://localhost:3000` |
| `CORS_ORIGIN` | Origine autorisée (URL du frontend) | `http://localhost:5173` |

### JWT (optionnel)

| Variable | Utilisation | Défaut |
|----------|-------------|--------|
| `JWT_EXPIRES_IN` | Expiration access token | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | Expiration refresh token | `30d` |

### Base de données

| Variable | Utilisation |
|----------|-------------|
| `DATABASE_URL` | Seule variable DB (Prisma) |

### Auth sociale (Google / Facebook)

| Variable | Utilisation |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth Google |
| `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `GOOGLE_REDIRECT_URI` | Callback Google (ex. `http://localhost:3000/api/auth/google/callback`) |
| `FACEBOOK_APP_ID` | OAuth Facebook (code utilise aussi `FACEBOOK_APP_ID`) |
| `FACEBOOK_APP_SECRET` | OAuth Facebook |
| `FACEBOOK_REDIRECT_URI` | Callback Facebook |

### Paiements

| Variable | Utilisation |
|----------|-------------|
| **Orange Money** | |
| `ORANGE_MONEY_MERCHANT_ID` | Ou `VITE_ORANGE_MERCHANT_ID` (lu côté backend si passé) |
| `ORANGE_MONEY_API_KEY` | Ou `VITE_ORANGE_API_KEY` |
| `ORANGE_MONEY_API_URL` | Base API Orange (défaut `https://api.orange.ml`) |
| `ORANGE_MONEY_CLIENT_ID` | Si flux OAuth Orange utilisé |
| `ORANGE_MONEY_CLIENT_SECRET` | |
| `ORANGE_MONEY_TRANSFER_API_KEY` | Transferts / retraits (défaut = ORANGE_MONEY_API_KEY) |
| **Stripe** | |
| `STRIPE_SECRET_KEY` | Paiements Stripe |
| `STRIPE_PUBLISHABLE_KEY` | (souvent utilisé côté frontend via VITE_) |
| `STRIPE_WEBHOOK_SECRET` | Webhooks Stripe |
| **MTN Mobile Money** | |
| `MTN_MOBILE_MONEY_API_KEY` | |
| `MTN_MOBILE_MONEY_SUBSCRIPTION_KEY` | |
| **Wave** | |
| `WAVE_API_KEY` | |
| **Flutterwave** | |
| `FLUTTERWAVE_SECRET_KEY` | |
| **Paystack** | |
| `PAYSTACK_SECRET_KEY` | |

### Stockage (fichiers)

| Variable | Utilisation |
|----------|-------------|
| **Cloudflare R2** | |
| `R2_ENDPOINT` | Ex. `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | |
| `R2_SECRET_ACCESS_KEY` | |
| `R2_BUCKET_NAME` | Défaut `africonnect` |
| `R2_PUBLIC_URL` | URL publique du bucket (ex. `https://pub-xxx.r2.dev`) |
| **AWS S3** (alternatif) | |
| `AWS_ACCESS_KEY_ID` | |
| `AWS_SECRET_ACCESS_KEY` | |
| `AWS_REGION` | Ex. `us-east-1` |
| `AWS_S3_BUCKET` | Ex. `africonnect-uploads` |

### Live streaming (Agora)

| Variable | Utilisation |
|----------|-------------|
| `AGORA_APP_ID` | Tokens RTC réels |
| `AGORA_APP_CERTIFICATE` | |
| `STREAM_SECRET` ou `AGORA_APP_SECRET` | Fallback HMAC si Agora non configuré (défaut `dev-secret`) |

### Cron & health

| Variable | Utilisation |
|----------|-------------|
| `CRON_SECRET` ou `EVENTS_REMINDERS_SECRET` | Header `X-Cron-Secret` pour `POST /api/events/cron/send-reminders` |
| `HEALTH_API_KEY` | Header `X-Health-Key` pour `GET /health/errors` |
| `CANCELLATION_DEADLINE_HOURS` | Délai annulation commande (heures), défaut `24` |

### Notifications & SMS

| Variable | Utilisation |
|----------|-------------|
| `SMS_PROVIDER` | `twilio` \| `africas_talking` \| `orange` \| `none` |
| `TWILIO_ACCOUNT_SID` | Si SMS_PROVIDER=twilio |
| `TWILIO_AUTH_TOKEN` | |
| `TWILIO_PHONE_NUMBER` | |
| `SMS_ORDER_NOTIFICATIONS` | `true` pour activer les SMS commandes |
| **Firebase (FCM)** | |
| `FCM_PROJECT_ID` | Push notifications |
| `FCM_PRIVATE_KEY_ID` | Compte de service Firebase |
| `FCM_PRIVATE_KEY` | (clé privée, souvent multiligne) |
| `FCM_CLIENT_EMAIL` | |
| `FCM_CLIENT_ID` | |
| `FCM_SERVER_KEY` | (legacy, si utilisé ailleurs) |

### Email

| Variable | Utilisation |
|----------|-------------|
| `SENDGRID_API_KEY` | Envoi d’emails |
| `SENDGRID_FROM_EMAIL` | Ex. `noreply@africonnect.app` |

### Fraude & limites

| Variable | Utilisation | Défaut |
|----------|-------------|--------|
| `FRAUD_MAX_PAYMENT_AMOUNT` | Montant max paiement (XOF) | 5_000_000 |
| `FRAUD_MAX_FAILED_LAST_HOUR` | Échecs max / heure | 5 |
| `FRAUD_MAX_SUCCESS_WINDOW_MIN` | Fenêtre (min) | 15 |
| `FRAUD_MAX_SUCCESS_IN_WINDOW` | Succès max dans la fenêtre | 10 |

### Backup & monitoring

| Variable | Utilisation |
|----------|-------------|
| `BACKUP_DIR` | Dossier des backups (défaut `backups`) |
| `BACKUP_FROM` | (script backup-export) |
| `BACKUP_TO` | |
| `ERROR_WEBHOOK_URL` ou `ERROR_MONITORING_WEBHOOK` | Webhook envoi erreurs |
| `SENTRY_DSN` | Sentry (optionnel) |

### Plateforme & tests

| Variable | Utilisation |
|----------|-------------|
| `PLATFORM_USER_ID` | UUID du compte « plateforme » (revenus), défaut UUID nul |
| `RATE_LIMIT_WINDOW_MS` | Fenêtre rate limit (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | Nombre max requêtes par fenêtre |

### Supabase (optionnel)

| Variable | Utilisation |
|----------|-------------|
| `SUPABASE_URL` | Si auth Supabase utilisée |
| `SUPABASE_ANON_KEY` | |

### Scripts (usage ponctuel)

| Variable | Utilisation |
|----------|-------------|
| `R2_DIRECT_PUBLIC_URL` | Script `fix-video-url-with-r2-direct.ts` |

---

## 2. Frontend — Variables (Vite / React)

Toutes les variables exposées au client doivent être préfixées par **`VITE_`** (ou `REACT_APP_` pour certains anciens usages).

### Obligatoires en production

| Variable | Utilisation | Exemple |
|----------|-------------|---------|
| `VITE_API_URL` | URL de l’API backend | `https://api.africonnect.com/api` |
| `VITE_WS_URL` | URL WebSocket | `wss://api.africonnect.com` |

### Optionnel

| Variable | Utilisation |
|----------|-------------|
| `VITE_BASE44_APP_ID` | Base44 |
| `VITE_BASE44_APP_BASE_URL` | Base44 |
| `VITE_BASE44_FUNCTIONS_VERSION` | Base44 (ex. `v1`) |
| `VITE_WS_URL` / `REACT_APP_WS_URL` | WebSocket (fallback) |
| `VITE_VAPID_PUBLIC_KEY` / `REACT_APP_VAPID_PUBLIC_KEY` | Push (clé publique) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe (clé publique) |
| `VITE_SENTRY_DSN` | Sentry frontend |
| `VITE_ORANGE_MERCHANT_ID` | Affiché / passé au backend (ne pas mettre de secret) |
| `VITE_ORANGE_API_KEY` | (Backend peut le lire aussi — éviter en prod côté front) |
| `REACT_APP_ORANGE_MERCHANT_ID` | Legacy |
| `REACT_APP_ORANGE_API_KEY` | Legacy |
| `REACT_APP_API_URL` | Fallback API (MobileMoneyPayment, etc.) |
| `REACT_APP_ENV` / `VITE_REACT_APP_ENV` | Mode (development / production) |

---

## 3. Résumé par fichier à créer

### Backend : `backend/.env`

À partir de **`backend/.env.example`** ou **`backend/ENV_TEMPLATE.txt`** :

- **Requis** : `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- **Recommandé** : `PORT`, `NODE_ENV`, `APP_URL`, `CORS_ORIGIN`
- **Optionnel** : tout le reste selon les modules (Orange Money, Stripe, R2, Agora, FCM, SendGrid, OAuth, cron, health, etc.)

### Frontend : `.env` ou `.env.local` (à la racine)

À partir de **`.env.example`** (racine) :

- **Requis en prod** : `VITE_API_URL`, `VITE_WS_URL`
- **Optionnel** : Base44, Stripe pub key, VAPID, Sentry, Orange (éviter les secrets)

---

## 4. Vérification rapide

- **Backend** : en `NODE_ENV=production`, le serveur vérifie `DATABASE_URL` et `JWT_SECRET` (sinon `process.exit(1)`).
- **Frontend** : en production, si `VITE_API_URL` est absent, un `console.error` est affiché (voir `src/main.jsx`).

Pour la liste détaillée des étapes de déploiement : **`PRODUCTION_READY.md`** et **`DEPLOIEMENT.md`**.
