# Déploiement production — AfriWonder

Guide pour déployer le backend et le frontend AfriWonder en production, avec scaling et observabilité.

---

## 1. Variables d’environnement obligatoires

Sans ces variables, l’application ne démarre pas correctement en production.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL (Supabase, Neon, etc.) |
| `JWT_SECRET` | Secret JWT (min. 32 caractères, aléatoire) |
| `JWT_REFRESH_SECRET` | Secret refresh token (différent de JWT_SECRET) |
| `NODE_ENV` | Mettre `production` |
| `APP_URL` | URL publique du backend (ex. `https://api.afriwonder.com`) |
| `CORS_ORIGIN` | URL(s) du frontend autorisées (ex. `https://afriwonder.com`) |

Références détaillées :

- Backend : `backend/ENV_TEMPLATE.txt`
- Render : `backend/RENDER_ENV_CHECKLIST.md`

---

## 2. Redis (recommandé pour la production)

En production, **Redis** est utilisé pour :

- **Rate limiting distribué** : même limite par IP / utilisateur sur toutes les instances.
- **Cache** : feed, leaderboard, etc. (si `responseCache` / `cacheGet`/`cacheSet` sont utilisés).
- **Socket.io** : synchronisation des WebSockets entre plusieurs nœuds (multi-instances).

Sans `REDIS_URL` :

- Le rate limiting et le cache restent en **mémoire locale** (par instance).
- Socket.io ne fonctionne qu’avec **une seule instance** (pas de scaling horizontal).

À définir :

- `REDIS_URL` : ex. `redis://default:xxx@redis-xxx.upstash.io:6379` (Upstash, Redis Cloud, Railway, etc.)

---

## 3. Scaling horizontal (plusieurs instances)

Pour supporter une **montée en charge** (plusieurs dizaines de milliers d’utilisateurs) :

1. **Plusieurs instances du backend** : derrière un load balancer (Render, Railway, K8s, etc.).
2. **Redis obligatoire** :
   - Rate limit partagé entre instances.
   - Adapter Socket.io partagé (voir `backend/src/index.ts` : adapter Redis pour Socket.io).
3. **Base de données** : pool de connexions adapté. Avec Supabase/Supavisor (mode session), garder un **petit pool** (ex. 2–5) par instance. Variable optionnelle : `DATABASE_POOL_MAX`.
4. **Graceful shutdown** : déjà en place (SIGTERM/SIGINT) pour que le load balancer retire proprement une instance.

Référence : `backend/src/index.ts` (graceful shutdown, Redis adapter Socket.io), `backend/src/middleware/rateLimiting.ts` (Redis store).

---

## 4. Santé et observabilité

| Endpoint | Usage |
|----------|--------|
| `GET /health` | Liveness (réponse OK, pas de DB). |
| `GET /health/ready` | Readiness (vérifie la connexion DB). Retourne 503 si DB indisponible. |
| `GET /metrics` | Métriques Prometheus (compteurs, latences). À protéger en prod avec `HEALTH_API_KEY` (header `X-Health-Key` ou query `key`). |
| `GET /health/errors` | Résumé des erreurs récentes (optionnel, protégé par `HEALTH_API_KEY`). |

En production :

- Configurer le load balancer / K8s pour utiliser `/health` et `/health/ready` (probes).
- Protéger `/metrics` et `/health/errors` avec `HEALTH_API_KEY`.
- Exposer les métriques à un outil (Prometheus, Datadog, etc.) pour alertes (taux d’erreur, latence).

Détails : `backend/docs/OBSERVABILITY.md`.

---

## 5. Frontend (Vercel / autre)

- **Variables** : `VITE_API_URL` doit pointer vers l’URL du backend en production (ex. `https://api.afriwonder.com`).
- **CORS** : `CORS_ORIGIN` côté backend doit inclure l’URL du front (ex. `https://afriwonder.vercel.app`).

---

## 6. Checklist rapide

- [ ] `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production`, `APP_URL`, `CORS_ORIGIN`
- [ ] `REDIS_URL` (recommandé pour rate limit + cache + Socket.io multi-nœuds)
- [ ] R2 ou stockage pour uploads (voir `RENDER_ENV_CHECKLIST.md`)
- [ ] `HEALTH_API_KEY` pour protéger `/metrics` et `/health/errors`
- [ ] Load balancer / orchestrateur configuré sur `/health` et `/health/ready`
- [ ] Frontend : `VITE_API_URL` = URL du backend

---

*Document créé pour la phase 2 (consolidation). Dernière mise à jour : mars 2025.*
