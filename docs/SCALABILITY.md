# Scalabilité AfriWonder — Support 1M+ utilisateurs connectés

Ce document décrit comment faire tourner AfriWonder sous **charges massives** (plus d’un million d’utilisateurs connectés) **sans crash, sans bug majeur et sans saturation**.

---

## 1. Vue d’ensemble

Pour supporter 1M+ utilisateurs simultanés, il faut :

- **Plusieurs nœuds API** derrière un load balancer (horizontal scaling).
- **Redis** obligatoire en production (cache, rate limiting distribué, adapter Socket.io).
- **Base de données** : pool de connexions maîtrisé + optionnellement PgBouncer et read replicas.
- **Sticky sessions** si le client utilise le fallback HTTP long-polling pour Socket.io.
- **CDN** pour les assets et, si possible, les vidéos.
- **Monitoring** (health, métriques, alertes) pour réagir avant saturation.

Le code actuel est déjà préparé (compression, pool DB configurable, rate limit Redis, adapter Socket.io Redis). Le reste relève de l’**infrastructure et de la configuration**.

---

## 2. Variables d’environnement (production)

À définir sur chaque nœud ou dans le secret manager de la plateforme.

| Variable | Rôle | Recommandation 1M+ users |
|----------|------|---------------------------|
| `DATABASE_URL` | Connexion PostgreSQL | URL principale (ou PgBouncer) |
| `DATABASE_POOL_MAX` | Connexions par processus | 10–25 par instance. Total &lt; `max_connections` du serveur (ou pool PgBouncer) |
| `REDIS_URL` | Cache + rate limit + Socket.io | **Obligatoire** en prod multi-nœuds (ex. `redis://...`) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Tokens auth | Valeurs fortes, identiques sur tous les nœuds |
| `NODE_ENV` | Environnement | `production` |
| `PORT` | Port HTTP | Même port sur toutes les instances (ex. 3000) |
| `CORS_ORIGIN` | Origines autorisées | Domaine(s) front (séparés par des virgules) |

**Exemple :**  
`DATABASE_POOL_MAX=20` avec 50 instances ⇒ jusqu’à 1000 connexions DB. Ajuster selon `max_connections` PostgreSQL ou la limite du pool PgBouncer.

---

## 3. Base de données (PostgreSQL)

- **Pool par processus** : configuré dans `backend/src/config/database.ts` via `DATABASE_POOL_MAX` (défaut prod 20, max 100).
- **PgBouncer (recommandé)** : mettre `DATABASE_URL` vers PgBouncer en mode transaction (ou session si besoin de prepared statements). Ainsi, des centaines de nœuds peuvent partager un pool limité côté Postgres.
- **Read replicas** : pour du read scaling, on peut plus tard ajouter un second client Prisma pointant vers une URL en lecture seule et router les requêtes read-only dessus.
- **Index** : le schéma Prisma contient déjà des index sur les tables chaudes (vidéos, users, likes, etc.). Les migrations sont à appliquer en prod avec `prisma migrate deploy`.

---

## 4. Redis (obligatoire en prod pour 1M+ users)

- **Cache** : leaderboard, health, etc. utilisent Redis si `REDIS_URL` est défini.
- **Rate limiting** : les limiters (auth, payment, upload, général) utilisent un store Redis quand `REDIS_URL` est présent, ce qui évite de dépasser les limites en multi-nœuds.
- **Socket.io** : avec `REDIS_URL`, l’adapter Redis est activé au démarrage ; les événements (messages, lives, appels) sont propagés entre nœuds. Sans Redis, les WebSockets ne sont partagés qu’entre clients connectés au même processus.

En production, prévoir un Redis dédié (ou cluster) avec persistance et haute dispo selon votre hébergeur.

---

## 5. API (Express) — scaling horizontal

- **PM2** : `ecosystem.config.js` utilise `instances: 'max'` et `exec_mode: 'cluster'` pour saturer les CPU d’une machine.
- **Plusieurs machines** : lancer le même binaire (ou image Docker) sur N machines, derrière un **load balancer** (ALB, Nginx, Cloud Load Balancer, etc.).
- **Compression** : le middleware `compression()` est activé pour réduire la bande passante et la latence.
- **Timeouts** : le serveur HTTP a des timeouts longs pour les uploads (5 min), adaptés aux gros fichiers.

---

## 6. WebSockets (Socket.io)

- **Adapter Redis** : si `REDIS_URL` est défini, Socket.io utilise l’adapter Redis au démarrage ; les rooms (user, conversation, live) sont partagées entre tous les nœuds.
- **Sticky sessions** : si les clients utilisent le transport par défaut (polling puis upgrade), le load balancer **doit** envoyer toutes les requêtes d’une même session vers le même nœud (sticky session sur cookie ou identifiant). Sinon, risque de HTTP 400. Avec transport WebSocket seul, une seule connexion TCP par client, le sticky est moins critique mais souvent conservé pour la phase de handshake.

---

## 7. Sécurité et limites (déjà en place)

- **Rate limiting** : général (ex. 600 req/min par IP), auth, payment, upload, admin ; stockage Redis en prod.
- **Helmet, CORS, CSRF** : activés.
- **Anti-bot / anti-spam** : sur commentaires, messages, actualités.

Pour 1M d’utilisateurs, le débit total augmente en ajoutant des nœuds ; les limites par IP restent, ce qui évite les abus tout en permettant le volume.

---

## 8. Checklist déploiement « 1M+ users »

- [ ] **PostgreSQL** : capacité et `max_connections` (ou PgBouncer) suffisants pour `DATABASE_POOL_MAX × nombre de processus total`.
- [ ] **PgBouncer** (recommandé) : `DATABASE_URL` pointe vers PgBouncer.
- [ ] **Redis** : `REDIS_URL` défini et accessible par tous les nœuds API.
- [ ] **Plusieurs nœuds API** : même code, même config, derrière un load balancer.
- [ ] **Sticky sessions** : activées sur le load balancer (cookie Socket.io ou équivalent).
- [ ] **CDN** : front (JS/CSS/images) et si possible flux vidéo pour réduire la charge sur l’origine.
- [ ] **Health checks** : le load balancer interroge `/health` (ou équivalent) pour exclure les nœuds en erreur.
- [ ] **Monitoring** : métriques (CPU, mémoire, connexions DB, erreurs) et alertes (Sentry, Prometheus, etc.).
- [ ] **Secrets** : `JWT_SECRET`, `JWT_REFRESH_SECRET` et clés tierces (Stripe, R2, etc.) gérés de façon sécurisée et identiques sur tous les nœuds.

**Guide pas à pas (Render + Vercel)** : voir **[docs/PRODUCTION_1M_CHECKLIST.md](PRODUCTION_1M_CHECKLIST.md)** pour les étapes concrètes (Redis, DATABASE_POOL_MAX, scaling, sticky, PgBouncer, CDN, monitoring).

---

## 9. Résumé

L’application AfriWonder est prête côté code pour la scalabilité (compression, pool DB, Redis pour cache et rate limit, adapter Socket.io Redis). Pour **supporter plus d’un million d’utilisateurs connectés sans crash ni bug majeur**, il faut déployer une **infrastructure adaptée** : plusieurs nœuds API, Redis, base de données (avec PgBouncer si besoin), load balancer avec sticky sessions, CDN et monitoring. Ce document sert de guide de référence pour cette mise en scale.
