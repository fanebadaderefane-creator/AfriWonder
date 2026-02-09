# 📋 VÉRIFICATION — MODULE "MES COMMANDES"
## Analyse de l'existant et plan d'implémentation

**Date**: 2026-02-05  
**Statut**: 🔄 **EN ANALYSE**

---

## 📊 ÉTAT ACTUEL DU MODULE

### ✅ Ce qui existe déjà

#### Modèles Prisma
- ✅ `Order` — Modèle basique avec champs minimaux
- ✅ `OrderItem` — Modèle basique
- ✅ `Shipping` — Existe (à vérifier les champs)
- ✅ `Refund` — Existe
- ✅ `Dispute` — Existe (à vérifier si c'est pour les commandes)

#### Services Backend
- ✅ `order.service.ts` — Service basique avec méthodes :
  - `list()` — Liste commandes client
  - `listBySeller()` — Liste commandes vendeur
  - `getById()` — Détails commande
  - `createFromCart()` — Création depuis panier
  - `confirmPayment()` — Confirmation paiement
  - `confirmReception()` — Confirmation réception
  - `cancel()` — Annulation
  - `updateStatus()` — Mise à jour statut

#### Routes API
- ✅ `/api/orders` — GET (liste), POST (création)
- ✅ `/api/orders/:id` — GET (détails)
- ✅ `/api/orders/:id/status` — PATCH (mise à jour statut)
- ✅ `/api/orders/:id/cancel` — POST (annulation)
- ✅ `/api/orders/:id/confirm-payment` — POST
- ✅ `/api/orders/:id/confirm-reception` — POST

#### Pages Frontend
- ✅ `Orders.jsx` — Liste commandes
- ✅ `OrderTracking.jsx` — Suivi commande

---

## ❌ CE QUI MANQUE (selon spécifications)

### 1. Modèles Prisma à créer/modifier

#### Order — À améliorer
**Champs manquants** :
- `seller_id` — ID vendeur principal
- `currency` — Devise commande
- `display_currency` — Devise affichage
- `exchange_rate` — Taux de change
- `subtotal_amount` — Sous-total
- `shipping_amount` — Frais livraison
- `tax_amount` — Taxes
- `payment_status` — Statut paiement détaillé
- `transaction_id` — ID transaction paiement
- `provider` — Provider paiement
- `billing_address` — Adresse facturation
- `tracking_number` — Numéro suivi
- `carrier` — Transporteur
- `estimated_delivery_date` — Date livraison estimée
- `actual_delivery_date` — Date livraison réelle
- `escrow_status` — Statut escrow
- `dispute_status` — Statut litige
- `customer_notes` — Notes client
- `paid_at` — Date paiement
- `shipped_at` — Date expédition
- `delivered_at` — Date livraison

#### OrderItem — À améliorer
**Champs manquants** :
- `product_snapshot` — Snapshot produit (JSON)
- `variant` — Variantes (taille, couleur, etc.)

#### Payment — À créer
**Nouveau modèle** :
- `id`
- `order_id`
- `provider` — OrangeMoney, MTN, Wave, Flutterwave, Paystack, Card, COD
- `transaction_id`
- `status`
- `amount`
- `currency`
- `paid_at`
- `provider_reference`

#### Shipment — À créer/améliorer
**Champs nécessaires** :
- `order_id`
- `carrier` — Transporteur
- `tracking_number`
- `current_location`
- `estimated_delivery`
- `proof_of_delivery_photo`
- `signature`
- `status`
- `timeline` — Événements de suivi

#### Dispute — À créer/améliorer
**Champs nécessaires** :
- `order_id`
- `reason`
- `description`
- `evidence_images`
- `status` — open, investigating, resolved, rejected
- `resolution_type` — refund, partial_refund, reject
- `created_at`
- `resolved_at`
- `messages` — Historique discussion

#### Review — Existe mais à vérifier
**Vérifier si** :
- Lié à `order_id`
- Support images
- Badge "Acheteur vérifié"

---

## 🎯 PLAN D'IMPLÉMENTATION

### Phase 1: Schéma Prisma ✅
1. Améliorer modèle `Order` avec tous les champs requis
2. Améliorer modèle `OrderItem` avec snapshot produit
3. Créer modèle `Payment` pour multi-provider
4. Créer/améliorer modèle `Shipment` avec tracking complet
5. Créer/améliorer modèle `Dispute` pour litiges commandes
6. Vérifier/améliorer modèle `Review` pour avis commandes

### Phase 2: Services Backend
1. Améliorer `order.service.ts` :
   - Optimiser récupération vendeurs (snapshot ou jointure)
   - Ajouter gestion escrow
   - Ajouter gestion multi-devise
   - Ajouter gestion frais détaillés
2. Créer `payment.service.ts` :
   - Support Orange Money
   - Support MTN Money
   - Support Wave
   - Support Flutterwave
   - Support Paystack
   - Support Carte bancaire
   - Support Cash on Delivery
   - Retry paiement
   - Webhook confirmation
   - Double vérification
3. Créer `shipment.service.ts` :
   - Gestion transporteurs
   - Génération tracking number
   - Mise à jour timeline
   - Preuve livraison
   - Signature client
4. Créer `dispute.service.ts` :
   - Création litige
   - Upload images
   - Médiation plateforme
   - Historique discussion
   - Résolution (partielle/totale)
5. Créer `invoice.service.ts` :
   - Génération PDF facture
   - Numéro fiscal
   - TVA si applicable

### Phase 3: Routes API
1. Routes Order améliorées
2. Routes Payment (multi-provider)
3. Routes Shipment (tracking)
4. Routes Dispute
5. Routes Invoice (génération PDF)

### Phase 4: Frontend
1. Améliorer `Orders.jsx` :
   - Timeline visuelle
   - Détail produits avec images
   - Variantes affichées
   - Frais détaillés
   - CTA clairs
2. Améliorer `OrderDetails.jsx` :
   - Toutes les informations
   - Actions selon statut
   - Chat vendeur
   - Bouton litige
   - Bouton avis
3. Améliorer `OrderTracking.jsx` :
   - Timeline complète
   - Carte de suivi
   - Preuve livraison
4. Créer `OrderDispute.jsx` :
   - Formulaire litige
   - Upload images
   - Historique discussion
5. Créer `OrderReview.jsx` :
   - Formulaire avis
   - Upload photos
   - Note produit + vendeur

### Phase 5: Fonctionnalités avancées
1. Escrow système
2. Notifications temps réel
3. Chat vendeur lié commande
4. Analytics utilisateur
5. Support offline
6. Optimisations performance

---

## 📋 CHECKLIST DÉTAILLÉE

### Backend — Modèles Prisma
- [ ] Order amélioré (tous les champs)
- [ ] OrderItem amélioré (snapshot produit)
- [ ] Payment créé
- [ ] Shipment créé/amélioré
- [ ] Dispute créé/amélioré
- [ ] Review vérifié/amélioré

### Backend — Services
- [ ] order.service.ts amélioré
- [ ] payment.service.ts créé (multi-provider)
- [ ] shipment.service.ts créé
- [ ] dispute.service.ts créé
- [ ] invoice.service.ts créé
- [ ] escrow.service.ts créé

### Backend — Routes API
- [ ] Routes Order améliorées
- [ ] Routes Payment
- [ ] Routes Shipment
- [ ] Routes Dispute
- [ ] Routes Invoice

### Frontend — Pages
- [ ] Orders.jsx amélioré
- [ ] OrderDetails.jsx amélioré
- [ ] OrderTracking.jsx amélioré
- [ ] OrderDispute.jsx créé
- [ ] OrderReview.jsx créé

### Frontend — API Client
- [ ] Méthodes api.orders.* améliorées
- [ ] Méthodes api.payments.* créées
- [ ] Méthodes api.shipments.* créées
- [ ] Méthodes api.disputes.* créées
- [ ] Méthodes api.invoices.* créées

---

**Prochaine étape** : Commencer l'implémentation complète selon ce plan.
