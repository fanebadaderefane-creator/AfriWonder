# Vérification Frontend ↔ Backend — Connectés et synchronisés

## Configuration

| Côté | Variable | Valeur par défaut |
|------|----------|-------------------|
| **Frontend** | `VITE_API_URL` | `http://localhost:3000/api` |
| **Backend** | `CORS_ORIGIN` | `http://localhost:5173` |

Le front (Vite) tourne en dev sur **5173**, le backend sur **3000**. Les appels partent vers `baseURL = VITE_API_URL`, donc `http://localhost:3000/api`. CORS autorise `http://localhost:5173`.

---

## Par module

### 🎫 Ticketing (Events + Billets)

| Frontend (api) | Backend (route) | Statut |
|----------------|-----------------|--------|
| `api.events.list()` | GET `/api/events` | ✅ |
| `api.events.getById(id)` | GET `/api/events/:id` | ✅ |
| `api.events.book(eventId, payload)` | POST `/api/events/:id/book` | ✅ |
| `api.events.confirmPayment(paymentId)` | POST `/api/events/payments/:id/confirm` | ✅ |
| `api.events.getMyTickets()` | GET `/api/events/my-tickets` | ✅ |
| `api.events.checkIn(qrCode)` | POST `/api/events/check-in` (body `qr_code`) | ✅ |
| `api.tickets.getMyTickets()` | GET `/api/tickets/my` | ✅ (modèle Ticket générique) |
| `api.tickets.getById(id)` | GET `/api/tickets/:id` | ✅ |
| `api.tickets.purchase(payload)` | POST `/api/tickets/purchase` | ✅ |

**Note** : Réservation **événement** = `api.events.book()`. Billets **génériques** = `api.tickets.*`.

---

### 🚗 Ride

| Frontend (api) | Backend (route) | Statut |
|----------------|-----------------|--------|
| `api.transport.rides.list()` | GET `/api/rides` | ✅ |
| `api.transport.rides.getById(id)` | GET `/api/rides/:id` | ✅ |
| `api.transport.rides.create(payload)` | POST `/api/rides` | ✅ |
| `api.transport.rides.updateStatus(id, status)` | PATCH `/api/rides/:id/status` | ✅ |
| `api.transport.drivers.listNearby(params)` | GET `/api/drivers/nearby` | ✅ |
| `api.transport.drivers.getById(id)` | GET `/api/drivers/:id` | ✅ |
| `api.transport.drivers.getMyProfile()` | GET `/api/drivers/me` | ✅ |
| `api.transport.drivers.updateProfile(payload)` | PUT `/api/drivers/me` | ✅ |

---

### 🍔 Food / Restaurant

| Frontend (api) | Backend (route) | Statut |
|----------------|-----------------|--------|
| `api.food.restaurants.list()` | GET `/api/restaurants` | ✅ |
| `api.food.restaurants.getById(id)` | GET `/api/restaurants/:id` | ✅ |
| `api.food.menuItems.listByRestaurant(restaurantId)` | GET `/api/restaurants/:id/menu-items` | ✅ |
| `api.food.orders.list()` | GET `/api/food-orders` | ✅ |
| `api.food.orders.create(payload)` | POST `/api/food-orders` | ✅ |
| `api.food.orders.getById(id)` | GET `/api/food-orders/:id` | ✅ (avec `status_history` pour tracking) |

---

### 💳 Paiements (Orange Money, Wallet, Airtime, Bills)

| Frontend (api) | Backend (route) | Statut |
|----------------|-----------------|--------|
| `api.payments.initiateOrangeMoney(orderId, amount, phone, returnUrl)` | POST `/api/payments/orange-money` | ✅ **Header `Idempotency-Key` requis** |
| `api.payments.verifyOrangeMoney(orderId, status, payToken)` | POST `/api/payments/orange-money/verify` | ✅ |
| `api.payments.getWallet()` | GET `/api/payments/wallet` | ✅ |
| `api.payments.getTransactions()` | GET `/api/payments/transactions` | ✅ |
| `api.utilities.airtime.recharge(payload)` | POST `/api/airtime/recharge` | ✅ |
| `api.utilities.airtime.listMy()` | GET `/api/airtime/recharges` | ✅ |
| `api.utilities.bills.pay(payload)` | POST `/api/bills/pay` | ✅ |
| `api.utilities.bills.listMy()` | GET `/api/bills/payments` | ✅ |

**Important** : Pour **POST /api/payments/orange-money**, le backend exige le header **`Idempotency-Key`**. Le client envoie une clé fournie ou génère `om-${orderId}-${Date.now()}` automatiquement.

---

### 🏥 Health (Doctor, Appointment, Pharmacy)

| Frontend (api) | Backend (route) | Statut |
|----------------|-----------------|--------|
| `api.health.doctors.list()` | GET `/api/doctors` | ✅ |
| `api.health.doctors.getById(id)` | GET `/api/doctors/:id` | ✅ |
| `api.health.appointments.list()` | GET `/api/appointments` | ✅ |
| `api.health.appointments.create(payload)` | POST `/api/appointments` | ✅ |
| `api.health.appointments.getById(id)` | GET `/api/appointments/:id` | ✅ |
| `api.pharmacies.list()` | GET `/api/pharmacies` | ✅ |
| `api.pharmacies.getById(id)` | GET `/api/pharmacies/:id` | ✅ |

**Note** : PATCH `/api/appointments/:id` (statut) existe côté backend ; à exposer dans le client si besoin (ex. `api.health.appointments.updateStatus(id, status)`).

---

### 🏠 Property

| Frontend (api) | Backend (route) | Statut |
|----------------|-----------------|--------|
| `api.properties.list()` | GET `/api/properties` | ✅ |
| `api.properties.getById(id)` | GET `/api/properties/:id` | ✅ |
| `api.properties.create(payload)` | POST `/api/properties` | ✅ |
| `api.properties.createVisitRequest(propertyId, payload)` | POST `/api/properties/:id/visit-request` (body: `requested_date`, `message`) | ✅ |
| `api.properties.getMyVisitRequests()` | GET `/api/properties/visit-requests/me` | ✅ |

---

### 🛡 Insurance

| Frontend (api) | Backend (route) | Statut |
|----------------|-----------------|--------|
| `api.insurance.policies.listMy()` | GET `/api/insurance/policies` | ✅ |
| `api.insurance.policies.subscribe(payload)` | POST `/api/insurance/policies` | ✅ |
| `api.insurance.claims.listMy()` | GET `/api/insurance/claims` | ✅ |
| `api.insurance.claims.create(payload)` | POST `/api/insurance/claims` | ✅ |

Backend : PATCH `/api/insurance/claims/:id` (staff/admin) pour workflow (status, validation_level, risk_score).

---

### 🔐 Sécurité & Infra

| Frontend (api) | Backend (route) | Statut |
|----------------|-----------------|--------|
| `api.auth.login / register / me / logout` | `/api/auth/*` | ✅ |
| `api.admin.getKillSwitch()` | GET `/api/admin/kill-switch` | ✅ |
| `api.admin.updateKillSwitch(body)` | PATCH `/api/admin/kill-switch` | ✅ |
| `api.admin.getAuditLogs()` | GET `/api/admin/audit-logs` | ✅ |
| — | PATCH `/api/admin/users/:id/suspend` | Admin uniquement |
| — | POST `/api/admin/blacklist` | Admin uniquement |
| — | GET `/api/admin/aml/flags` | Admin finance |
| — | GET `/api/admin/feature-flags`, PATCH `/api/admin/feature-flags/:key` | Admin |

Health publics : GET `/health`, GET `/health/ready`, GET `/health/region`.

---

## Résumé

- **Connectés** : oui (même base URL, CORS configuré).
- **Synchronisés** : oui pour Ticketing, Ride, Food, Paiements (dont Idempotency-Key), Health, Property (dont visit-request / visit-requests/me), Insurance, Admin de base.
- **Front** : Idempotency-Key envoyée sur Orange Money (auto si non fournie) ; `api.properties.createVisitRequest` et `api.properties.getMyVisitRequests` en place.

---

## Lancer les deux

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
npm run dev
```

Frontend : http://localhost:5173  
API : http://localhost:3000/api  
Vérifier que `VITE_API_URL` (ou défaut) pointe bien vers `http://localhost:3000/api` en dev.
