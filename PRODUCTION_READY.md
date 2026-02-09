# AfriConnect — Production Ready

Checklist et actions pour déployer en production.

---

## 1. Backend

### Variables obligatoires (NODE_ENV=production)

- `DATABASE_URL` — Connexion PostgreSQL
- `JWT_SECRET` — Secret JWT (min. 32 caractères)
- `JWT_REFRESH_SECRET` — Secret refresh token

### Recommandé

- `CORS_ORIGIN` — URL du frontend (ex. `https://app.africonnect.com`)
- `APP_URL` — URL publique du backend (callbacks, liens dans les mails)
- `PORT` — Port d’écoute (défaut 3000)
- `CRON_SECRET` ou `EVENTS_REMINDERS_SECRET` — Pour sécuriser le cron des rappels événements
- `HEALTH_API_KEY` — Pour protéger `GET /health/errors`
- Paiements : `ORANGE_MONEY_*`, `STRIPE_*` selon les moyens activés
- Stockage : `R2_*` ou `AWS_*` pour les uploads
- Live : `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` pour le streaming réel

### Health checks

- `GET /health` — Liveness (répond ok)
- `GET /health/ready` — Readiness (vérifie la connexion DB)
- `GET /health/errors` — Résumé des erreurs (protéger par `X-Health-Key: HEALTH_API_KEY` en prod)

### Démarrage

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
NODE_ENV=production node dist/index.js
```

---

## 2. Frontend

### Variables

- `VITE_API_URL` — URL de l’API (ex. `https://api.africonnect.com/api`)
- `VITE_WS_URL` — URL WebSocket (ex. `wss://api.africonnect.com`)

En dev, les défauts sont `http://localhost:3000/api` et `ws://localhost:3000`.

### Build

```bash
npm ci
npm run build
```

Les fichiers sont dans `dist/`. Déployer sur Vercel, Netlify, S3+CloudFront, etc.

---

## 3. Cron / Jobs

### Rappels événements (24h et 1h avant)

À exécuter régulièrement (ex. toutes les heures) :

```bash
curl -X POST "https://api.africonnect.com/api/events/cron/send-reminders" \
  -H "X-Cron-Secret: VOTRE_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Ou utiliser le script : `backend/scripts/cron-reminders-events.sh` (définir `API_URL` et `CRON_SECRET`).

### Cleanup viewers Live

Pour chaque live actif, appeler (avec auth) :

```http
POST /api/live/:id/cleanup-viewers
Authorization: Bearer <token>
```

À planifier toutes les 1–2 minutes pour les streams actifs.

### News / Média

- **Trending** : `POST /api/news/cron/calculate-trending` (header `X-Cron-Secret`) — ex. toutes les heures. Script : `backend/scripts/cron-news-trending.sh`
- **Breaking expirées** : `POST /api/news/cron/expire-breaking` — ex. toutes les 15 min. Script : `backend/scripts/cron-news-expire-breaking.sh`

---

## 4. Sécurité

- Ne jamais commiter `.env` ou secrets.
- En production, ne pas utiliser de valeurs par défaut pour les clés (R2, JWT, etc.).
- Cookies auth : `secure: true`, `sameSite: 'lax'` (déjà géré si `NODE_ENV=production`).
- Rate limits : activés sur `/api/` (200 req / 15 min) + limites spécifiques (réservations, cadeaux, chat).

---

## 5. Fichiers utiles

- **`docs/ENV_REFERENCE.md`** — Référence A–Z de toutes les clés (backend + frontend)
- `backend/.env.example` — Template variables backend
- `.env.example` (racine) — Template variables frontend (Vite)
- `backend/ENV_TEMPLATE.txt` — Liste détaillée backend avec commentaires
- `DEPLOIEMENT.md` — Checklist déploiement
- `VERIFICATION_MODULES.md` — État des modules (Orders, Events, Live)

---

## 6. Résumé des modules prêts

- **Orders** : commandes, litiges, suivi, facture PDF
- **Events** : billetterie, mise en avant payante, analytics, chat, amis inscrits, rappels
- **Live** : viewers réels, cadeaux (wallet), modération, like, top donateurs, recharge wallet, notif “live started”, replay_url, token Agora

Une fois les env et cron configurés, l’application est prête pour la production.
