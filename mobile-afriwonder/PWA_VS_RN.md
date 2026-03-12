# PWA vs React Native — Ce qui est implémenté

## Réponse courte

**Non**, tout le code de la PWA n’a **pas** été réécrit en React Native. La PWA contient **plus de 100 pages** (Marketplace, Events, Transport, Jobs, Health, Admin, etc.). En mobile RN, seule la partie **Accueil / Création / Live / Profil / Découverte** a été portée, en reprenant la même logique que la PWA.

---

## Ce qui EST implémenté en React Native (réécrit depuis la PWA)

| PWA (page / composant) | React Native (écran / composant) | Statut |
|------------------------|-----------------------------------|--------|
| **Home.jsx** (feed vertical vidéos) | **HomeScreen.js** + **VideoCard.js** | ✅ Porté (feed, like, scroll, son, pas de rechargement intempestif) |
| **Create.jsx** (upload photo/vidéo, galerie, caméra, détails, catégories) | **CreateScreen.js** | ✅ Porté (étapes select → edit → details → uploading) |
| **Lives.jsx** (liste lives, discovery, catégories, tri, programmés, replays) | **LivesScreen.js** | ✅ Porté (+ recherche, portefeuille, retour Accueil) |
| **StartLive.jsx** (formulaire titre, catégorie, langue, battle, boutique) | **StartLiveScreen.js** | ✅ Porté |
| **LiveStream.jsx** (setup → streaming → ended, objectif dons, commentaires, terminer) | **LiveStreamScreen.js** | ✅ Porté (sans Agora/caméra réelle en RN) |
| **LiveView.jsx** (visionnage live, chat, objectif, créateur) | **LiveViewScreen.js** | ✅ Porté (sans Agora, sans cadeaux/dons UI complète) |
| **Discover** (vidéos) | **DiscoverScreen.js** | ✅ Porté (grille vidéos depuis feed) |
| **Profile.jsx** (profil utilisateur) | **ProfileScreen.js** | ✅ Partiel (profil de l’utilisateur connecté) |
| **Profil autre utilisateur** | **ProfileUserScreen.js** | ✅ Porté |
| **Search.jsx** | **SearchScreen.js** | ✅ Porté |
| **Notifications.jsx** | **NotificationsScreen.js** | ✅ Porté |
| **Support** | **SupportScreen.js** | ✅ Porté |
| **VideoView** (lecture vidéo détaillée) | **VideoViewScreen.js** | ✅ Porté |
| **Comments** (modale commentaires) | **CommentsScreen.js** | ✅ Porté |
| **RechargeWallet / getWallet** | **WalletScreen.js** | ✅ Porté (solde + info recharge) |
| **Auth / Login** | **AuthScreen.js** | ✅ Porté |

**API client mobile** : les appels utilisés par ces écrans sont alignés sur la PWA (auth, feed, videos, upload, live list/getById/start/end/sendChatMessage/getWallet + joinViewer, sendTip, sendGift, polls, like, report, etc.).

---

## Ce qui N’EST PAS implémenté en React Native (reste en PWA)

Tout le reste de la PWA n’est pas réécrit en RN. Exemples (liste non exhaustive) :

- **Marketplace** (Marketplace, Product, Cart, Checkout, Orders, SellerDashboard, etc.)
- **Événements** (Events, EventDetails, CreateEvent, Ticketing, MyEventTickets, etc.)
- **Transport** (Transport, RideHistory, BecomeDriver, DriverDashboard)
- **Restauration** (FoodDelivery, RestaurantMenu)
- **Santé** (Health, Telemedicine)
- **Immobilier** (RealEstate, PropertyDetails)
- **Assurance** (Insurance)
- **Jobs** (Jobs, JobDetails, PostJob, JobsEmployerDashboard, etc.)
- **Messages / Chat** (Inbox, Chat, DirectMessage)
- **Communautés** (Communities, CommunityDetails, CreateCommunity)
- **Actualités** (News, ArticleDetails, PublishNews)
- **Civic** (Civic, Petitions, CivicCreatorDashboard)
- **Formations / Cours** (Courses, CourseDetails, CreateCourse, Formations)
- **Paramètres avancés** (Settings, PrivacySettings, NotificationSettings, Language, Addresses)
- **Vendeur / Créateur** (BecomeSeller, SellerDashboard, SellerWallet, SellerOrders, CreatorTools, Analytics)
- **Prestataires** (Providers, ProviderProfile, BecomeProvider, ProviderDashboard)
- **Paiement** (MobileMoneyPayment, RechargeWallet complet avec flux paiement)
- **Admin / Modération** (AdminDashboard, ModerationDashboard, AdminPage)
- **Autres** (Stories, Playlists, EditVideo, Favorites, Wishlist, Referrals, Challenges, Leaderboard, GamificationHub, MiniAppsStore, DeveloperPortal, etc.)

La stratégie actuelle est d’utiliser la **PWA pour tout ça** (menu “Plus”, liens web, ou redirection depuis l’app).

---

## Différences techniques volontaires (RN vs PWA)

- **Vidéo live (Agora)** : en RN, pas d’intégration SDK Agora ; placeholder “Diffusion en cours” côté stream et viewer. Le reste (chat, objectif dons, terminer live) est en place.
- **Caméra / prévisualisation** : en LiveStream setup, pas d’aperçu caméra en RN (placeholder).
- **Cadeaux / dons** : API (sendGift, sendTip, getWallet) présentes ; l’UI complète type PWA (panneau cadeaux, montants, animations) n’est pas refaite en RN.
- **WebSocket live** : en PWA (useLiveSocket) pour temps réel ; en RN pas de WebSocket live, seulement polling (getById périodique).

---

## Résumé

- **Oui** : la partie **Accueil, Create, Live (liste + lancer + stream + regarder), Discover, Profil, Search, Notifications, Support, VideoView, Comments, Wallet** est réécrite en React Native en s’appuyant sur le code et la logique de la PWA.
- **Non** : tout le reste de la PWA (marketplace, événements, transport, jobs, santé, messages, paramètres avancés, admin, etc.) n’est **pas** implémenté en RN ; il reste dans la PWA.

Si tu veux qu’on porte d’autres parties précises de la PWA en RN, on peut les lister et les faire écran par écran.
