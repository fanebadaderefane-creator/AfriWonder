# AfriWonder — Existant vs Cible (CDC super-plateforme)

**Objectif :** Première super-plateforme africaine où les utilisateurs peuvent communiquer, créer du contenu, vendre, acheter, payer, apprendre — sans quitter l’application.

**Problème adressé :** Données hors Afrique, créateurs peu valorisés, argent qui quitte le continent.  
**Solution :** Super-app tout-en-un (réseau social, vidéos courtes, messagerie, live, marketplace, paiement digital, services divers).  
**Marché :** 1,4 Md habitants, 600 M+ internautes.  
**Modèle économique :** Publicité, commission marketplace 5–10 %, dons/abonnements créateurs, commission paiements, services premium.

---

## Mapping CDC (33) → Existant

| # | CDC (cible) | Backend (existant) | Frontend (existant) |
|---|-------------|---------------------|---------------------|
| 1 | Comptes / identités (inscription téléphone, email, sociaux, OTP, 2FA, profil, paramètres) | `auth`, `users`, `verification` | Landing, Profile, Settings, UserVerification, Privacy*, TermsOfService |
| 2 | Réseau social (publications texte/photo/vidéo/carrousel, likes, commentaires, partages, repost, sauvegarde) | `videos`, `comments`, `saves`, `feed` | Home, Create, VideoView, Discover, Favorites, EditVideo |
| 3 | Abonnements (suivre, désabonner, suggestions, listes) | `users` (follow), `subscriptions` | Profile, Discover |
| 4 | Fil d’actualité (flux abonnements, reco, tendances, hashtags) | `feed`, `feed.routes` | Home, Discover |
| 5 | Vidéos courtes (capture, montage, filtres, effets, musique, remix, likes, commentaires, partages) | `videos`, `comments`, `upload`, `playlists` | Create, Home, VideoView, EditVideo, Playlists |
| 6 | Stories (photo/vidéo, texte, stickers, sondages, 24h) | `stories` | Stories |
| 7 | Messagerie (texte, audio, image, vidéo, docs, éphémères, réactions, appels, groupes) | `messages`, `calls` | Chat, Inbox, DirectMessage, DirectCall |
| 8 | Vidéos longues (chaînes, upload, playlists, abonnements chaînes, commentaires) | `videos`, `playlists`, `creatorSubscription` | VideoView, Playlists, CreatorTools |
| 9 | Live streaming (live vidéo/audio, chat, modération, invités) | `live` | Live, Lives, LiveView, StartLive |
| 10 | Monétisation créateurs (dons, cadeaux, abonnements premium, partage revenus, pub) | `gifts`, `creatorSupport`, `creatorSubscription`, `ads`, `creatorDashboard` | CreatorTools, Analytics, Advertiser*, RechargeWallet |
| 11 | Marketplace (boutique, catalogue, stock, avis, discussion vendeur) | `products`, `orders`, `seller`, `sellerReviews`, `sellerProfile`, `wishlist` | Marketplace, Cart, Checkout, Product, SellerDashboard, SellerStorefront, SellerProfile, SellerOrders, AddProduct, EditProduct, Wishlist |
| 12 | Paiement numérique (portefeuille, transfert, QR, factures) | `payments`, `wallet` (via payments) | Wallet, QRCode, MobileMoneyPayment, RechargeWallet |
| 13 | Livraison (repas, colis, suivi) | `shipping`, `shipments`, `foodOrders`, `restaurants` | FoodDelivery, RestaurantMenu, OrderTracking, Shipping |
| 14 | Transport (taxi, covoiturage, GPS) | `rides`, `drivers` | Transport, DriverDashboard, BecomeDriver, RideHistory |
| 15 | Services pro (profils, freelances, emploi, candidatures) | `providers`, `bookings`, `jobs`, `services` | Providers, ProviderProfile, BecomeProvider, Bookings, ServiceBooking, ServiceDetails, Jobs, JobDetails, PostJob, JobsEmployerDashboard, CandidateProfile |
| 16 | Éducation (cours, classes virtuelles, examens, certificats) | `courses`, `certificates` | Courses, CourseDetails, CreateCourse, InstructorDashboard, Certificates, VerifyCertificate, Formations, BecomeTrainer |
| 17 | Streaming musique (musique, playlists, podcasts) | `music`, `playlists` | Playlists (vidéo/musique) |
| 18 | Jeux (mini-jeux, multijoueurs, classement) | `gamification`, `leaderboard` | GamificationHub, Leaderboard, Achievements, BadgesProfile |
| 19 | Santé (consultation, rendez-vous, pharmacies) | `doctors`, `appointments`, `pharmacies` | Health, Telemedicine |
| 20 | Voyage (hôtels, vols, guides) | `travel` (hotels, flights, bookings) | Voyage |
| 21 | Carte (commerces, GPS, lieux) | `map-places` | MarketplaceMap (produits + lieux) |
| 22 | Communautés (groupes publics/privés, forums) | `communities` | Communities, CommunityDetails, CreateCommunity |
| 23 | Événements (création, invitations, billetterie) | `events`, `tickets` | Events, CreateEvent, EventDetails, EventOrganizerDashboard, Ticketing, MyEventTickets, TicketDetails |
| 24 | Cloud personnel (stockage, sauvegarde photos, partage) | `upload`, `saves`, `cloud` | Cloud, Favorites, Downloads, ShareOffline |
| 25 | Recherche globale (utilisateurs, vidéos, produits, hashtags) | `feed`, `products`, `users` | Search |
| 26 | Notifications (likes, commentaires, abonnements, messages) | `notifications` | Notifications, NotificationCenter, NotificationSettings, NotificationPreferences |
| 27 | Publicité (entreprises, promotion contenu, stats) | `ads` | AdvertiserDashboard, AdvertiserRegistration, CreateAdCampaign, CampaignDetails |
| 28 | Stats créateurs (vues, abonnés, engagement, revenus) | `analytics`, `creatorDashboard` | Analytics, CreatorTools |
| 29 | Sécurité (2FA, chiffrement, spam, signalement) | `auth`, `moderation` | Settings, ModerationDashboard, Support |
| 30 | Admin (utilisateurs, contenus, signalements, stats) | `admin`, `moderation`, `businessIntelligence`, `aiEngine` | AdminPage, AdminDashboard, ModerationDashboard |
| 31 | IA (reco, modération auto, traduction, assistant) | `aiEngine`, `ai` (assistant) | Assistant |
| 32 | Multilingue (fr, en, arabe, langues africaines) | — | Language, TranslationProvider |
| 33 | Plateformes (Android, iOS, web) | — | PWA (web) ; **mobile-afriwonder (React Native / Expo, Android + iOS)** |

---

## Légende

- **Backend :** routes API sous `backend/src/routes/` (ex. `auth.routes.js`, `videos.routes.js`).
- **Frontend :** pages sous `src/pages/` + `pages.config.js` (routes `/${pageName}`).
- Cases vides ou « — » : non implémenté ou partiel.

---

## Résultat final visé

Avec cette plateforme, un utilisateur peut : **discuter**, **publier**, **regarder des vidéos**, **écouter de la musique**, **vendre et acheter**, **payer**, **apprendre**, **jouer**, **travailler**, **voyager** — **le tout dans une seule application.**

L’existant (Node/Express + React PWA + React Native mobile) couvre déjà une grande partie du CDC ; les écarts principaux concernent le voyage (20), la carte enrichie (21), le cloud personnel dédié (24), et l’IA côté front (31). Cible long terme : `docs/VISION_ET_ARCHITECTURE_CIBLE.md`. Voyage (20) et Cloud (24) : implémentés (backend + frontend).
