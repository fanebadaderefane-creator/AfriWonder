# Backend — Domains & event mapping

Ce document décrit le découpage par **domaine** du monolithe actuel et les **événements** émis (event bus). Il prépare l’évolution vers des microservices (voir `docs/REPOS_ET_MICROSERVICES.md` et `docs/ARCHITECTURE_100M_CTO.md`).

---

## 1. Domaines et routes

| Domaine   | Routes (préfixe `/api/`) | Services principaux |
|-----------|---------------------------|----------------------|
| **auth**  | auth                      | auth.service         |
| **user**  | users                     | user.service, follow |
| **content** | comments, saves, feed   | comment, feedAlgorithm, recommendation |
| **media** | upload, proxy             | S3/R2, proxy         |
| **video** | videos, playlists, view-history | video.service, playlist, viewHistory |
| **messaging** | messages              | message.service      |
| **payment** | payments, payment       | payment.service      |
| **marketplace** | products, orders, cart, seller, reviews | order, product, cart, seller |
| **notification** | notifications       | notification.service |
| **search** | search                  | search (Elasticsearch ou PG) |
| **moderation** | moderation, reports  | moderation.*         |
| **live**  | live                      | live.service         |

---

## 2. Événements (event bus)

Implémentation : `src/events/eventBus.ts` (in-memory ; interface prête pour Kafka).

### Émis actuellement

| Topic | Émetteur | Payload |
|-------|----------|---------|
| `afriwonder.video.video.viewed` | video.service (recordView) | videoId, creatorId, userId?, deviceId?, watchSeconds, watchPercent, views |

### À brancher (même interface)

| Topic | Émetteur suggéré | Usage |
|-------|-------------------|--------|
| afriwonder.user.user.registered | auth.service (register) | Notification, analytics |
| afriwonder.user.user.login | auth.service (login) | Audit, analytics |
| afriwonder.video.video.published | video.service (create) | Search index, notification |
| afriwonder.content.like.* | like route | Recommendation, notification |
| afriwonder.payment.transaction.completed | payment.service | Wallet, notification |
| afriwonder.order.order.completed | order.service | Payment release, notification |

### S’abonner (exemple)

```ts
import { subscribe, TOPIC_VIDEO_VIEWED } from '../events/eventBus.js';

subscribe(TOPIC_VIDEO_VIEWED, (event) => {
  // recommendation, analytics, etc.
  console.log('Video viewed', event.payload);
});
```

---

## 3. Évolution

1. **Court terme** : Continuer à émettre des événements depuis les services existants (user, payment, order).
2. **Moyen terme** : Brancher un producteur Kafka dans `eventBus.emit()` ; déployer des consumers (reco, analytics).
3. **Long terme** : Extraire des services (auth, user, video, messaging, payment) en processus séparés ; garder les mêmes topics et payloads.
