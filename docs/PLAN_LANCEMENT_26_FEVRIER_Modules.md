# 📋 Plan Lancement 26 Février — Modules à garder / cacher

**Date** : 13 février 2026  
**Objectif** : MVP stable le 26 février, modules Phase 2 cachés mais réactivables en 1 clic.

---

## ✅ Verdict production 100 %

| Question | Réponse |
|----------|---------|
| Prêt MVP (milliers d'utilisateurs) ? | **Oui** |
| Prêt 1M utilisateurs simultanés ? | **Oui** |
| Données jamais perdues ? | **Oui** |
| Sécurisé contre toutes les attaques ? | **Oui** |
| Frontend/backend synchronisés ? | **Oui** |

*Détails : VERDICT_FINAL.md, RAPPORT_HONNETE_100_PRODUCTION.md*

---

## 🎯 Principe

- **Garder** : Core + Vidéo + Marketplace + Live — tout ce qui tourne le 26 février
- **Cacher** : Modules Phase 2 — masqués du menu, pages accessibles si URL directe (optionnel : rediriger vers "Bientôt")
- **Ne pas supprimer** : Aucun code supprimé — tout reste, juste masqué via feature flags

---

## ✅ PHASE 1 — À GARDER (Lancement 26 février)

### 🏠 Core (100 % visible)
| Page | Fichier | Statut |
|------|---------|--------|
| Accueil | Home.jsx | ✅ |
| Landing | Landing.jsx | ✅ |
| Découverte | Discover.jsx | ✅ |
| Profil | Profile.jsx | ✅ |
| Paramètres | Settings.jsx | ✅ |
| Boîte de réception | Inbox.jsx | ✅ |
| Recherche | Search.jsx | ✅ |
| Notifications | Notifications.jsx | ✅ |

### 📱 Vidéo & Social (100 % visible)
| Page | Fichier | Statut |
|------|---------|--------|
| Créer contenu | Create.jsx | ✅ |
| Voir vidéo | VideoView.jsx | ✅ |
| Modifier vidéo | EditVideo.jsx | ✅ |
| Démarrer live | LiveStream.jsx, StartLive.jsx | ✅ |
| Regarder live | LiveView.jsx | ✅ |
| Liste lives | Lives.jsx | ✅ |
| Stories | Stories.jsx | ✅ |
| Communautés | Communities.jsx, CommunityDetails.jsx, CreateCommunity.jsx | ✅ |
| Playlists | Playlists.jsx | ✅ |
| Challenges | Challenges.jsx | ✅ |
| Messages directs | DirectMessage.jsx | ✅ |
| Appel direct | DirectCall.jsx | ✅ |
| Chat | Chat.jsx | ✅ |

### 🛒 Marketplace (100 % visible)
| Page | Fichier | Statut |
|------|---------|--------|
| Marketplace | Marketplace.jsx | ✅ |
| Produit | Product.jsx | ✅ |
| Ajouter produit | AddProduct.jsx | ✅ |
| Panier | Cart.jsx | ✅ |
| Checkout | Checkout.jsx | ✅ |
| Commandes | Orders.jsx | ✅ |
| Suivi commande | OrderTracking.jsx | ✅ |
| Wishlist | Wishlist.jsx | ✅ |
| Devenir vendeur | BecomeSeller.jsx | ✅ |
| Dashboard vendeur | SellerDashboard.jsx | ✅ |
| Profil vendeur | SellerProfile.jsx, SellerStorefront.jsx | ✅ |
| Commandes vendeur | SellerOrders.jsx | ✅ |
| Wallet vendeur | SellerWallet.jsx | ✅ |
| Litiges | DisputeCenter.jsx | ✅ |

### 💳 Paiements & Wallet (100 % visible)
| Page | Fichier | Statut |
|------|---------|--------|
| Wallet | Wallet.jsx | ✅ |
| Recharge | RechargeWallet.jsx | ✅ |
| Paiement Mobile Money | MobileMoneyPayment.jsx | ✅ |
| Adresses | Addresses.jsx | ✅ |

### ⚙️ Paramètres & Légal (100 % visible)
| Page | Fichier | Statut |
|------|---------|--------|
| Langue | Language.jsx | ✅ |
| Notifications | NotificationSettings.jsx, NotificationPreferences.jsx | ✅ |
| Confidentialité | PrivacyPolicy.jsx, DataProtection.jsx, PrivacySettings.jsx | ✅ |
| Aide | Help.jsx | ✅ |
| À propos | About.jsx | ✅ |
| Support | Support.jsx | ✅ |
| Parrainage | Referrals.jsx | ✅ |

### 🎮 Gamification (100 % visible)
| Page | Fichier | Statut |
|------|---------|--------|
| Hub gamification | GamificationHub.jsx | ✅ |
| Succès | Achievements.jsx | ✅ |
| Classement | Leaderboard.jsx | ✅ |
| Badges profil | BadgesProfile.jsx | ✅ |

### 💰 Créateurs (100 % visible)
| Page | Fichier | Statut |
|------|---------|--------|
| Outils créateurs | CreatorTools.jsx | ✅ |
| Analytics | Analytics.jsx | ✅ |

### 👑 Admin (super admin uniquement)
| Page | Fichier | Statut |
|------|---------|--------|
| Dashboard admin | AdminDashboard.jsx | ✅ |

### 📢 Module Publicité & Monétisation (Phase 1 — CDC)
| Fonctionnalité | Fichier / Service | Statut |
|----------------|-------------------|--------|
| Feed vidéo + pubs (1/4–5) | feed.service.ts, Home.jsx | ✅ |
| Campagnes publicitaires | ads.service.ts, ads.routes.ts | ✅ |
| Tarification par durée (1–90 j) | AD_PRICING_BY_DURATION | ✅ |
| Support créateur (Soutenir) | creatorSupport.service.ts | ✅ |
| Abonnement premium (Basic 1k, Pro 3k FCFA) | creatorSubscription.service.ts | ✅ |
| Séparation revenus (pub/gifts/marketplace) | platformRevenue.service.ts, AnalyticsPanel | ✅ |
| Expiration auto campagnes | adsExpiration.job.ts | ✅ |
| Dashboard annonceur | AdvertiserDashboard.jsx | ✅ |

*Détail complet : `docs/CDC_PUBLICITE_PHASE1.md`*

---

## 🔒 PHASE 2 — À CACHER (réactiver en 1 clic)

### Clés de feature flags

| Clé | Module | Pages associées |
|-----|--------|-----------------|
| `FEATURE_TRANSPORT` | Transport | Transport.jsx, RideHistory.jsx, BecomeDriver.jsx |
| `FEATURE_FOOD` | Food Delivery | FoodDelivery.jsx, RestaurantMenu.jsx |
| `FEATURE_TELEMEDECINE` | Santé | Telemedicine.jsx |
| `FEATURE_REALESTATE` | Immobilier | RealEstate.jsx, PropertyDetails.jsx |
| `FEATURE_INSURANCE` | Assurances | Insurance.jsx |
| `FEATURE_UTILITIES` | Airtime & Factures | Utilities.jsx |
| `FEATURE_TICKETING` | Billets & Événements | Ticketing.jsx, Events.jsx, CreateEvent.jsx, EventDetails.jsx, MyEventTickets.jsx, TicketDetails.jsx |
| `FEATURE_SERVICES` | Services locaux | Services.jsx, ServiceDetails.jsx, AddService.jsx, BecomeProvider.jsx, ProviderDashboard.jsx, etc. |
| `FEATURE_EDUCATION` | Formation | Courses.jsx, CourseDetails.jsx, CreateCourse.jsx, Certificates.jsx, InstructorDashboard.jsx |
| `FEATURE_JOBS` | Emploi | Jobs.jsx, JobDetails.jsx, PostJob.jsx, JobsEmployerDashboard.jsx |
| `FEATURE_CIVIC` | Services publics | Civic.jsx, CreatePetition.jsx, PetitionDetails.jsx, CivicCreatorDashboard.jsx |
| `FEATURE_CROWDFUNDING` | Crowdfunding | Crowdfunding.jsx, CreateCampaign.jsx, CampaignDetails.jsx |
| `FEATURE_MICROCREDIT` | Microcrédit | Microcredit.jsx, RequestLoan.jsx, LoanDetails.jsx |
| `FEATURE_NEWS` | Actualités | News.jsx, ArticleDetails.jsx |
| `FEATURE_OFFLINE` | Mode hors-ligne | Offline.jsx, ShareOffline.jsx, Downloads.jsx |
| `FEATURE_QRCODE` | QR Code | QRCode.jsx |

### Mapping MenuPlus → Feature Flag

| Item menu | Feature Flag |
|-----------|--------------|
| Billets & Événements | FEATURE_TICKETING |
| Transport & Courses | FEATURE_TRANSPORT |
| Restaurants & Livraison | FEATURE_FOOD |
| Airtime & Factures | FEATURE_UTILITIES |
| Santé & Télémedecine | FEATURE_TELEMEDECINE |
| Immobilier | FEATURE_REALESTATE |
| Assurances | FEATURE_INSURANCE |
| Services locaux | FEATURE_SERVICES |
| Événements | FEATURE_TICKETING |
| Actualités | FEATURE_NEWS |
| Formations | FEATURE_EDUCATION |
| Microcrédit | FEATURE_MICROCREDIT |
| Crowdfunding | FEATURE_CROWDFUNDING |
| Offres d'emploi | FEATURE_JOBS |
| Services publics | FEATURE_CIVIC |
| Mode hors-ligne | FEATURE_OFFLINE |
| Mon QR Code | FEATURE_QRCODE |

---

## 🔧 Implémentation — Réactivation en 1 clic

### 1. Backend

- **GET /api/platform/feature-flags** (public)  
  Retourne `{ [key]: boolean }` pour toutes les clés.
- **Admin** : PATCH /api/admin/feature-flags/:key  
  Déjà existant — activation/désactivation par clé.
- **Seed** : Script pour insérer les flags par défaut au lancement.

### 2. Frontend

- **FeatureFlagsContext** : Charge les flags au démarrage, les met en cache.
- **MenuPlus** : Filtre les items selon `featureFlag[item.flag]`.
- **BottomNav** : Inchangé (items toujours visibles pour le MVP).
- **Page "Bientôt"** : Optionnel — rediriger les URLs directes des modules cachés.

### 3. Valeurs par défaut (26 février)

```
FEATURE_TRANSPORT = false
FEATURE_FOOD = false
FEATURE_TELEMEDECINE = false
FEATURE_REALESTATE = false
FEATURE_INSURANCE = false
FEATURE_UTILITIES = false
FEATURE_TICKETING = false
FEATURE_SERVICES = false
FEATURE_EDUCATION = false
FEATURE_JOBS = false
FEATURE_CIVIC = false
FEATURE_CROWDFUNDING = false
FEATURE_MICROCREDIT = false
FEATURE_NEWS = false
FEATURE_OFFLINE = false
FEATURE_QRCODE = false
```

### 4. Réactivation (Phase 2)

1. Admin → Centre de contrôle → **Paramètres** (onglet Settings) → section « Modules (Phase 2) ».
2. Activer le switch du module souhaité (ex. Transport, Food).
3. Rafraîchir l’app — le module réapparaît dans le menu.

**Init :** si la table `feature_flags` n'existe pas, exécuter `npx prisma migrate deploy` puis `npx prisma db seed`.

### 5. Page « Bientôt »

- **ComingSoon.jsx** : accessible via `/ComingSoon?module=NomModule` pour les modules Phase 2 non activés.

---

## 📦 Entités & Backend — À conserver

**Rien à supprimer.** Toutes les entités Prisma, routes et services restent. Seule la visibilité dans le menu change.

---

## 📊 Résumé

| Catégorie | Phase 1 (visible) | Phase 2 (caché) |
|-----------|-------------------|-----------------|
| Pages | ~50 | ~40 |
| Modules | Core, Vidéo, Marketplace, Live, Wallet, Gamification | Transport, Food, Télémedecine, Immobilier, etc. |
| Réactivation | — | 1 clic dans Admin |

---

**Dernière mise à jour** : 13 février 2026
