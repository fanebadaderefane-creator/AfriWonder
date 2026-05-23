# Roadmap — Modules institutionnels (Mali / CEDEAO)

Ce document aligne la base actuelle avec les objectifs **système transactionnel sécurisé** et **infrastructure prête 100k tx**.

---

## MODULE 1 — TICKETING (implémenté)

### Fait
- **Event** (existant) + **EventTicketType** (stock par type) + **TicketLock** (lock 2 min).
- **EventTicket** : champs `qr_signature`, `scan_count`, `event_ticket_type_id`.
- **QR signé** : `utils/ticketingQr.ts` — HMAC(ticketId|eventId) pour anti-fraude scan.
- **Check-in** : vérification signature + anti-double (update où `checked_in: false`).
- **APIs** :
  - `POST /api/tickets/scan` — body `{ qr_code }` → check-in (EventTicket).
  - `POST /api/tickets/refund` — body `{ ticket_id }` → payment_status = refunded.
  - `POST /api/events/:id/tickets/lock` — body `{ ticket_type, quantity }` → lock 2 min.
- **Commission** : déjà dans `event.service` (platform_fee_pct, organisateur crédité).

### Compléments récents (Ticketing)
- **Création d’event** : body `ticket_types[]` (name, description, price, quantity_available, currency, max_per_user, sale_start, sale_end) → création des `EventTicketType`.
- **Réservation** : si l’event a des `EventTicketType`, stock vérifié par type (`quantity_available - quantity_sold`), `quantity_sold` incrémenté à la création des billets (gratuit et après `confirmTicketPayment`).
- **createLock** : vérification du stock par type quand l’event a des ticket types.
- **refundTicket** : décrément de `quantity_sold` sur le type si le billet a `event_ticket_type_id`.

### À faire côté équipe
- Appliquer la migration : `npx prisma migrate deploy` (ou `migrate dev`) pour créer `event_ticket_types` et `ticket_locks`.
- Générer le client : `npx prisma generate`.
- Dashboard organisateur : étendre l’existant (GET `/api/events/:id/dashboard`) avec monitoring anti-fraude (scans suspects, doublons).
- Scalabilité 100k tx : cache Redis pour stock/verrou, file (Bull/Agenda) pour scan asynchrone si besoin.
- **Idempotency** : middleware + table `idempotency_keys` sur POST paiements / billets (reste à brancher).

---

## MODULE 2 — RIDE

### Fait
- **Haversine** : `utils/haversine.ts` ; GET `/api/drivers/nearby?lat=&lng=&max_km=` avec tri par distance.
- **Annulation** : PATCH `/api/rides/:id/status` avec `status: 'cancelled'` accepte `cancellation_fee` et `cancellation_reason` (Prisma : champs sur `Ride`).

### À implémenter
- WebSocket live tracking.
- Auto-cancel si conducteur ne répond pas (timer).
- Surge pricing.
- Wallet conducteur (lien Wallet existant).
- Anti-fraude GPS (détection spoofing).

---

## MODULE 3 — FOOD DELIVERY

### Fait
- **Tracking** : GET `/api/food-orders/:id` retourne la commande avec `status_history: [{ status, at }]` (historique minimal pour le suivi).

### À implémenter
- Order tracking temps réel (WebSocket ou polling).
- Kitchen dashboard (statuts en direct).
- Gestion stock (MenuItem / inventaire).
- Commission restaurant + promo codes.
- Assignation automatique livreur.

---

## MODULE 4 — PAYMENTS (Airtime / Bills)

### À implémenter
- **PaymentService** central : wallet interne, ledger transaction.
- Retry automatique + reconciliation journalière.
- Règles fraud detection + **idempotency keys** (table `idempotency_keys`).
- Vérification webhooks (signature).

---

## MODULE 5 — HEALTH

### Fait
- **Confirmation RDV** : PATCH `/api/appointments/:id` (patient ou médecin) ; passage à `status: 'confirmed'` autorisé uniquement si `payment_status === 'paid'`.

### À implémenter
- Blocage créneaux (calendar locking).
- Historique patient structuré.
- Prescription PDF signée.
- Mode urgence.

---

## MODULE 6 — PROPERTY

### Fait
- **Demande de visite** : modèle `PropertyVisitRequest` ; POST `/api/properties/:id/visit-request` (body: `requested_date`, `message`) ; GET `/api/properties/visit-requests/me` (route déclarée avant `/:id` pour éviter conflit).

### À implémenter
- Boost annonce payant.
- Carte / recherche géo.
- Alertes « baisse de prix ».

---

## MODULE 7 — INSURANCE

### Fait
- **Workflow claims** : PATCH `/api/insurance/claims/:id` (staff/admin via `requireStaff`) — body `status`, `validation_level`, `risk_score`. Statuts : submitted → under_review → approved | rejected → paid. Champs `validation_level` (0–4) et `risk_score` (0–100) dans le schéma.

### À implémenter
- Risk scoring automatique (calcul à partir de montant, police, historique).
- Dashboard assureur + audit logs.

---

## MODULE 8 — SÉCURITÉ GLOBALE

### Déjà en place
- Rate limiting (general, auth, payment, upload, admin, webhook).
- Anti-bot + anti-spam.
- CORS, Helmet.
- Health + health/ready + health/region (CEDEAO).

### En place
- **RBAC admin** : `adminRbac.ts` (requireAnyAdmin, requireSuperAdmin, requireFinanceAdmin, etc.) sur `/api/admin/*`.
- **RBAC app** : `requireRole.ts` (requireRole, requireAdmin, requireStaff) ; utilisé sur PATCH `/api/insurance/claims/:id` (requireStaff).

### À implémenter
- Étendre `requireRole` / `requireStaff` sur d’autres routes sensibles si besoin.
- Logs centralisés (Winston → fichier/CloudWatch).
- Alerting temps réel (PagerDuty / webhook).
- Backup quotidien + disaster recovery.
- CI/CD + environnements staging / prod.

---

## Fichiers modifiés / créés (Module 1)

| Fichier | Action |
|--------|--------|
| `prisma/schema.prisma` | EventTicketType, TicketLock, champs EventTicket (qr_signature, scan_count, event_ticket_type_id) |
| `prisma/migrations/20260208190000_ticketing_event_ticket_type_lock/migration.sql` | Création tables + colonnes |
| `src/utils/ticketingQr.ts` | signQr, verifyQr, getLockExpiry |
| `src/services/event.service.ts` | signQr sur création billet, verifyQr + anti-double dans checkIn, refundTicket, createLock |
| `src/routes/tickets.routes.ts` | POST /scan, POST /refund |
| `src/routes/events.routes.ts` | POST /:id/tickets/lock |

---

## Commandes utiles

```bash
# Backend
cd backend
npx prisma migrate deploy   # appliquer les migrations
npx prisma generate         # régénérer le client
npm run dev

# Tester scan (après achat billet)
# POST /api/tickets/scan   Body: { "qr_code": "<qr du billet>" }
# POST /api/tickets/refund Body: { "ticket_id": "<id EventTicket>" }
# POST /api/events/:eventId/tickets/lock Body: { "ticket_type": "standard", "quantity": 2 }
```
