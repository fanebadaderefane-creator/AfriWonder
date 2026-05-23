# Checklist production 1M+ users — Pas à pas

Ce guide vous aide à appliquer **concrètement** la checklist du document [SCALABILITY.md](./SCALABILITY.md) pour préparer AfriWonder à plus d’un million d’utilisateurs (Render + Vercel).

---

## 1. Mettre Redis en prod et définir `REDIS_URL`

### Pourquoi
Redis est utilisé pour le cache, le rate limiting distribué et l’adapter Socket.io. Sans Redis, en multi-instances les limites ne sont pas partagées et les WebSockets ne fonctionnent pas entre nœuds.

### Options (choisir une)

| Fournisseur | Avantage | Obtenir l’URL |
|-------------|----------|----------------|
| **Upstash** | Gratuit (tier free), serverless, compatible Redis | [upstash.com](https://upstash.com) → Create Database → copier `UPSTASH_REDIS_REST_URL` ou l’URL Redis (format `rediss://...` ou `redis://...`) |
| **Redis Cloud** | Managed, haute dispo | [redis.com/try-free](https://redis.com/try-free) → créer une base → copier l’URL de connexion |
| **Render / autre PaaS** | Si le backend est sur Render (ou équivalent) | Render → **Key Value** (Redis) ou Upstash → Variables → `REDIS_URL` |

### Étapes

1. Créer une base Redis chez le fournisseur choisi.
2. Récupérer l’URL (souvent `redis://default:motdepasse@host:port` ou `rediss://...` pour TLS).
3. **Render** : Dashboard → votre service backend → **Environment** → ajouter :
   - **Key** : `REDIS_URL`
   - **Value** : coller l’URL (sans espaces).
4. Redéployer le service (ou attendre le prochain déploiement).

**Vérification** : après déploiement, dans les logs Render vous devez voir :
- `✅ Cache Redis initialisé`
- `✅ Socket.io Redis adapter activé (multi-nœuds)`

---

## 2. Définir `DATABASE_POOL_MAX`

### Pourquoi
Limite le nombre de connexions PostgreSQL par processus. Avec plusieurs instances, le total = `DATABASE_POOL_MAX` × nombre d’instances. Il ne doit pas dépasser `max_connections` de Postgres (ou le pool PgBouncer).

### Étapes

1. **Render** : Dashboard → votre service backend → **Environment**.
2. Ajouter (ou modifier) :
   - **Key** : `DATABASE_POOL_MAX`
   - **Value** : `20` (recommandé pour la prod ; max 100 dans le code).
3. Si vous utilisez **PgBouncer** (voir §5), vous pouvez mettre 20–25 par instance. Sinon, vérifier la limite de votre Postgres (souvent 100) et garder `DATABASE_POOL_MAX × nombre d’instances` < cette limite.

**Exemple** : 5 instances × 20 = 100 connexions max. Si votre Postgres a `max_connections = 100`, c’est la limite ; sinon envisager PgBouncer.

---

## 3. Déployer plusieurs nœuds API derrière un load balancer

### Sur Render (recommandé pour votre stack)

1. **Render** : Dashboard → votre service backend → **Settings** → **Scaling**.
2. **Instance Count** : passer de 1 à **2** (ou plus, selon le trafic). Render répartit automatiquement les requêtes entre les instances (load balancer intégré).
3. Sauvegarder. Render redéploie et le trafic est réparti.

**Important** : pour que Socket.io fonctionne correctement avec plusieurs instances, il faut soit :
- que **Redis soit configuré** (`REDIS_URL` défini, voir §1), **et**
- activer les **sticky sessions** si votre plateforme le propose (voir §4).

### Si vous hébergez vous-même (VPS / VM)

- Lancer plusieurs processus backend (ex. PM2 avec `instances: 'max'` ou plusieurs machines).
- Mettre un **reverse proxy** (Nginx ou Caddy) devant qui fait le load balancing. Voir le fichier **`docs/nginx-loadbalancer.conf`** (créé dans ce repo) pour un exemple avec sticky sessions.

---

## 4. Activer les sticky sessions (pour Socket.io)

### Pourquoi
Socket.io commence souvent par du HTTP long-polling puis passe en WebSocket. Si chaque requête peut aller sur une instance différente, la session peut échouer (HTTP 400). Les sticky sessions font que toutes les requêtes d’un même client vont vers la même instance.

### Sur Render

- Render gère le load balancing mais **ne propose pas toujours les sticky sessions** dans l’interface. Vérifier dans **Settings** du service s’il existe une option du type « Sticky Sessions » ou « Session Affinity » et l’activer.
- Si ce n’est pas disponible : avec **Redis + adapter Socket.io** (§1), les messages sont propagés entre nœuds ; le handshake initial peut encore échouer si le client change d’instance. En pratique, beaucoup de clients passent vite en WebSocket ; pour une stabilité maximale, déployer derrière un proxy qui gère le sticky (voir ci‑dessous).

### Si vous utilisez Nginx (self‑hosted)

Un exemple de configuration est dans **`docs/nginx-loadbalancer.conf`** : utilisation de `hash $cookie_io` ou `ip_hash` pour envoyer le même client toujours vers le même backend.

### Côté client (optionnel)

Pour réduire la dépendance au polling, vous pouvez forcer le transport WebSocket uniquement (une seule connexion = moins sensible au changement d’instance) :

```js
// Exemple où vous initialisez Socket.io côté front
import { io } from 'socket.io-client';
const socket = io(apiUrl, { transports: ['websocket'] });
```

Cela évite le polling ; le premier contact doit quand même atteindre la même instance si vous utilisez du polling au début. Avec Redis adapter, une fois en WebSocket les événements sont bien propagés entre nœuds.

---

## 5. Utiliser PgBouncer devant PostgreSQL

### Quand l’utiliser
Quand vous avez **beaucoup d’instances** (ex. 10+) et que `DATABASE_POOL_MAX × nombre d’instances` dépasse le `max_connections` de votre PostgreSQL (souvent 100 par défaut).

### Options

| Option | Comment |
|--------|--------|
| **Neon** | Base PostgreSQL managée avec **connection pooler** intégré. Créer un projet Neon et utiliser l’URL « pooled » (paramètre `?pgbouncer=true` ou URL dédiée pooler) comme `DATABASE_URL`. |
| **Supabase** | Même idée : utiliser l’URL du **connection pooler** (port 6543) comme `DATABASE_URL`. |
| **PgBouncer vous-même** | Installer PgBouncer sur un VPS ou une VM, le configurer pour se connecter à votre Postgres, et mettre l’URL PgBouncer dans `DATABASE_URL`. Voir **`docs/pgbouncer-example.ini`** pour un exemple de config. |

### Étapes (exemple avec Neon)

1. Créer un projet sur [neon.tech](https://neon.tech).
2. Dans le dashboard, récupérer l’URL de connexion **pooled** (pooler).
3. **Render** : Environment → `DATABASE_URL` = cette URL pooled (remplacer l’ancienne URL Postgres directe).
4. Redéployer. Aucun changement de code : Prisma parle à PgBouncer comme à Postgres.

### Si vous installez PgBouncer vous-même

- Fichier d’exemple : **`docs/pgbouncer-example.ini`**.
- En production, `DATABASE_URL` doit pointer vers le host/port de PgBouncer (pas directement vers Postgres).

---

## 6. Servir le front et les médias via un CDN

### Frontend (déjà en place)
- **Vercel** sert déjà le front (React/Vite) avec un CDN global. Aucune action nécessaire.

### Médias (vidéos / images)
- Les fichiers sont stockés sur **Cloudflare R2** (variables `R2_*`). Pour mettre un CDN devant :
  1. **Option A** : Utiliser le **domaine public R2** (ex. `R2_PUBLIC_URL`) ; certaines offres R2 incluent déjà une diffusion performante.
  2. **Option B** : Mettre **Cloudflare** (ou un autre CDN) devant le bucket : domaine personnalisé sur R2 + proxy CDN qui met en cache les GET. Configurer les en-têtes de cache (ex. `Cache-Control`) côté R2 ou CDN.

Aucun changement de code obligatoire : il suffit que les URLs des médias (déjà dans la base ou générées via `R2_PUBLIC_URL`) restent valides. Le CDN est une couche devant ces URLs.

---

## 7. Configurer le monitoring et les alertes

### Déjà en place
- **Sentry** : erreurs backend/frontend. Vérifier que `SENTRY_DSN` (ou la variable utilisée par le backend) est définie en production sur Render.
- **Health check** : le backend expose `/health` et `/health/ready`. Render peut les utiliser pour le health check du service (Settings → Health Check Path : `/health` ou `/health/ready`).

### À configurer

1. **Render**  
   - **Settings** → **Health Check Path** : ` /health` (ou `/health/ready`).  
   - Render arrêtera d’envoyer du trafic aux instances qui ne répondent pas.

2. **Sentry**  
   - Vérifier que le DSN Sentry est bien défini dans les variables d’environnement du backend (et front si vous l’utilisez).  
   - Configurer des **alertes** (email ou Slack) sur Sentry pour les erreurs critiques.

3. **Métriques (optionnel)**  
   - Le backend expose `/health/metrics` (protégé par `HEALTH_API_KEY`). Vous pouvez appeler cette URL périodiquement (ex. script ou outil de monitoring) et envoyer les métriques vers un tableau de bord (Grafana, Datadog, etc.) ou simplement surveiller les erreurs.

---

## Récapitulatif des variables d’environnement (production 1M+)

À avoir sur **Render** (backend) :

| Variable | Valeur type | Section |
|----------|-------------|--------|
| `REDIS_URL` | `redis://...` ou `rediss://...` | §1 |
| `DATABASE_POOL_MAX` | `20` (ou 10–25) | §2 |
| `DATABASE_URL` | URL Postgres ou **PgBouncer/Neon pooled** | §5 |
| `NODE_ENV` | `production` | - |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | (identiques sur tous les nœuds) | - |
| `CORS_ORIGIN` | `https://afriwonder.com,https://www.afriwonder.com` | - |
| (+ toutes les autres déjà nécessaires : R2, auth, etc.) | | |

---

## Ordre recommandé

1. **Redis** (§1) : ajouter `REDIS_URL` et redéployer.  
2. **Pool DB** (§2) : ajouter `DATABASE_POOL_MAX=20`.  
3. **Scaling** (§3) : passer à 2 instances (ou plus) sur Render.  
4. **Sticky** (§4) : activer si disponible sur Render ; sinon garder Redis + éventuellement Nginx plus tard.  
5. **PgBouncer** (§5) : seulement si vous dépassez les connexions DB (beaucoup d’instances).  
6. **CDN médias** (§6) : optionnel, selon la charge sur les vidéos/images.  
7. **Monitoring** (§7) : configurer health check Render + alertes Sentry.

Une fois ces points en place, votre stack est prête pour une montée en charge vers 1M+ utilisateurs telle que décrite dans [SCALABILITY.md](./SCALABILITY.md).
