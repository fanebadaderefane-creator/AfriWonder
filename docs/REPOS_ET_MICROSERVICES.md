# AfriWonder — Arborescence des repos et microservices

Document de référence pour la structure des dépôts Git et des limites des microservices (cible 100M+).

---

## 1. Stratégie des dépôts

Deux approches possibles :

### Option A — Monorepo (recommandée pour la phase actuelle)

Un seul dépôt avec tous les services et apps. Avantages : refactors cross-service faciles, atomicité des changements, CI unique.

```
afriwonder/
├── apps/
│   ├── web/                 # PWA Next.js ou Vite/React
│   ├── mobile/              # React Native (Expo) ou Flutter
│   └── api-gateway/         # Kong config ou custom gateway (Node/Go)
├── services/
│   ├── auth/
│   ├── user/
│   ├── content/
│   ├── media/
│   ├── video/
│   ├── messaging/
│   ├── payment/
│   ├── marketplace/
│   ├── notification/
│   ├── search/
│   ├── moderation/
│   └── live/
├── packages/                # Libs partagées (monorepo)
│   ├── shared-types/
│   ├── event-contracts/
│   ├── db-client/
│   └── observability/
├── infra/                   # Terraform / Pulumi / K8s manifests
│   ├── k8s/
│   ├── terraform/
│   └── docker/
├── docs/
└── scripts/
```

### Option B — Multi-repos

Un dépôt par service + un dépôt “platform” (gateway, infra, docs). Avantages : ownership clair, déploiements indépendants. Inconvénients : synchronisation des contrats, dépendances cross-repo.

```
afriwonder-platform/     # Infra, gateway, CI, docs
afriwonder-web/
afriwonder-mobile/
afriwonder-contracts/    # API OpenAPI, event schemas
afriwonder-auth/
afriwonder-user/
afriwonder-content/
afriwonder-media/
afriwonder-video/
afriwonder-messaging/
afriwonder-payment/
afriwonder-marketplace/
afriwonder-notification/
afriwonder-search/
afriwonder-moderation/
afriwonder-live/
```

**Recommandation** : Rester en **monorepo** (structure actuelle AfriWonder = root = web, `backend/` = API) jusqu’à ce que les équipes dépassent ~10–15 devs ou que les cycles de release par service deviennent vraiment indépendants. Ensuite migrer vers multi-repos par domaine (auth+user, content+media+video, messaging, payment+marketplace, etc.).

---

## 2. Alignement avec le repo actuel AfriWonder

Structure **actuelle** (à conserver et faire évoluer) :

```
AfriWonder/
├── src/                    # Frontend React (PWA)
├── backend/                # API Express (monolithe modulaire)
│   ├── prisma/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── ...
├── mobile-afriwonder/       # App mobile
├── sdk/afriwonder-miniapp-sdk/
├── docs/
├── docker-compose*.yml
└── ...
```

**Évolution proposée** sans tout casser :

1. **Backend** : Introduire des **domaines** clairs dans `backend/src` (voir section 3) et un **bus d’événements interne** (abstraction Kafka-ready).
2. **Nouveaux services** : Lors de l’extraction, créer `backend/src/domains/<domain>/` ou un repo `services/<service>/` dans un futur monorepo.
3. **Contrats** : Documenter les événements et les APIs dans `docs/` ou `packages/event-contracts/`.

---

## 3. Découpage par domaine (backend actuel)

Pour préparer l’éclatement en microservices, grouper routes + services par **domaine métier** :

| Domaine | Routes (exemples) | Services | Événements clés |
|---------|-------------------|----------|------------------|
| **auth** | auth.* | auth.service | user.registered, user.login |
| **user** | users.*, profile | user.service, follow | user.updated, follow.* |
| **content** | comments, saves, feed, posts | comment, feedAlgorithm, recommendation | content.*, like.*, comment.* |
| **media** | upload, proxy | (upload, S3/R2) | media.uploaded |
| **video** | videos.*, playlists, viewHistory | video, playlist, viewHistory | video.published, video.viewed |
| **messaging** | messages.*, conversations, groups | message.service | message.*, presence.* |
| **payment** | payments, wallet, withdrawals | payment.service | payment.*, wallet.* |
| **marketplace** | products, orders, cart, seller | order, product, cart, seller | order.*, product.* |
| **notification** | notifications | notification.service | — (consumer) |
| **search** | search | (search service) | — (indexation) |
| **moderation** | moderation, reports | moderation.* | moderation.* |
| **live** | live.* | live.service | live.* |

Chaque domaine peut avoir plus tard son propre dépôt ou sous-dossier `services/<name>/`.

---

## 4. Contrats API (REST)

- **Versioning** : Préfixe de chemin `/api/v1/` (déjà en place via `/api/`).
- **Documentation** : OpenAPI (Swagger) — déjà exposé dans le backend.
- **Stabilité** : Ne pas casser les champs existants ; ajouter des champs optionnels pour les nouvelles fonctionnalités.

Quand les services seront séparés :

- Chaque service expose sa propre OpenAPI.
- L’API Gateway agrège les routes (ou BFF par client).

---

## 5. Contrats événements (Event-driven)

Format proposé (exemple) :

- **Topic Kafka** : `afriwonder.<domain>.<entity>.<action>` (ex. `afriwonder.video.video.published`).
- **Payload** : JSON avec `eventId`, `timestamp`, `version`, `payload` (données métier).
- **Schema registry** : Optionnel (Avro/JSON Schema) pour validation.

Exemples d’événements :

| Event | Producer | Consumers possibles |
|-------|----------|----------------------|
| user.registered | Auth | User, Notification, Analytics |
| user.updated | User | Search, Notification |
| video.published | Video | Content, Search, Notification, Analytics |
| video.viewed | Video | Recommendation, Analytics |
| message.sent | Messaging | Notification, Moderation |
| order.completed | Marketplace | Payment, Notification, Analytics |
| payment.completed | Payment | Marketplace, Notification |

---

## 6. Résumé

- **Aujourd’hui** : Un repo (AfriWonder), backend monolithe Express dans `backend/`. Faire évoluer en **domaines** + **bus d’événements** interne.
- **Court terme** : Garder monorepo ; structurer `backend/src` par domaines ; documenter événements et APIs.
- **Moyen terme** : Extraire 1–2 services (ex. Auth, Video) dans le même repo (`services/auth`, `services/video`) ou en nouveaux repos si besoin.
- **Long terme** : Multi-repos ou monorepo avec nombreux services, API Gateway, Kafka, polyglot persistence.

Les détails d’implémentation du backend “MVP scalable” (domaines + events) sont dans le backend lui-même et dans **ARCHITECTURE_100M_CTO.md**.
