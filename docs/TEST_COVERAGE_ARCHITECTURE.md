# Couverture des tests – Architecture AfriWonder / Africonnect

Ce document décrit comment les tests (unitaires, intégration backend, E2E) couvrent l’architecture complète du projet (entities, pages, components, backend routes, functions).

## Résumé

| Domaine | Couverture | Détail |
|--------|------------|--------|
| **Pages (100+)** | E2E + Unit | E2E : toutes les routes visitées (publiques + protégées après login). Unit : smoke render pour toutes les pages (quelques pages skippées en unit, couvertes en E2E). |
| **Backend API** | Intégration | health, auth, products, orders, cart, payments, reviews, admin, videos, comments, saves, live, communities, events, courses, certificates, challenges, leaderboard, crowdfunding, microcredit, civic, news, messages, bookings, providers, services, seller, platform, security, smoke + **routes-coverage** (toutes les routes montées dans `app.ts`). |
| **E2E** | Playwright | auth, auth-flow, navigation, payment, payment-wallet-flow, smoke-home + **full-architecture-routes** (pages publiques, pages protégées après login, sections clés par domaine). |
| **Composants** | Partiel | ErrorBoundary, BottomNav, TopHeader, ui-core, Layout, App, PageNotFound, About, Home, Landing, Offline, TermsOfService. |
| **Entities (JSON)** | N/A | Schémas de données ; pas de tests unitaires dédiés (utilisés par le backend/Prisma). |
| **Functions (backend)** | Via routes | Logique métier testée via les tests d’API (routes). |

---

## 1. Tests E2E (Playwright)

- **Répertoire** : `tests/e2e/`
- **Config** : `playwright.config.ts` (chromium desktop/mobile, webkit mobile).
- **Helpers** : `tests/e2e/helpers.ts` (dismissCookieBanner, clickLoginButton, clickRegisterButton).

### Fichiers et rôles

| Fichier | Rôle |
|---------|------|
| `auth.spec.ts` | Inscription, login, erreurs (mauvais mot de passe, email déjà utilisé). |
| `auth-flow.spec.ts` | Parcours authentification complet. |
| `navigation.spec.ts` | Accès aux pages clés (home, search, profile), mobile. |
| `payment.spec.ts` | Accès portefeuille, tunnel de paiement (utilisateur connecté). |
| `payment-wallet-flow.spec.ts` | Parcours paiement / portefeuille. |
| `smoke-home.spec.ts` | Smoke de la home. |
| **`full-architecture-routes.spec.ts`** | **Couverture de l’architecture complète** : pages publiques (Landing, About, TermsOfService, etc.), toutes les pages protégées après login (une par une), et sections clés (Vidéo & Social, Marketplace, Services, Super-app, Contenu, Gamification, Paramètres). |

### Lancer les E2E

```bash
npm run test:e2e
```

En CI, les E2E s’exécutent après `test-backend` et `test-frontend`, avec backend + frontend démarrés.

---

## 2. Tests unitaires frontend (Vitest)

- **Répertoire** : `src/**/*.test.{js,jsx,ts,tsx}` (y compris `src/pages/__tests__/`).
- **Config** : `vitest.config.js` (jsdom, setup `src/test/setup.js` + `setupTests.ts`).

### Pages

- **`src/pages/__tests__/all-pages-smoke.test.jsx`** : smoke render de **toutes** les pages exportées dans `pages.config.js` (PAGES). Les pages qui nécessitent des données ou deps spécifiques en unit sont skippées (listées dans `SKIP_SMOKE_PAGES`) et restent couvertes par l’E2E `full-architecture-routes.spec.ts`.
- Tests dédiés existants : `Home.test.jsx`, `Landing.test.jsx`, `About.test.jsx`, `TermsOfService.test.jsx`, `Offline.test.jsx`, `Ticketing.test.jsx` (dans `src/pages/__tests__/`).

### Composants / racine

- `App.test.jsx`, `Layout.test.jsx`, `lib/PageNotFound.test.jsx`, `components/common/ErrorBoundary.test.jsx`, `components/navigation/BottomNav.test.jsx`, `components/navigation/TopHeader.test.jsx`, `components/ui/ui-core.test.jsx`.

### Lancer les tests frontend

```bash
npm run test
npm run test:coverage
```

---

## 3. Tests backend (Jest)

- **Répertoire** : `backend/__tests__/` et `backend/src/**/__tests__/`.
- **Config** : `backend/jest.config.js` (ts-jest ESM, `setup.ts`).

### Fichiers existants (résumé)

- **Auth** : `auth.test.ts`, `src/auth/__tests__/auth.routes.test.ts`
- **Produits / commandes / panier** : `products.test.ts`, `orders.test.ts`, `cart.test.ts`, `src/__tests__/order.service.test.ts`, `src/__tests__/marketplace.test.ts`
- **Paiements** : `payments.test.ts`, `src/payments/__tests__/payments.routes.test.ts`
- **Avis, admin, santé** : `reviews.test.ts`, `admin.test.ts`, `health.test.ts`
- **Vidéos / social** : `videos.test.ts`, `comments.test.ts`, `saves.test.ts`, `live.test.ts`, `communities.test.ts`
- **Contenu / services** : `events.test.ts`, `courses.test.ts`, `certificates.test.ts`, `challenges.test.ts`, `leaderboard.test.ts`, `crowdfunding.test.ts`, `microcredit.test.ts`, `civic.test.ts`, `news.test.ts`, `messages.test.ts`, `bookings.test.ts`, `providers.test.ts`, `services.test.ts`, `seller.test.ts`
- **Plateforme / sécurité** : `platform.test.ts`, `security.test.ts`, `smoke.critical-path.test.ts`
- **Couverture des routes** : **`routes-coverage.test.ts`** : vérifie que toutes les routes API montées dans `backend/src/app.ts` répondent (200, 401, 400, etc.) et non 404 (route non trouvée). Couvre auth, videos, products, orders, cart, payments, reviews, platform, events, communities, challenges, courses, news, services, providers, rides, drivers, restaurants, food-orders, tickets, properties, insurance, appointments, doctors, civic, crowdfunding, microcredit, jobs, gamification, certificates, leaderboard, live, notifications, disputes, support, addresses, admin, commissions, exchange-rates, bills, airtime.

### Lancer les tests backend

```bash
cd backend
npm run test:db:prepare
npm run test
npm run test:coverage
```

---

## 4. Mapping architecture → tests

### Pages (répertoire `src/pages/`)

- **Core** : Home, Landing, Discover, Profile, Settings, Inbox, Search, Notifications → E2E full-architecture + unit smoke (ou skip en unit).
- **Vidéo & Social** : Create, VideoView, EditVideo, LiveStream, StartLive, Lives, Stories, Communities, CommunityDetails, CreateCommunity, Playlists, Challenges, DirectMessage, DirectCall, Chat → idem.
- **Marketplace** : Marketplace, Product, AddProduct, EditProduct, Cart, Checkout, Orders, OrderTracking, Wishlist, BecomeSeller, SellerDashboard, SellerProfile, SellerStorefront, SellerOrders, SellerWallet, SellerPromotions, DisputeCenter, etc. → idem.
- **Services** : Services, ServiceDetails, ServiceBooking, Bookings, BookingDetails, Providers, ProviderProfile, BecomeProvider, ProviderDashboard, AddService, etc. → idem.
- **Transport, Food, Télémedecine, Immobilier, Billettérie, Utilities, Assurance** : Transport, FoodDelivery, Telemedicine, RealEstate, Ticketing, Utilities, Insurance, etc. → E2E full-architecture + unit smoke (ou skip).
- **Contenu** : News, ArticleDetails, Courses, CourseDetails, CreateCourse, Certificates, Jobs, JobDetails, PostJob, Civic, CreatePetition, PetitionDetails, Crowdfunding, CreateCampaign, CampaignDetails, Microcredit, RequestLoan, LoanDetails → idem.
- **Gamification, Créateurs, Paramètres, Admin** : GamificationHub, Achievements, Leaderboard, BadgesProfile, CreatorTools, Analytics, Settings, Help, Support, DeveloperPortal, AdminDashboard, ModerationDashboard, etc. → idem.

### Backend (répertoire `backend/src/routes/`)

Toutes les routes montées dans `app.ts` sont soit testées par des fichiers dédiés (auth, products, orders, …), soit vérifiées par **`routes-coverage.test.ts`** (au moins une requête par préfixe pour confirmer que la route existe et répond).

### Composants (répertoire `src/components/`)

- Couverture actuelle : navigation (BottomNav, TopHeader), common (ErrorBoundary), ui (ui-core). Le reste est couvert indirectement par les tests de pages et E2E.
- Extension possible : ajouter des tests ciblés pour payment, marketplace, video, etc., au besoin.

### Entities (répertoire `entities/`)

- Fichiers JSON de schémas ; pas de tests unitaires directs. Utilisés par le backend (Prisma / logique métier) et couverts via les tests d’API.

### Functions (répertoire `functions/`)

- Logique backend ; couverture via les tests des routes et services qui les appellent.

---

## 5. CI/CD

- **Fichier** : `.github/workflows/ci.yml`
- **Jobs** :
  - **test-backend** : PostgreSQL, migrations, `npm run test:coverage`
  - **test-frontend** : lint, `npm run test:coverage`, build
  - **test-e2e** : après backend + frontend, démarre backend + frontend, lance Playwright (`npm run test:e2e`)
  - **security-scan** : Snyk (optionnel)
  - **notify-on-failure** : alerte en cas d’échec sur `main`

Les tests décrits ci-dessus (E2E full-architecture, unit pages smoke, backend routes-coverage) sont inclus dans cette pipeline.

---

## 6. Pour aller plus loin

- Réduire la liste `SKIP_SMOKE_PAGES` en rendant les pages concernées plus résilientes (données optionnelles, guards) ou en enrichissant les mocks.
- Ajouter des tests unitaires ou d’intégration ciblés pour les composants payment, marketplace, video.
- Ajouter des tests backend plus fins (cas métier) pour les routes super-app (rides, food-orders, insurance, etc.) au-delà de `routes-coverage.test.ts`.
