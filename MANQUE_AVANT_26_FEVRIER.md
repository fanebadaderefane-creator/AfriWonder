# Il manque quoi avant le 26 février ?

## Ce que **MOI (le code)** je ne peux PAS faire — **TOI tu dois**

| # | À faire | Détail |
|---|---------|--------|
| 1 | **Contrats paiement** | Signer avec Orange Money, Wave, MTN (Mali) pour avoir les clés API production. |
| 2 | **Stripe** | Finir KYC sur dashboard.stripe.com, récupérer clé secrète + webhook signing secret. |
| 3 | **Hébergement** | Avoir un serveur ou cloud (VPS, AWS, OVH, etc.) avec PostgreSQL + Redis. |
| 4 | **Base de données** | Créer une DB PostgreSQL prod, mettre `DATABASE_URL` dans .env, lancer `npx prisma migrate deploy`. |
| 5 | **Redis** | Installer Redis (ou service managé), mettre `REDIS_URL` dans .env. |
| 6 | **HTTPS / domaine** | Avoir un domaine (ex. africonnect.com) + certificat SSL (Cloudflare gratuit ou Let’s Encrypt). |
| 7 | **Sentry** | Créer un compte sur sentry.io, créer un projet Node, copier le DSN dans `SENTRY_DSN`. |
| 8 | **Uptime Robot** | Créer un compte, ajouter un monitor sur `https://ton-api/health`, configurer alerte SMS/email. |
| 9 | **Backups** | Installer le cron (3x/jour) sur le serveur avec le script `backend/scripts/cron-backup-3x-daily.sh`. |
| 10 | **Légal** | CGU/CGV validées par un avocat si tu veux être couvert. |

---

## Ce que **MOI (le code)** j’ai fait ou je peux faire

- Rate limiting 10 req/s, webhooks exclus, Stripe webhook avec signature.
- Idempotence paiements, rollback doc, backups script 3x/jour.
- Sentry intégré, health/ready, index DB, Docker (backend + front), CI/CD.
- Tests QA (auth, vidéos, panier, commandes, paiements, admin, sécurité, health, communautés).
- Checklist prod, doc ENV prod, template .env.

Tout le reste côté **code, config projet et docs** est prêt.

---

## Fichiers utiles déjà dans le projet

- **Variables prod** : `docs/ENV_PRODUCTION.md` et `backend/ENV_TEMPLATE.txt`
- **Checklist complète** : `CHECKLIST_PRODUCTION_26_FEV_2026.md`
- **Rollback** : `docs/ROLLBACK_RAPIDE.md`
- **Backup 3x/jour** : `backend/scripts/cron-backup-3x-daily.sh`
- **Tests** : `cd backend && npm run test:coverage`
- **Vérif env avant prod** : `cd backend && npm run check:prod-env` (affiche ce qui manque)

---

## En résumé

- **Il manque** : contrats paiement, hébergement, DB/Redis, domaine/HTTPS, Sentry, Uptime Robot, cron backups, et éventuellement légal. Tout ça, **c’est toi** (ou ton hébergeur / prestataire).
- **Je peux tout faire** : oui, **tout ce qui est dans le repo** (code, config, scripts, docs). Le reste dépend de toi.

Dès que les 10 points ci‑dessus sont faits, tu peux passer en production le 26 février.
