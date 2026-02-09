# 🔍 VÉRIFICATION MODULE SERVICES LOCAUX

## 📋 ÉTAT ACTUEL vs EXIGENCES

### ✅ CE QUI EXISTE DÉJÀ

1. **Modèle Service** (basique)
   - ✅ `id`, `provider_id`, `title`, `description`, `price`
   - ✅ `category`, `location`, `is_available`, `rating`
   - ❌ Manque: `currency`, `duration`, `location_type` (on_site/home), `travel_fee`

2. **Service Service** (`service.service.ts`)
   - ✅ `list()` - Liste des services avec filtres
   - ✅ `create()` - Création de service
   - ✅ `bookService()` - Réservation basique (utilise Transaction)
   - ✅ `confirmServicePayment()` - Confirmation paiement
   - ❌ Manque: Gestion complète des réservations, disponibilités, avis

3. **Routes Services** (`services.routes.ts`)
   - ✅ GET `/api/services` - Liste
   - ✅ POST `/api/services` - Création
   - ❌ Manque: Routes pour réservations, prestataires, disponibilités, avis

4. **Modèles existants réutilisables**
   - ✅ `Review` (existe mais pour produits)
   - ✅ `Dispute` (existe mais pour marketplace)
   - ✅ `Payout` (existe mais pour marketplace)
   - ✅ `Address` (existe)

### ❌ CE QUI MANQUE

#### 1. MODÈLES PRISMA MANQUANTS

- [ ] **ServiceProvider** (compte prestataire complet)
  - `id`, `user_id`, `status` (active/suspended/blocked)
  - `is_verified`, `verification_badge`
  - `kyc_status`, `kyc_document_url`, `kyc_selfie_url`
  - `service_categories[]`, `service_radius_km`
  - `location_type` (on_site/home/both)
  - `average_rating`, `total_bookings`, `total_earnings`
  - `payout_method`, `payout_account`
  - `created_at`, `updated_at`

- [ ] **ServiceCategory** (catégories de services)
  - `id`, `name`, `slug`, `description`
  - `icon_url`, `parent_id` (sous-catégories)
  - `is_active`

- [ ] **ServiceBooking** (réservations complètes)
  - `id`, `service_id`, `customer_id`, `provider_id`
  - `status` (pending/confirmed/in_progress/completed/cancelled/no_show)
  - `booking_date`, `booking_time`, `duration`
  - `location_type` (customer_address/provider_location)
  - `customer_address_id`, `provider_address_id`
  - `total_price`, `platform_fee`, `provider_earnings`
  - `payment_status`, `payment_method`, `payment_transaction_id`
  - `deposit_amount`, `deposit_paid`
  - `notes`, `cancellation_reason`
  - `confirmed_at`, `started_at`, `completed_at`, `cancelled_at`
  - `created_at`, `updated_at`

- [ ] **ServiceAvailability** (agenda prestataire)
  - `id`, `provider_id`, `day_of_week` (0-6)
  - `start_time`, `end_time`
  - `is_available`, `is_recurring`
  - `specific_date` (pour exceptions)
  - `created_at`, `updated_at`

- [ ] **ServiceUnavailability** (indisponibilités)
  - `id`, `provider_id`, `start_date`, `end_date`
  - `reason` (holiday/vacation/other)
  - `created_at`

- [ ] **ServiceReview** (avis spécifiques services)
  - `id`, `booking_id`, `service_id`, `provider_id`, `customer_id`
  - `rating` (1-5), `title`, `content`
  - `is_verified` (client a utilisé le service)
  - `created_at`, `updated_at`

- [ ] **ServiceDispute** (litiges services)
  - `id`, `booking_id`, `reporter_id` (customer/provider)
  - `reason`, `description`, `evidence[]`
  - `status` (pending/investigating/resolved/rejected)
  - `resolution`, `resolved_by`, `resolved_at`
  - `created_at`, `updated_at`

- [ ] **ServicePayout** (paiements prestataires)
  - `id`, `provider_id`, `amount`, `currency`
  - `commission_rate`, `commission_amount`, `net_amount`
  - `status` (pending/processing/completed/failed)
  - `payout_method`, `payout_account`
  - `bookings[]` (IDs des réservations incluses)
  - `processed_at`, `completed_at`
  - `created_at`, `updated_at`

#### 2. SERVICES BACKEND MANQUANTS

- [ ] **provider.service.ts**
  - `createProvider()` - Créer compte prestataire
  - `updateProvider()` - Mettre à jour profil
  - `verifyProvider()` - Validation KYC
  - `getProvider()` - Détails prestataire
  - `listProviders()` - Liste avec filtres géolocalisés
  - `updateStatus()` - Changer statut (admin)

- [ ] **booking.service.ts**
  - `createBooking()` - Créer réservation
  - `confirmBooking()` - Confirmer réservation (prestataire)
  - `updateBookingStatus()` - Changer statut
  - `cancelBooking()` - Annuler réservation
  - `getBooking()` - Détails réservation
  - `listBookings()` - Liste réservations (client/prestataire)
  - `completeBooking()` - Marquer comme terminé

- [ ] **availability.service.ts**
  - `setAvailability()` - Définir disponibilités
  - `getAvailability()` - Récupérer disponibilités
  - `addUnavailability()` - Ajouter indisponibilité
  - `checkAvailability()` - Vérifier disponibilité créneau
  - `getAvailableSlots()` - Créneaux disponibles

- [ ] **review.service.ts**
  - `createReview()` - Créer avis
  - `getServiceReviews()` - Avis d'un service
  - `getProviderReviews()` - Avis d'un prestataire
  - `reportReview()` - Signaler avis abusif

- [ ] **service-dispute.service.ts**
  - `createDispute()` - Créer litige
  - `updateDispute()` - Mettre à jour litige
  - `resolveDispute()` - Résoudre litige (admin)
  - `blockPayment()` - Bloquer paiement en cas de litige

- [ ] **service-payout.service.ts**
  - `calculatePayout()` - Calculer montant payout
  - `createPayout()` - Créer payout
  - `processPayout()` - Traiter payout
  - `getPayoutHistory()` - Historique payouts

#### 3. ROUTES API MANQUANTES

- [ ] **providers.routes.ts**
  - GET `/api/providers` - Liste prestataires (recherche géolocalisée)
  - GET `/api/providers/:id` - Détails prestataire
  - POST `/api/providers` - Créer compte prestataire
  - PUT `/api/providers/:id` - Mettre à jour profil
  - POST `/api/providers/:id/verify` - Vérifier prestataire (admin)
  - GET `/api/providers/:id/services` - Services d'un prestataire

- [ ] **bookings.routes.ts**
  - POST `/api/bookings` - Créer réservation
  - GET `/api/bookings` - Liste réservations (client/prestataire)
  - GET `/api/bookings/:id` - Détails réservation
  - PUT `/api/bookings/:id/confirm` - Confirmer réservation
  - PUT `/api/bookings/:id/status` - Changer statut
  - POST `/api/bookings/:id/cancel` - Annuler réservation
  - POST `/api/bookings/:id/complete` - Marquer terminé

- [ ] **availability.routes.ts**
  - GET `/api/providers/:id/availability` - Disponibilités prestataire
  - PUT `/api/providers/:id/availability` - Mettre à jour disponibilités
  - POST `/api/providers/:id/unavailability` - Ajouter indisponibilité
  - GET `/api/providers/:id/available-slots` - Créneaux disponibles

- [ ] **service-reviews.routes.ts**
  - POST `/api/service-reviews` - Créer avis
  - GET `/api/services/:id/reviews` - Avis d'un service
  - GET `/api/providers/:id/reviews` - Avis d'un prestataire
  - POST `/api/service-reviews/:id/report` - Signaler avis

- [ ] **service-disputes.routes.ts**
  - POST `/api/service-disputes` - Créer litige
  - GET `/api/service-disputes` - Liste litiges (admin)
  - GET `/api/service-disputes/:id` - Détails litige
  - PUT `/api/service-disputes/:id/resolve` - Résoudre litige (admin)

- [ ] **service-payouts.routes.ts**
  - GET `/api/providers/:id/payouts` - Historique payouts
  - POST `/api/providers/:id/payouts/request` - Demander payout
  - GET `/api/service-payouts` - Liste payouts (admin)

#### 4. FONCTIONNALITÉS MANQUANTES

- [ ] **Recherche géolocalisée**
  - Filtrage par distance (rayon km)
  - Tri par distance, note, popularité
  - Filtrage par disponibilité temps réel

- [ ] **Système de paiement complet**
  - Acompte configurable
  - Paiement après service
  - Intégration Mobile Money (Wave, MTN, Orange, Moov)
  - Webhooks paiement

- [ ] **Gestion annulations**
  - Frais d'annulation configurables
  - Politique d'annulation différenciée (client/prestataire)

- [ ] **Dashboard Admin**
  - Gestion prestataires
  - Validation KYC
  - Gestion réservations
  - Gestion litiges
  - Statistiques

## 🎯 PLAN D'IMPLÉMENTATION

### Phase 1: Schéma Prisma
1. Créer tous les modèles manquants
2. Créer migration Prisma
3. Générer client Prisma

### Phase 2: Services Backend
1. `provider.service.ts`
2. `booking.service.ts`
3. `availability.service.ts`
4. `review.service.ts`
5. `service-dispute.service.ts`
6. `service-payout.service.ts`
7. Mettre à jour `service.service.ts`

### Phase 3: Routes API
1. Créer toutes les routes manquantes
2. Intégrer dans `app.ts`
3. Ajouter validation et middleware

### Phase 4: Tests
1. Tests unitaires services
2. Tests d'intégration routes
3. Tests end-to-end flow complet

### Phase 5: Documentation
1. Documentation API (Swagger)
2. Guide d'utilisation
3. Documentation technique

## 📊 STATISTIQUES

- **Modèles Prisma**: 1/8 existants (12.5%)
- **Services Backend**: 1/7 existants (14.3%)
- **Routes API**: 2/30+ existantes (~6%)
- **Fonctionnalités**: ~15% complètes

## ✅ PROCHAINES ÉTAPES

1. Créer les modèles Prisma manquants
2. Créer la migration
3. Implémenter les services backend
4. Créer les routes API
5. Créer les tests
