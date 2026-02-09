# Vérification Super-App – Backend, BDD, Frontend

Ce document confirme que les modules ci-dessous existent, utilisent la base de données (Prisma) et que le frontend est bien connecté au backend.

---

## Connexion Frontend ↔ Backend

- **URL API** : `VITE_API_URL` (défaut : `http://localhost:3000/api`) — définie dans `src/api/expressClient.js` et `.env.example`.
- **Authentification** : le client envoie `Authorization: Bearer <token>` et gère le refresh token (401).
- **CORS** : backend autorise `CORS_ORIGIN` (défaut : `http://localhost:5173`).

Pour que tout soit opérationnel :
1. Backend : `cd backend && npm run dev` (port 3000).
2. Frontend : `npm run dev` (port 5173).
3. `.env` ou `.env.local` : `VITE_API_URL=http://localhost:3000/api`.

---

## 🎫 Ticketing

| Élément | Statut | Détail |
|--------|--------|--------|
| **Modèle Prisma** | ✅ | `Ticket` (user_id, event_name, event_date, venue, price, quantity, total_amount, payment_method, status) |
| **Routes backend** | ✅ | `GET /api/tickets`, `GET /api/tickets/my`, `POST /api/tickets/purchase` — toutes utilisent `prisma.ticket` |
| **Client API** | ✅ | `api.tickets.list()`, `api.tickets.getMyTickets()`, `api.tickets.purchase(payload)` |
| **Page frontend** | ✅ | `Ticketing.jsx` — appelle `api.tickets.getMyTickets()` pour « Mes billets », fallback mock si erreur |

---

## 🚗 Ride (Transport)

| Élément | Statut | Détail |
|--------|--------|--------|
| **Modèles Prisma** | ✅ | `Ride`, `Driver` (liés à `User`) |
| **Routes backend** | ✅ | `GET/POST /api/rides`, `GET /api/rides/:id`, `PATCH /api/rides/:id/status` ; `GET /api/drivers/nearby`, `GET/PUT /api/drivers/me`, `GET /api/drivers/:id` — tout via Prisma |
| **Client API** | ✅ | `api.transport.rides.*`, `api.transport.drivers.listNearby()`, `getMyProfile()`, `updateProfile()` |
| **Page frontend** | ✅ | `Transport.jsx` — appelle `api.transport.drivers.listNearby({ vehicle_type, limit })` pour conducteurs à proximité |

---

## 🍔 Food / Restaurant

| Élément | Statut | Détail |
|--------|--------|--------|
| **Modèles Prisma** | ✅ | `Restaurant`, `MenuItem`, `FoodOrder` |
| **Routes backend** | ✅ | `GET/POST /api/restaurants`, `GET /api/restaurants/:id`, `GET /api/restaurants/:id/menu-items` ; `GET/POST /api/food-orders`, `GET /api/food-orders/:id` — tout via Prisma |
| **Client API** | ✅ | `api.food.restaurants.list/getById`, `api.food.menuItems.listByRestaurant`, `api.food.orders.list/create/getById` |
| **Page frontend** | ✅ | `FoodDelivery.jsx` — appelle `api.food.restaurants.list({ limit: 20 })` pour la liste des restaurants |

---

## 💳 Paiements (Airtime / Bills / Wallet)

| Élément | Statut | Détail |
|--------|--------|--------|
| **Modèles Prisma** | ✅ | `AirtimeRecharge`, `BillPayment` ; Wallet = module paiements existant (wallet/transactions) |
| **Routes backend** | ✅ | `POST /api/airtime/recharge`, `GET /api/airtime/recharges` ; `POST /api/bills/pay`, `GET /api/bills/payments` — Prisma. Wallet : `api/payments` (existant) |
| **Client API** | ✅ | `api.utilities.airtime.recharge/listMy`, `api.utilities.bills.pay/listMy` ; `api.payments.getWallet`, `getTransactions`, `withdrawFromWallet`, etc. |
| **Pages frontend** | ✅ | `Utilities.jsx` — airtime + bills (transactions récentes) ; `Wallet.jsx` — `api.payments.getWallet`, `getTransactions`, `withdrawFromWallet` |

---

## 🏥 Health (Doctor / Appointment / Pharmacy)

| Élément | Statut | Détail |
|--------|--------|--------|
| **Modèles Prisma** | ✅ | `Doctor`, `Appointment`, `Pharmacy` |
| **Routes backend** | ✅ | `GET/POST /api/doctors`, `GET /api/doctors/:id` ; `GET/POST /api/appointments`, `GET /api/appointments/:id` ; `GET/POST /api/pharmacies`, `GET /api/pharmacies/:id` — tout via Prisma |
| **Client API** | ✅ | `api.health.doctors.list/getById`, `api.health.appointments.list/create/getById`, `api.pharmacies.list/getById` |
| **Page frontend** | ✅ | `Telemedicine.jsx` — appelle `api.health.doctors.list({ limit: 10 })` pour médecins recommandés |

---

## 🏠 Property

| Élément | Statut | Détail |
|--------|--------|--------|
| **Modèle Prisma** | ✅ | `Property` (listing_type, address, price, etc.) |
| **Routes backend** | ✅ | `GET/POST /api/properties`, `GET /api/properties/:id` — Prisma |
| **Client API** | ✅ | `api.properties.list({ listing_type, ... })`, `getById`, `create` |
| **Page frontend** | ✅ | `RealEstate.jsx` — appelle `api.properties.list({ listing_type: listingType, limit: 20 })` |

---

## 🛡 Insurance

| Élément | Statut | Détail |
|--------|--------|--------|
| **Modèles Prisma** | ✅ | `InsurancePolicy`, `InsuranceClaim` |
| **Routes backend** | ✅ | `GET/POST /api/insurance/policies`, `GET/POST /api/insurance/claims` — Prisma |
| **Client API** | ✅ | `api.insurance.policies.listMy/subscribe`, `api.insurance.claims.listMy/create` |
| **Page frontend** | ✅ | `Insurance.jsx` — appelle `api.insurance.policies.listMy()` pour « Mes assurances » |

---

## 🔐 Sécurité & Infrastructure globale

| Élément | Statut | Détail |
|--------|--------|--------|
| **Rate limiting** | ✅ | `app.ts` : generalLimiter sur `/api/`, authLimiter (login/register/forgot), paymentLimiter, uploadLimiter, adminLimiter, webhookLimiter |
| **Anti-bot / Anti-spam** | ✅ | `antiBotMiddleware` sur toutes les routes ; `antiSpamMiddleware` sur comments, messages, news |
| **CORS** | ✅ | `cors({ origin: CORS_ORIGIN \|\| 'http://localhost:5173', credentials: true })` |
| **Helmet** | ✅ | `app.use(helmet())` |
| **Health** | ✅ | `GET /health`, `GET /health/ready` (DB), `GET /health/errors` (optionnel, protégé par clé) |
| **Sentry** | ✅ | Intégré (request/tracing/error) si `SENTRY_DSN` défini |
| **Swagger** | ✅ | `http://localhost:3000/api-docs` |

---

## Pages liées mais non enregistrées

Les liens suivants utilisent `createPageUrl(...)` mais les pages ne sont pas dans `PAGES` (pages.config.js) : **RideHistory**, **BecomeDriver**, **RestaurantMenu**, **TicketDetails**, **PropertyDetails**. Les URLs générées (ex. `/RideHistory`) peuvent ne pas avoir de composant associé. Vous pouvez ajouter ces pages plus tard si besoin.

---

## Résumé

- **Backend** : Toutes les routes super-app sont enregistrées dans `app.ts` et utilisent **Prisma** (aucun mock en base).
- **Frontend** : Les 7 pages (Transport, FoodDelivery, Utilities, Telemedicine, RealEstate, Insurance, Ticketing) + Wallet utilisent le **client API** `expressClient.js` avec `VITE_API_URL`.
- **Connexion** : Opérationnelle avec `VITE_API_URL=http://localhost:3000/api` et backend sur port 3000, frontend sur 5173.
