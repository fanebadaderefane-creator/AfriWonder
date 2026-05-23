# Architecture technique AfriWonder — Cible 100M+ utilisateurs

**Document CTO** — Super-app africaine (WeChat × TikTok × WhatsApp × YouTube).  
Version : 1.0 | Objectif : 100M utilisateurs, 10M créateurs, 5M vendeurs.

---

## 1. Principes d’architecture

| Principe | Application |
|----------|-------------|
| **Scalabilité horizontale** | Chaque composant scale indépendamment (pods, replicas). |
| **Résilience** | Circuit breakers, retries, timeouts, health checks, multi-AZ. |
| **Event-driven** | Découplage par événements (Kafka) pour feed, notifications, analytics. |
| **Polyglot persistence** | SQL pour transactions, NoSQL pour volume, cache pour latence. |
| **API-first** | Contrats stables, versioning, backward compatibility. |
| **Observabilité** | Métriques, traces, logs centralisés (Prometheus, OpenTelemetry, ELK). |
| **Sécurité by design** | Zero-trust, chiffrement, rate limiting, modération. |

---

## 2. Vue d’ensemble système

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                     CLIENTS                               │
                    │  PWA (Next/React) │ Mobile (RN/Flutter) │ Mini-apps SDK   │
                    └───────────────────────────┬─────────────────────────────┘
                                                 │
                    ┌────────────────────────────▼────────────────────────────┐
                    │              CDN (Cloudflare / Fastly / Akamai)         │
                    │         Static assets, HLS/DASH, images, API cache      │
                    └────────────────────────────┬───────────────────────────┘
                                                 │
                    ┌────────────────────────────▼────────────────────────────┐
                    │                   API GATEWAY                            │
                    │  Auth · Rate limit · Routing · TLS · Request ID         │
                    │  (Kong / AWS API GW / Envoy / custom Node)               │
                    └────────────────────────────┬───────────────────────────┘
                                                 │
    ┌────────────────────────────────────────────┼────────────────────────────────────────────┐
    │                                            │                    CORE SERVICES           │
    │  ┌──────────────┐ ┌──────────────┐ ┌──────▼──────┐ ┌──────────────┐ ┌──────────────┐   │
    │  │ Auth Service  │ │ User Service  │ │Content Svc  │ │ Media Svc    │ │ Video Svc    │   │
    │  │ JWT · OAuth   │ │ Profils ·    │ │ Posts ·     │ │ Upload ·     │ │ Transcode ·  │   │
    │  │ 2FA · Session │ │ Follow · Sub │ │ Comments ·  │ │ S3/R2 · CDN  │ │ HLS · Reco   │   │
    │  └──────┬───────┘ └──────┬───────┘ └──────┬──────┘ └──────┬───────┘ └──────┬───────┘   │
    │         │                 │                 │               │                 │          │
    │  ┌──────▼───────┐ ┌──────▼───────┐ ┌──────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐   │
    │  │ Messaging    │ │ Payment Svc  │ │ Marketplace │ │ Notification │ │ Search Svc   │   │
    │  │ Chat · Group │ │ Wallet · P2P │ │ Products ·  │ │ Push · Email │ │ Elasticsearch│   │
    │  │ WebSocket    │ │ Mobile Money │ │ Orders ·    │ │ In-app       │ │ Users · Vid  │   │
    │  └──────┬───────┘ └──────┬───────┘ └──────┬──────┘ └──────┬───────┘ └──────────────┘   │
    │         │                 │                 │               │                            │
    │  ┌──────▼───────┐ ┌──────▼───────┐                                                      │
    │  │ Moderation   │ │ Live Service  │  ... (Mini-apps, Ads, Analytics, etc.)               │
    │  │ Reports · AI │ │ Stream · Chat │                                                      │
    │  └──────────────┘ └──────────────┘                                                      │
    └─────────────────────────────────────────────────────────────────────────────────────────┘
                                                 │
                    ┌────────────────────────────▼────────────────────────────┐
                    │              EVENT BUS (Kafka / RabbitMQ)                 │
                    │  user.* · video.* · message.* · payment.* · order.*       │
                    └────────────────────────────┬─────────────────────────────┘
                                                 │
    ┌────────────────────────────────────────────┼────────────────────────────────────────────┐
    │  DATA LAYER                                │                                            │
    │  PostgreSQL (users, payments, orders) │ Cassandra/DynamoDB (messages, feed)             │
    │  Redis (sessions, cache, rate limit)   │ Elasticsearch (search)                          │
    │  S3/R2 (média)                         │ Data Lake (BigQuery/Snowflake) → ML/Analytics   │
    └─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Découpage microservices (cible)

| Service | Responsabilité | DB principale | Événements émis |
|---------|----------------|---------------|------------------|
| **Auth** | Login, OAuth, JWT, 2FA, sessions | PostgreSQL | user.registered, user.login |
| **User** | Profils, follow, abonnements, blocages | PostgreSQL | user.updated, follow.* |
| **Content** | Posts, commentaires, likes, hashtags, tendances | PostgreSQL + cache | content.*, like.*, comment.* |
| **Media** | Upload fichier, stockage S3/R2, URLs CDN | S3/R2 + metadata PG | media.uploaded |
| **Video** | Transcoding, HLS, métadonnées, recommandations | PostgreSQL + cache | video.published, video.viewed |
| **Messaging** | Chat privé, groupes, présence, typing | Cassandra/DynamoDB + Redis | message.*, presence.* |
| **Payment** | Wallet, P2P, QR, Mobile Money, Stripe | PostgreSQL | payment.*, wallet.* |
| **Marketplace** | Produits, panier, commandes, livraison | PostgreSQL | order.*, product.* |
| **Notification** | Push, email, in-app | PostgreSQL + queue | — (consumer) |
| **Search** | Recherche full-text users, contenu, produits | Elasticsearch | — (indexation async) |
| **Moderation** | Signalements, modération IA, sanctions | PostgreSQL | moderation.* |
| **Live** | Live streaming, chat live, gifts | PostgreSQL + Redis | live.* |

---

## 4. Pipeline vidéo (type TikTok)

```
Upload (client)
    │
    ▼
┌─────────────────┐
│ Virus scan      │ (ClamAV / cloud scan)
└────────┬────────┘
         ▼
┌─────────────────┐
│ Transcoding     │ FFmpeg / AWS MediaConvert / Cloudflare Stream
│ Multi-bitrate   │ 360p, 480p, 720p, 1080p
│ HLS/DASH        │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Thumbnail       │ Frame extraction
│ Metadata        │ Duration, codec, resolution
└────────┬────────┘
         ▼
┌─────────────────┐
│ Object Storage  │ S3 / R2 → CDN (Cloudflare, Fastly)
└────────┬────────┘
         ▼
┌─────────────────┐
│ CDN distribution│ HLS URLs, signed URLs si besoin
└─────────────────┘
```

**Streaming** : HLS (ou DASH). Player côté client (hls.js / ExoPlayer). Qualité adaptative selon bande passante (priorité Afrique : mode faible data, buffer minimum).

---

## 5. Messagerie temps réel

| Composant | Rôle |
|-----------|------|
| **Client** | WebSocket (Socket.IO ou natif) / MQTT pour mobile |
| **Gateway** | Connexions persistantes, routing par user/room, scaling horizontal (sticky session ou Redis adapter) |
| **Message broker** | Kafka (durability, replay) ou RabbitMQ pour queues métier |
| **Message service** | Persistance messages, lecture, historique, groupes |
| **DB** | Cassandra ou DynamoDB (partition par conversation_id ou user_id), Redis pour présence/typing |

**Séquence** : Client → Gateway → (publish event) → Message service → DB ; broadcast via gateway aux clients concernés.

---

## 6. Paiements & Mobile Money

- **Wallet** : Solde, historique, verrouillage (transactions critiques en DB transactionnelle).
- **P2P** : Transfert entre wallets (idempotance, double-spend check).
- **QR** : Génération/scan QR, lien vers payment flow.
- **Intégrations** : Orange Money, MTN MoMo, Airtel Money via APIs partenaires (webhooks pour statut).
- **Stripe** : Cartes, abonnements créateurs.
- **Sécurité** : Chiffrement, 2FA pour retraits, audit log, rate limiting.

---

## 7. Recommandation & IA

- **Feature store** : Agrégation événements (watch time, likes, partages, scroll) via Kafka.
- **Training** : Batch (Spark/Flink) ou offline (TensorFlow/PyTorch) → modèles de ranking.
- **Inference** : Service dédié (Python) ou embedding dans Video/Feed service ; cache des scores.
- **Modération IA** : Détection nudité/violence/spam (modèles pré-entraînés + pipeline async).

---

## 8. Infrastructure (cloud & régions)

| Zone | Usage |
|------|--------|
| **Afrique** | Primary : Nigeria, Kenya, Afrique du Sud (latence, conformité données). |
| **Europe** | Fallback, compliance GDPR, partenaires. |
| **Moyen-Orient** | Extension MENA. |

**Stack** : Kubernetes (EKS/GKE/AKS), Docker, Helm. Autoscaling (HPA), load balancers (L7), Ingress.  
**CDN** : Cloudflare / Fastly / Akamai (edge Afrique si disponible).  
**DNS** : Global load balancing (Latency-based / Geo).

---

## 9. Bases de données (polyglot)

| Store | Usage |
|-------|--------|
| **PostgreSQL** | Users, auth, payments, marketplace, modération (ACID). Réplication lecture pour scale read. |
| **Cassandra / DynamoDB** | Messages, feed timeline (partitionnement, haute écriture). |
| **Redis** | Sessions, cache (feed, user), rate limit, présence, queues légères. |
| **Elasticsearch** | Recherche full-text (users, vidéos, produits). |
| **S3 / R2** | Média (vidéos, images, HLS). |
| **Data Lake** | BigQuery / Snowflake pour analytics et ML (events Kafka → batch). |

---

## 10. Sécurité

- **TLS** partout (terminaison au gateway ou LB).
- **OAuth2** pour tierces parties ; JWT interne avec refresh.
- **2FA** (TOTP) pour comptes sensibles et retraits.
- **Rate limiting** global et par route (auth, payment, upload).
- **Protection DDoS** (CDN + WAF).
- **Chiffrement données sensibles** (at-rest et in-transit).
- **Audit** : logs sécurité, connexions, changements critiques.

---

## 11. DevOps & observabilité

- **CI/CD** : GitHub Actions (ou GitLab). Build → tests → build Docker → push registry → deploy (K8s).
- **Déploiement** : Blue/green ou canary pour réduire risque.
- **Observabilité** : Prometheus (métriques), Grafana (dashboards), ELK ou Loki (logs), OpenTelemetry (traces).
- **Alerting** : PagerDuty / Opsgenie sur erreurs, latence, disponibilité.

---

## 12. Performance Afrique

- **Compression** : Vidéo multi-bitrate, images WebP, gzip/Brotli.
- **Mode faible data** : Réduction qualité par défaut, cache offline (PWA).
- **CDN edge** : PoPs au plus proche des utilisateurs.
- **Timeout & retry** : Politiques adaptées aux réseaux instables.

---

## 13. Chemin de migration (monolithe → microservices)

1. **Phase 1 (actuel)** : Monolithe Express bien structuré (domaines, events internes). Garder une seule DB, une seule API.
2. **Phase 2** : Extraire **Auth** et **User** en services séparés ; API Gateway devant le monolithe + 2 services.
3. **Phase 3** : Extraire **Video** + **Media**, puis **Messaging** (avec passage messages en Cassandra si besoin).
4. **Phase 4** : **Payment**, **Marketplace**, **Notification**, **Search** en services ; Kafka pour événements cross-service.
5. **Phase 5** : Scaling par région, Data Lake, ML en production.

Ce document sert de référence pour les décisions d’architecture et le document **REPOS_ET_MICROSERVICES** (arborescence des repos et contrats).
