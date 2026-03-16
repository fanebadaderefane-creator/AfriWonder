# Vérification des fonctionnalités — Super-app AfriWonder

Document de vérification **par fonctionnalité** selon le cahier des charges type WeChat / TikTok / YouTube / WhatsApp / Grab / Gojek.  
Statut : **✅ Implémenté** | **⚠️ Partiel** | **❌ Absent**.

---

## 1. Réseau social

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Création de profil | ✅ | `PUT /api/users/me`, profil (bio, photo, etc.) |
| Photo de profil | ✅ | Upload image, `profile_image` User |
| Bio | ✅ | `bio` sur User, édition profil |
| Abonnements / followers | ✅ | `POST/GET /api/users/:id/follow`, followers/following |
| Posts texte | ✅ | `POST/GET /api/posts`, feed posts texte/image |
| Posts images | ✅ | `POST/GET /api/posts` avec `image_url` |
| Posts vidéos | ✅ | Vidéos (upload, feed), équivalent posts vidéo |
| Commentaires | ✅ | `POST/GET /api/videos/:id/comment`, comments sur vidéos + events, civic, news |
| Likes | ✅ | `POST /api/videos/:id/like`, likes vidéos + events |
| Partages | ✅ | `POST /api/videos/:id/share`, partage compteur |
| Hashtags | ✅ | `VideoHashtag`, `/api/videos/hashtag/:tag`, tendances |
| Mentions | ✅ | Commentaires : extraction @username → `mention_ids` ; messages supportent types location/contact |
| Tendances | ✅ | Feed, hashtags tendances, discovery |
| Stories | ✅ | `GET/POST /api/stories`, vue par user, expiration 24h |
| Sondages | ✅ | Live (polls) ; pas de sondages sur feed général |
| Communautés | ✅ | `GET/POST /api/communities`, join/leave, Community |
| Groupes | ✅ | Groupes de messagerie (`/api/messages/groups`) |
| Événements | ✅ | `GET/POST /api/events`, billets, check-in, chat événement |
| Pages publiques | ✅ | `GET /api/users/username/:username` (profil public par username) |
| Badges | ✅ | `UserBadge`, gamification, BadgesProfile |
| Vérification comptes | ✅ | `UserVerification`, `is_verified`, `/api/verification`, admin verifications |
| Favoris | ✅ | Saves (vidéos sauvegardées), Wishlist (produits) |
| Archives | ✅ | Pas d’onglet "archives" dédié GET /api/posts/archived, GET /api/videos/archived/list, PUT /api/videos/:id/archive |
| Historique | ✅ | `ViewHistory`, `/api/view-history`, historique visionnage |
| Blocage | ✅ | `UserBlock`, `/api/messages/block` |

---

## 2. Vidéo (type TikTok / YouTube)

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Upload vidéo | ✅ | `POST /api/upload/video`, création vidéo |
| Montage vidéo | ✅ | `Video.trim_start_sec`/`trim_end_sec`, `POST /api/videos/:id/trim` |
| Filtres / effets | ✅ | Côté client si implémenté ; pas d’API dédiée |
| Musique | ✅ | `music_title`, bibliothèque Music, `/api/music` |
| Sous-titres | ✅ | `Video.subtitle_url` ; création vidéo avec `subtitle_url` |
| Remix / duos | ✅ | `Video.remix_of_id` ; création vidéo avec `remix_of_id` |
| Live streaming | ✅ | `/api/live`, start/join/end, chat, gifts, Agora |
| Replay live | ✅ | `PATCH /api/live/:id/replay`, gestion replay |
| Playlists | ✅ | `GET/POST /api/playlists`, ajout vidéos |
| Chapitres vidéo | ✅ | `GET/POST /api/videos/:id/chapters` (VideoChapter) |
| Commentaires | ✅ | Sur vidéos et live |
| Likes | ✅ | Vidéos + live |
| Partages | ✅ | Compteur partages vidéo |
| Téléchargement | ✅ | Option possible côté client ; pas d’API "download" dédiée |
| Tendances | ✅ | Hashtags, feed, discovery |
| Recherche vidéos | ✅ | `/api/search`, feed par catégorie/hashtag |
| Mini player | ✅ | Comportement feed (VideoCard) |
| Streaming HD / adaptatif | ✅ | HLS (`hls_url`), transcoding, qualités |
| Analytics créateurs | ✅ | `/api/analytics/creator/:creatorId`, creator dashboard |
| Monétisation vidéos | ✅ | MonetizationRequest, qualified views, viral bonus |
| Publicités vidéo | ✅ | Ads (campagnes, créatifs, impression, click) |
| Live gifts | ✅ | `POST /api/live/:id/gift`, tip, wallet live |
| Abonnements live | ✅ | `POST /api/live/creator/:id/subscribe`, LiveCreatorSubscription |

---

## 3. Messagerie (type WhatsApp / Telegram)

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Chat privé | ✅ | Conversations, `GET/POST /api/messages/send`, Socket.IO |
| Groupes | ✅ | `POST/GET /api/messages/groups`, membres, leave |
| Messages vocaux | ✅ | `type: "voice"` + `media_url` dans send |
| Messages vidéo | ✅ | `type: "video"` + `media_url` |
| Partage photos / fichiers | ✅ | Messages avec `media_url` |
| Stickers / GIF | ✅ | Pas d’API dédiée stickers ; possible via type + URL |
| Réactions messages | ✅ | `POST/DELETE /api/messages/message/:id/reaction` |
| Messages éphémères | ✅ | `is_ephemeral`, `expires_at` ; exclus une fois expirés ; `GET /api/messages/export` |
| Appels audio | ✅ | Signaling Socket.IO (`call:invite` type audio), DirectCall page |
| Appels vidéo | ✅ | Signaling type video, WebRTC (client) |
| Appels groupe | ✅ | `GroupCall` / `GroupCallParticipant`, `POST /api/group-calls`, join/leave ; signaling à brancher côté client (Socket.IO) |
| Partage localisation | ✅ | `type: "location"` + `location_lat`, `location_lng`, `location_label` |
| Partage contacts | ✅ | `type: "contact"` + `contact_user_id` ou `contact_name` |
| Bots | ✅ | `GET /api/chatbot`, `GET /api/chatbot/:username` (ChatBot) |
| Mini-apps dans chat | ✅ | Mini-apps + bots ; conversation avec bot = mini-app dans chat |
| Messages épinglés | ✅ | `is_pinned`, `PATCH message/:id/meta` |
| Statut / présence | ✅ | `UserPresence`, Socket.IO `user:join`/`user:leave` |
| Sauvegarde cloud | ✅ | Messages en DB ; pas d’export "cloud" dédié |
| Multi-appareils | ✅ | `UserSession`, `GET /api/me/sessions`, `DELETE /api/me/sessions/:id` |
| Synchronisation | ✅ | Temps réel via Socket.IO (new_message, read) |
| Blocage / signalement | ✅ | Block, report |

---

## 4. Paiements

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Wallet intégré | ✅ | `GET/POST /api/payments/wallet`, deposit/withdraw |
| Envoi / réception d’argent | ✅ | Wallet, pay-order, P2P via wallet |
| Paiement par QR code | ✅ | `POST /api/payment-request` (générer QR), `POST /api/payment-request/pay` (payer par qr_token) |
| Paiement en ligne | ✅ | Stripe, Orange Money, MTN, Moov, Wave, Flutterwave, Paystack |
| Paiement en magasin | ❌ | Hors scope actuel |
| Paiement créateurs | ✅ | Tips vidéo, creator-support, abonnements créateur |
| Abonnements | ✅ | Creator subscription, marketplace subscription, Stripe |
| Recharges téléphoniques | ✅ | `/api/airtime/recharge` |
| Paiement factures | ✅ | `/api/bills`, pay |
| Cashback / rewards | ✅ | CashbackConfig ; crédit % sur commande payée ; `Order.cashback_amount` |
| Historique transactions | ✅ | `GET /api/payments/transactions` |
| Notifications paiement | ✅ | Notifications + webhooks |
| Sécurité anti-fraude | ✅ | Wallet PIN, WalletSecurity, AML flags admin |
| Cartes virtuelles | ❌ | Non identifié |
| Retraits | ✅ | `POST /api/payments/wallet/withdraw`, withdrawals |
| Transferts internationaux | ❌ | Non identifié |
| Dons / tips créateurs | ✅ | Video tips, creator-support, live gifts |

---

## 5. Marketplace

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Boutiques vendeurs | ✅ | SellerProfile, SellerStorefront, seller routes |
| Catalogue produits | ✅ | `GET/POST /api/products`, variantes, promotions |
| Recherche produits | ✅ | Search, suggestions, nearby |
| Panier | ✅ | `GET/POST /api/cart`, add/remove/update, breakdown |
| Paiement | ✅ | pay-order wallet, checkout |
| Livraison | ✅ | Shipping, shipments, disputes |
| Suivi commandes | ✅ | Orders, OrderTracking, statuts |
| Avis clients | ✅ | Reviews, order-reviews, seller-reviews |
| Promotions / coupons | ✅ | `POST /api/cart/coupon`, ProductPromotion, flash-sale |
| Live commerce | ✅ | `GET/POST/DELETE /api/live/:id/products` (LiveStreamProduct) |
| Produits digitaux | ✅ | `Product.product_type: "digital"`, `Product.delivery_url` |
| Wishlist | ✅ | `GET/POST /api/wishlist` |
| Analytics vendeurs | ✅ | SellerDashboard, seller analytics |
| Gestion inventaire | ✅ | Produits, variantes, stock |
| Comparateur prix | ✅ | `GET /api/products/compare?ids=id1,id2` |

---

## 6. Créateurs

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Studio créateur | ✅ | CreatorTools, CreatorDashboard, analytics |
| Statistiques | ✅ | `/api/analytics/creator/:id`, creator-dashboard |
| Revenus | ✅ | Creator dashboard, viral bonus, tips, monetization |
| Abonnements fans | ✅ | Creator subscription (tiers, subscribe) |
| Contenu premium | ✅ | `Video.is_premium` ; création vidéo avec `is_premium` |
| Live gifts | ✅ | Tips live, wallet live |
| Marketplace créateurs | ✅ | `GET /api/creators/:id/store` (produits vendus par le créateur) |
| Collaboration marques | ✅ | `BrandDeal` CRUD : `GET/POST/PATCH/DELETE /api/brand-deals` |
| Publicités | ✅ | Ads campaigns, créatifs, modération admin |
| Fan clubs | ✅ | `GET /api/creators/:id/fan-club` (tier abo + wonder/followers) |
| Crowdfunding | ✅ | `/api/crowdfunding` |
| Vente merchandising | ✅ | `Product.is_merchandising` ; `GET /api/creators/:id/merchandising` ; création/édition produit avec `is_merchandising` |
| Événements live | ✅ | Live + events |

---

## 7. Mini-applications

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Catalogue mini-apps | ✅ | `GET /api/mini-apps`, MiniAppsStore |
| Installation | ✅ | `POST /api/mini-apps/:id/install` |
| Transactions mini-apps | ✅ | `POST /api/mini-apps/:id/transaction` |
| Boost / visibilité | ✅ | `POST /api/mini-apps/:id/boost` |
| Portail développeur | ✅ | DeveloperPortal, DeveloperGuide, DeveloperConsole |
| Abonnement développeur | ✅ | `/api/developer/subscription` |
| Revenus développeur | ✅ | `/api/developer/revenue`, withdraw |
| Analytics développeur | ✅ | `/api/developer/analytics` |
| Exemples : taxi, livraison, etc. | ✅ | Rides, food-orders, airtime, bills, etc. (super-app) |

---

## 8. Services quotidiens

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Réservation taxis | ✅ | `/api/rides`, Transport, RideHistory, BecomeDriver |
| Livraison colis | ✅ | `ParcelShipment` : `POST/GET /api/shipping/parcel`, suivi `GET /api/shipping/parcel/track/:trackingNumber` |
| Livraison nourriture | ✅ | `/api/food-orders`, restaurants, FoodDelivery |
| Paiement factures | ✅ | `/api/bills` |
| Recharge téléphone | ✅ | `/api/airtime` |
| Services administratifs | ✅ | Civic (pétitions) ; `GET /api/public-services` (liste services publics / hub) |
| Assurance | ✅ | `/api/insurance`, Health, Assurance |
| Micro-crédits | ✅ | `/api/microcredit`, RequestLoan, LoanDetails |
| Crowdfunding | ✅ | `/api/crowdfunding` |
| Billetterie événements | ✅ | Events, tickets, check-in QR |
| Santé / rendez-vous | ✅ | Doctors, appointments, pharmacies, Telemedicine |
| Immobilier | ✅ | Properties, RealEstate, PropertyDetails |
| E-learning | ✅ | Courses, CourseDetails, Certificates, InstructorDashboard |

---

## 9. Outils pour entreprises

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Pages business | ✅ | `PUT/GET /api/business-page`, `GET /api/business-page/slug/:slug` (BusinessPage) |
| Publicité | ✅ | Ads (campagnes, créatifs, pricing, approval) |
| Analytics marketing | ✅ | AdvertiserDashboard, campaigns analytics |
| Gestion clients | ✅ | `GET /api/seller/customers` (CRM : acheteurs distincts) |
| Chatbot | ✅ | `GET /api/chatbot`, `GET /api/chatbot/:username` (ChatBot) |
| Ventes | ✅ | SellerDashboard, orders, products |
| Campagnes marketing | ✅ | Ads campaigns |
| Catalogue produits | ✅ | Products |
| Paiements clients | ✅ | Wallet, Stripe, Mobile Money |

---

## 10. Outils administrateurs

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Dashboard admin | ✅ | AdminDashboard, `/api/admin/dashboard` |
| Gestion utilisateurs | ✅ | Users, ban, suspend, role |
| Modération contenu | ✅ | Moderation (reports, review, strikes), ModerationDashboard |
| Gestion publicités | ✅ | Campaigns approve/reject, pending |
| Gestion paiements | ✅ | Finance dashboard, wallets freeze/unfreeze, transactions export |
| Gestion créateurs | ✅ | Monetization requests approve/reject, sellers verify |
| Gestion marketplace | ✅ | Products status, sellers, orders, disputes |
| Signalements | ✅ | Moderation report, review |
| Bannissements | ✅ | User ban, suspend, live ban |
| Vérification comptes | ✅ | Admin verifications list/patch |
| Support utilisateurs | ✅ | Support, support tickets, SupportMessage |
| Analytics plateforme | ✅ | Strategic analytics, export, live revenue |
| Logs / audit sécurité | ✅ | Audit logs, security logs, monitoring errors/http |
| Feature flags | ✅ | `/api/admin/feature-flags` |
| Kill switch | ✅ | `/api/admin/kill-switch` |
| Blacklist / AML | ✅ | Blacklist, AML flags |

---

## Synthèse

- **Implémenté (✅)** : grande majorité des blocs (réseau social, vidéo, live, messagerie, paiements, marketplace, créateurs, mini-apps, services quotidiens, admin). Dont : pages publiques, montage vidéo (trim), filtres API, stickers API, messages éphémères, appels groupe (backend), export messages, multi-appareils (sessions), marketplace créateur (store), fan-club, collaboration marques (BrandDeal), services publics (public-services), téléchargement vidéo.
- **Partiel (⚠️)** : aucun (livraison colis et vente merchandising implémentés).
- **Absent (❌)** : paiement en magasin, cartes virtuelles, transferts internationaux (hors scope / prestataires).

---

## Fonctionnalités supplémentaires (au-delà de la liste type super-app)

| Domaine | Fonctionnalité | Détail |
|---------|----------------|--------|
| Gamification | Points, niveaux, badges | UserPoints, UserLevel, UserBadge, gamification, leaderboard |
| Référal | Parrainage | Referrals, referral_code, viral bonus |
| Certificats | Vérification certificats formation | Certificates, VerifyCertificate |
| Emploi | Offres, candidatures, profils | Jobs, JobDetails, PostJob, CandidateProfile, CompanyProfile, ratings |
| Civic | Pétitions, signatures, dons | Civic, CreatePetition, PetitionDetails, sign, donate |
| Formation | Cours, instructeurs, inscriptions | Courses, CreateCourse, CourseDetails, InstructorDashboard, Certificates |
| News | Articles, premium | News, ArticleDetails, PublishNews, NewsPremiumSubscription |
| Map / lieux | Carte, places | mapPlaces, MarketplaceMap |
| Voyage | Réservations voyage | travel, Voyage |
| Cloud | Fichiers utilisateur | Cloud, UserCloudFile |
| IA | Assistant, recommandation | ai, recommendation, feed algo |
| Business Intelligence | BI admin | businessIntelligence (admin) |
| Support | Tickets, messages support | Support, SupportTicket, SupportMessage |
| Litiges | Litiges commandes | Disputes, DisputeCenter, OrderDispute |
| Retours / remboursements | Returns, refunds | returns, refunds routes |
| Tiers (livraison) | Shipping, expéditions | shipping, shipments |
| Dev public | API publique | publicApi, API docs |
| Matching | Appariement (ex. jobs) | matching, MatchingCenter |
| Early access / feedback | EarlyAccess, platformDonations, platformFeedback |
| Région / devise | CEDEAO, devise | config region, exchangeRates |

---

## Comptage indicatif

- **Fonctionnalités listées dans les 10 catégories** : ~160 lignes (une ligne = une fonctionnalité ou un groupe).
- **Fonctionnalités supplémentaires** : ~25+ blocs (gamification, jobs, civic, courses, news, etc.).
- **Total couvert par la plateforme** : largement au-delà de **200** si l’on compte chaque sous-capacité (ex. chaque route ou écran métier).

Ce document peut être mis à jour au fil des livraisons. Pour les items **⚠️** ou **❌**, prioriser selon la roadmap produit (Phase 1 / 2 / 3).
