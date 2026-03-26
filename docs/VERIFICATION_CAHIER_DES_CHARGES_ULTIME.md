# Vérification du cahier des charges ultime — AfriWonder

**Date** : 11 mars 2026  
**Dernière mise à jour suivi code** : 25 mars 2026 (messagerie : enregistrement discussions en **fichier texte** lisible pour les utilisateurs, invites/fin d’appel groupe via salons `user:*`, lobby Agora).  
**Référentiel** : Cahier des charges ultime — Super-App Africaine Tout-en-Un (vision stratégique, architecture, 220+ fonctionnalités, inspirations WeChat/TikTok/YouTube/WhatsApp/Grab/Gojek).

> **Périmètre réaliste** : le CDC inclut une cible « 100M utilisateurs » (Kafka, K8s, Elasticsearch, MQTT, data lake, etc.) qui **n’est pas entièrement réalisable dans le dépôt applicatif seul** ; les écarts listés en fin de document restent valides pour cette couche infra. Les **fonctions produit messagerie** (1-1, groupes, médias, E2EE optionnelle, etc.) sont largement couvertes côté API et client web.

---

## Résumé exécutif

| Statut global | Détail |
|---------------|--------|
| **Implémenté** | ~75 % des blocs majeurs (auth, users, vidéo, feed, live, messagerie, paiements, marketplace, modération, mini-apps, PWA, performance Afrique) |
| **Partiel** | Recherche globale, i18n complet, pipeline transcoding HLS automatisé, infra event-driven/Kafka, Elasticsearch |
| **Non implémenté** | K8s, CDN dédié dans le repo, SDK développeur packagé, écosystème mini-apps runtime type WeChat |

Le projet AfriWonder couvre **la Phase 1 (MVP) et une grande partie de la Phase 2** du CDC (profils, fil social, messagerie, vidéos, live, paiement, monétisation, marketplace, modération). Les éléments d’infrastructure « 100M utilisateurs » (Kafka, Elasticsearch, K8s) et certaines avancées (recommandation IA poussée, DVR live) sont en partie documentés ou préparés mais pas tous déployés dans le code actuel.

---

## 1. Vision stratégique & objectifs business

| Point CDC | Statut | Détail projet |
|-----------|--------|----------------|
| Centraliser communication, contenu, commerce, paiement, services | ✅ | Messagerie, feed vidéo, marketplace, wallet, services (transport, resto, santé, jobs, etc.) présents |
| Inspirations WeChat, TikTok, YouTube, WhatsApp, Grab, Gojek | ✅ | Feed vertical type TikTok, live, replay, chat, wallet, marketplace, transport, resto, mini-apps |

---

## 2. Personas utilisateurs

| Persona | Statut | Implémentation |
|---------|--------|-----------------|
| **Utilisateur standard** (communiquer, contenu, acheter, payer) | ✅ | Chat, Home/Discover, Marketplace, Cart, Wallet, Search |
| **Créateur** (publier, live, monétiser) | ✅ | Create, Upload, Live (Agora), CreatorTools, tips, abonnements créateur |
| **Entreprise** (vendre, publicité) | ✅ | SellerDashboard, AdvertiserDashboard, AdCampaign, products/orders |
| **Développeur** (mini-apps) | ✅ | DeveloperPortal, DeveloperConsole, MiniAppsStore, routes developer/miniApps |
| **Administrateur** (modération, analytics) | ✅ | AdminPage, ModerationDashboard, admin.routes, moderation.routes, RBAC |

---

## 3. Architecture globale

| Composant CDC | Statut | Détail projet |
|---------------|--------|----------------|
| **Clients web / mobile** | ✅ | Vite PWA (React) + Expo/React Native (mobile-afriwonder) |
| **API Gateway** | ⚠️ | Express comme API unique ; pas de gateway dédié type Kong/AWS API GW |
| **Microservices** | ⚠️ | Monolithe modulaire (routes/services par domaine) ; backend-go minimal en parallèle |
| **Auth, Users, Content, Video, Messaging, Payments, Marketplace, Search, Notifications, AI, Moderation** | ✅ | Tous présents sous forme de routes + services (Express + Prisma) |
| **Data layer (SQL, NoSQL, Cache, Object Storage)** | ✅ / ⚠️ | PostgreSQL (Prisma), Redis optionnel (rate limit, Socket.io), pas de NoSQL/Cassandra ni Elasticsearch en prod dans le repo |

---

## 4. Applications clients

| CDC | Statut | Détail |
|-----|--------|--------|
| **Mobile** (React Native / Flutter) | ✅ | Expo/React Native (`mobile-afriwonder`) |
| **Web** (Next.js / PWA) | ✅ | Vite + React + PWA (vite-plugin-pwa), pas Next.js |

---

## 5. Microservices / domaines fonctionnels

| Service CDC | Statut | Fichiers / modèles clés |
|-------------|--------|--------------------------|
| **Auth** (login, OAuth, sessions, tokens) | ✅ | `auth.routes.ts`, `auth.service.ts`, JWT + refresh, Google/Facebook, 2FA (User2FA, privacy.service, auth.routes) |
| **User** (profils, abonnements, relations) | ✅ | `users.routes.ts`, User, Follow, CreatorSubscription, SellerSubscription, WonderRelation |
| **Content** (posts, commentaires, likes) | ✅ | Contenu centré vidéo : Comment, Like, Story, VideoHashtag ; pas d’entité « post » texte seul |
| **Media** (images, vidéos, audio) | ✅ | Upload, Video, Story, playlists, saves, proxy |
| **Messaging** (chat, groupes, temps réel) | ✅ | Sauvegarde discussions : API `GET /export` & groupes ; **app** génère un **.txt** (style messagerie) — **Inbox** ⋮, **GroupChat** ⋮, **Chat** Plus ; E2EE optionnelle |
| **Video** (streaming, transcoding, recommandations) | ✅ | videos, feed, upload, live (Agora), viewHistory, RecommendationEngine (mobile), feed.service |
| **Payment** (wallet, transactions) | ✅ | payments.routes, Wallet, Transaction, Stripe, Orange Money, MTN MoMo (stub/config), exchangeRates |
| **Marketplace** (produits, commandes, livraison) | ✅ | products, orders, cart, seller, shipping, shipments, addresses, disputes, refunds, returns |
| **Moderation** (signalements, filtrage) | ✅ | moderation.routes, Moderation, UserStrike, sanctions, admin |

---

## 6. Infrastructure (100M utilisateurs)

| Élément CDC | Statut | Détail |
|-------------|--------|--------|
| Cloud (AWS/GCP/Azure) | ⚠️ | Références Vercel, Render ; pas de config cloud dans le repo |
| Kubernetes | ❌ | Absent |
| Load balancers | ⚠️ | Dépend de l’hébergeur (Render, etc.) |
| CDN global | ⚠️ | Pas de config CDN dans le repo ; docs mentionnent HLS + CDN |
| Data centers Afrique / Europe / Moyen-Orient | ⚠️ | Non visible dans le code (déploiement) |

---

## 7. Base de données

| CDC | Statut | Projet |
|-----|--------|--------|
| **SQL (PostgreSQL)** pour users, payments, marketplace | ✅ | Prisma + PostgreSQL (schema complet) |
| **NoSQL** (Cassandra/DynamoDB) pour messages, feeds | ❌ | Messages et feeds en PostgreSQL |
| **Search (Elasticsearch)** | ❌ | Recherche full-text PostgreSQL par ressource ; pas d’Elasticsearch |
| **Cache (Redis)** | ✅ | Optionnel : rate limiting, Socket.io adapter |
| **Data lake (S3, BigQuery)** | ❌ | Non présent |

---

## 8. Pipeline vidéo (type TikTok)

| Étape CDC | Statut | Détail |
|-----------|--------|--------|
| Upload API | ✅ | `upload.routes.ts`, `videos.routes.ts` |
| Transcoding (FFmpeg) | ⚠️ | `backend/docs/HLS_FFMPEG_PIPELINE.md`, `functions/videoTranscoding.ts` (simulation) ; pas de worker FFmpeg automatisé dans le repo |
| Encodage multi bitrate | ⚠️ | Documenté (HLS) ; front prêt (hls.js) ; back à finaliser |
| Streaming HLS / DASH | ✅ | Front : hls.js, LiveReplayPlayer, VideoCard ; `.m3u8` géré |
| CDN distribution | ⚠️ | Dépend déploiement |

---

## 9. Messagerie temps réel

| CDC | Statut | Détail |
|-----|--------|--------|
| WebSockets | ✅ | Socket.io dans `backend/src/index.ts` |
| MQTT | ❌ | Non utilisé |
| Architecture client → gateway → broker → service → DB | ⚠️ | Client → Express + Socket.io → message.service → Prisma |
| Kafka / RabbitMQ | ❌ | Non utilisé ; événements synchrones |
| **Appels groupe (salle / participants + média)** | ✅ / ⚠️ | API `group-calls` + token Agora RTC ; **web** : `GroupCallLobby.jsx` (`rtc`), invitations membres via `user:*` + toast global (`IncomingCallListener`), fin d’appel `user:group-call-ended` + `group:call-ended` ; **⚠️** qualité / TURN / natif = config (`AGORA_*`, `VITE_TURN_*`), pas de SFU maison |

---

## 10. Intelligence artificielle

| CDC | Statut | Détail |
|-----|--------|--------|
| Recommandation (collaborative filtering, ranking) | ✅ | feed.service, ViewHistory, RecommendationEngine (mobile), algo feed (catégorie, hashtag) |
| Modération IA (nudité, violence, spam, haine) | ⚠️ | aiEngine, ai.routes, modération ; à confirmer niveau déploiement des modèles |
| Anti-fraude (bots, fraude paiement) | ⚠️ | matchingEngine (trust score), walletSecurity ; pas de stack dédiée type ML anti-fraude |

---

## 11. Data platform (events → Kafka → processing → Data Lake → analytics → ML)

| CDC | Statut | Détail |
|-----|--------|--------|
| Event streaming (Kafka) | ❌ | Non implémenté |
| Spark, Airflow, Snowflake | ❌ | Non présents |
| Analytics / reporting | ✅ | analytics.routes, creatorDashboard, businessIntelligence, admin |

---

## 12. Super-App & mini-apps

| CDC | Statut | Détail |
|-----|--------|--------|
| Plateforme mini-apps | ✅ | MiniApp, MiniAppInstall, miniApps.routes, MiniAppsStore, DeveloperPortal |
| SDK développeurs (API, doc, sandbox) | ⚠️ | developer.routes, publicApi.routes ; pas de package SDK dédié dans le repo |
| Exemples (taxi, livraison, banque, e-learning, e-gov) | ✅ | Rides, FoodDelivery, Wallet, Courses, Civic, etc. |

---

## 13. Paiements

| CDC | Statut | Détail |
|-----|--------|--------|
| Wallet (dépôt, retrait, paiement) | ✅ | Wallet, payments.routes, ledger, recharge, withdrawal |
| Orange Money, MTN MoMo, Airtel Money | ✅ / ⚠️ | Orange Money implémenté ; MTN (stub/config) ; Airtel non vu |
| P2P, créateurs, marketplace | ✅ | Ledger, tips, escrow commandes |

---

## 14. Marketplace

| CDC | Statut | Détail |
|-----|--------|--------|
| Catalogue, commandes, paiement, livraison | ✅ | products, orders, cart, shipping, shipments, addresses, disputes, refunds, returns |

---

## 15. Sécurité

| CDC | Statut | Détail |
|-----|--------|--------|
| TLS, chiffrement, DDoS, rate limiting | ✅ / ⚠️ | Rate limiting (Redis optionnel), middleware auth ; TLS côté hébergeur |
| OAuth2, 2FA | ✅ | Google/Facebook OAuth ; 2FA (TOTP + backup codes) : User2FA, privacy.routes (2fa/enable, verify, disable), auth.service |

---

## 16. Trust & Safety

| CDC | Statut | Détail |
|-----|--------|--------|
| Signalement, modération humaine/IA, sanctions (warning, strike, suspension, bannissement) | ✅ | moderation.routes, Moderation, UserStrike, account_suspended, shadow_banned, moderationSanctions.service |

---

## 17. DevOps & observabilité

| CDC | Statut | Détail |
|-----|--------|--------|
| CI/CD (GitHub, Docker, K8s) | ✅ / ❌ | GitHub Actions (ci.yml, deploy, deploy-vercel), Docker + Docker Compose ; pas de K8s |
| Blue/green, canary | ❌ | Non visible |
| Prometheus, Grafana, ELK, OpenTelemetry | ❌ | Non présents dans le repo |

---

## 18. Performance Afrique (CDC §21)

| CDC | Statut | Détail |
|-----|--------|--------|
| Compression vidéo | ⚠️ | Backend compression middleware ; transcoding HLS documenté |
| Mode faible data | ✅ | `data_saver_mode` (User), LiveView qualité réduite, paramètres |
| Cache offline | ✅ | PWA, offlineStorage, offlineCache, Downloads, SW (CacheFirst media) |

---

## 19. Internationalisation (CDC §22)

| CDC | Statut | Détail |
|-----|--------|--------|
| Multi-langues | ⚠️ | Language.jsx, useTranslation, fr/en/ar/bm ; pas de framework i18n complet type react-i18next dans le root |
| Multi-monnaies | ✅ | XOF par défaut, exchangeRates.routes, CEDEAO (region.js) |
| Multi-pays | ✅ | country, region, CEDEAO |

---

## 20. Compliance (CDC §23)

| CDC | Statut | Détail |
|-----|--------|--------|
| RGPD | ✅ | cookieConsent, dataExport, accountDeletion, privacy.routes, DataProtection.jsx |
| KYC | ✅ | verification.service, UserVerification, kycRequired.service |
| AML | ✅ | aml.service présent |

---

## 21. Roadmap produit CDC

| Phase CDC | Statut | Détail |
|-----------|--------|--------|
| **Phase 1 (MVP)** : profils, fil social, messagerie, vidéos | ✅ | Complet |
| **Phase 2** : live, paiement, monétisation | ✅ | Live (Agora), Wallet, Stripe/Orange/MTN, tips, abonnements créateur |
| **Phase 3** : marketplace, mini-apps | ✅ | Marketplace complet ; mini-apps (store, install, developer) |

---

## 22. Liste détaillée 220+ fonctionnalités — synthèse par catégorie

| Catégorie | Implémenté | Partiel | Non trouvé |
|-----------|------------|---------|------------|
| **Social** (profil, abonnements, commentaires, likes, stories, hashtags, etc.) | Majorité | — | Posts texte dédiés, groupes sociaux avancés |
| **Vidéo** (upload, feed, live, replay, recommandations, qualité adaptative, analytics créateur) | Majorité | Transcoding HLS automatisé, DVR live | — |
| **Messagerie** (chat, présence, réactions, partage fichier, groupes) | 1:1 + **groupes** (polls, événement, E2EE option), présence, **copie discussion** (fichier texte pour l’utilisateur, API côté serveur), archivage/brouillon/programmation côté Chat | Appels groupe multipoint via **Agora** si clés serveur ; SFU autogéré / MQTT non dans le repo | MQTT, broker dédié |
| **Paiements** (wallet, P2P, mobile money, KYC, historique) | Majorité | MTN/Airtel complets en prod | — |
| **Marketplace** (catalogue, panier, commandes, livraison, retours, avis) | Oui | — | — |
| **Créateurs** (studio, analytics, revenus, tips, abonnements, live gifts) | Oui | — | — |
| **Administration** (dashboard, modération, sanctions, logs, support) | Oui | — | A/B testing, monitoring avancé |

---

## 23. Éléments « type TikTok » (CDC fin)

| Point | Statut | Détail |
|-------|--------|--------|
| Edge (CDN, edge cache) | ⚠️ | Dépend déploiement ; pas dans le repo |
| Pipeline vidéo (upload → transcoding → HLS → CDN) | ⚠️ | Upload + front HLS OK ; transcoding automatisé partiel |
| Recommendation engine | ✅ | feed.service, ViewHistory, RecommendationEngine (mobile) |
| Data infra (Kafka, data lake) | ❌ | Non |

---

## 24. Éléments « type WeChat »

| Point | Statut | Détail |
|-------|--------|--------|
| Core (social, messaging, video, payments, mini-apps, marketplace) | ✅ | Présent |
| Mini-app runtime / écosystème intégré | ⚠️ | Store + install + developer ; pas de runtime type WeChat dans le repo |
| WeChat Pay–like (wallet, P2P, QR, fraud) | ✅ | Wallet, P2P via ledger, walletSecurity |

---

## Conclusion

- **Implémenté et aligné au CDC** : vision super-app, personas, Phase 1–3 produit, auth (dont 2FA), users, vidéo (feed, live, replay, recommandations), messagerie **1:1 et groupes** (temps réel, médias, sondages, partage d’événement, E2EE option, **enregistrement des discussions en texte simple** pour l’utilisateur, archivage/brouillon/programmation UI Chat, Inbox), **appels groupe** (lobby, Agora RTC si configuré, invitations cross-écran), paiements (wallet, Orange/MTN stub), marketplace, modération, mini-apps, PWA, performance Afrique (data saver, offline), compliance (RGPD, KYC, AML).
- **Partiel ou à renforcer** : recherche globale (unifier sur une API/search engine), i18n (framework complet), pipeline HLS (transcoding automatisé), SDK développeur (package dédié), observabilité (Prometheus/Grafana/ELK).
- **Non implémenté** : architecture event-driven (Kafka), NoSQL/Elasticsearch, Kubernetes, CDN/K8s dans le repo, data lake, MQTT.

Pour une **livraison MVP / Phase 2–3** et un **positionnement type super-app africaine**, le cahier des charges ultime est **implémenté à un niveau très avancé** ; les écarts restants concernent surtout l’**infrastructure très grande échelle** (100M+) et quelques briques optionnelles (recherche globale, transcoding automatisé, observabilité).
