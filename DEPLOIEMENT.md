# Checklist déploiement — AfriConnect

À valider avant mise en production.

---

## 1. Variables d’environnement

### Backend

- `DATABASE_URL` — PostgreSQL (Supabase ou autre)
- `JWT_SECRET` — secret pour les tokens auth
- `CORS_ORIGIN` — origine frontend (ex. `https://app.africonnect.com`)
- `APP_URL` — URL publique du backend (pour callbacks)

### Paiements

- **Orange Money** : `ORANGE_MONEY_MERCHANT_ID`, `ORANGE_MONEY_API_KEY`, `ORANGE_MONEY_API_URL` (si utilisé pour events + recharge wallet)
- **Stripe** (optionnel) : `STRIPE_SECRET_KEY`

### Live / streaming

- **Agora** (optionnel) : `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` pour tokens RTC réels
- Sinon : `STREAM_SECRET` ou `AGORA_APP_SECRET` pour token HMAC de secours

### Cron / jobs

- `CRON_SECRET` ou `EVENTS_REMINDERS_SECRET` — pour `POST /api/events/cron/send-reminders`
- Planifier :
  - **Rappels événements** (24h et 1h avant) : utiliser `backend/scripts/cron-reminders-events.sh` ou :
    ```bash
    curl -X POST "${API_URL}/api/events/cron/send-reminders" -H "X-Cron-Secret: ${CRON_SECRET}"
    ```
  - **Cleanup viewers Live** : `POST /api/live/:id/cleanup-viewers` périodique (ex. toutes les 1–2 min) pour chaque live actif — voir `backend/scripts/cron-cleanup-live-viewers.sh`
- Doc détaillée : `PRODUCTION_READY.md`

### Notifications

- Push (Firebase) : config Firebase Admin côté backend si utilisé
- SMS (optionnel) : `SMS_PROVIDER`, `TWILIO_*` ou équivalent

---

## 2. Base de données

- [ ] Toutes les migrations Prisma appliquées : `npx prisma migrate deploy`
- [ ] Client généré : `npx prisma generate`
- [ ] Vérifier que les index existent (events, live, orders) pour les perfs

---

## 3. Build & run backend

- [ ] `npm run build` (ou `tsc`) sans erreur
- [ ] `npm start` (ou `node dist/index.js`) — pas de crash au démarrage
- [ ] Health check ou `GET /api/...` une route publique pour confirmer que l’API répond

---

## 4. Build & run frontend

- [ ] `npm run build` (Vite) sans erreur
- [ ] Variables d’env frontend (ex. `VITE_API_URL`) pointant vers l’API de prod
- [ ] Hébergement : Vercel / Netlify / S3+CloudFront / autre, avec redirection SPA si besoin

---

## 5. Routes sensibles

- [ ] Rate limits activés (réservations events, cadeaux live, chat live)
- [ ] Routes admin / cron protégées par secret ou auth
- [ ] Pas de logs de tokens ou mots de passe

---

## 6. Post-déploiement

- [ ] Créer un compte test et vérifier : login, un ordre, une réservation event, un live (démarrage, viewer, cadeau, fin)
- [ ] Vérifier un rappel event (cron) et un cleanup viewers live si configurés
- [ ] Vérifier recharge wallet + callback (ou webhook) si activé

---

## 7. Optionnel

- **CDN** : pour assets frontend et éventuellement HLS si streaming
- **Redis** : pour rate limits et cache (viewers_count, etc.) en haute charge
- **Monitoring** : logs structurés, alertes (erreurs 5xx, taux d’erreur paiement)

---

*À adapter selon votre hébergeur (Railway, Render, Vercel, etc.) et votre stack exacte.*
