# Stratégie Marketplace Phase 1 — Abonnements uniquement

> Document de référence pour le modèle économique AfriWonder Marketplace (Phase 1)

---

## 1. Principe

**Phase 1** : AfriWonder ne s'occupe pas de la livraison. Revenus = **abonnements uniquement** (0% commission sur les ventes).

- **Curatelle** : sélection des bons prestataires via dashboard admin — les vendeurs créent leur boutique (status `pending`), l'admin approuve (`active`) ou rejette (`blocked`)
- **Boutique** : localisation, téléphone, WhatsApp, TikTok, Instagram, X, images/vidéos produits (comme Amazon)
- **Abonnements** : chaque vendeur/prestataire paie un abonnement mensuel
- **Commission** : 0% sur les ventes (désactivée via `MARKETPLACE_PHASE1_SUBSCRIPTION_ONLY=true`)

**Phase 2** (futur) : Quand AfriWonder aura une équipe solide, prise en charge de la livraison + commission.

---

## 2. Formules vendeurs (Marketplace)

| Formule   | Prix/mois | Produits max | Commission |
|-----------|-----------|--------------|------------|
| Gratuit   | 0 FCFA    | 10           | 0% (Phase 1) |
| Starter   | 10 000 FCFA | 100        | 0% (Phase 1) |
| Business  | 30 000 FCFA | Illimité   | 0% (Phase 1) |
| Enterprise| 50 000 FCFA | Illimité   | 0% (Phase 1) |

- **Gratuit** : pas de paiement, limite 10 produits
- **Starter / Business / Enterprise** : paiement depuis le **wallet** OU **Orange Money** (numéro valide requis), abonnement 1 mois

---

## 3. Configuration

### Variable d'environnement

```env
# Phase 1 : abonnements uniquement, 0% commission sur marketplace et services
MARKETPLACE_PHASE1_SUBSCRIPTION_ONLY=true
```

Quand `true` :
- **Marketplace** : 0% commission sur les commandes (escrow)
- **Services** (prestataires) : 0% commission sur les réservations

Quand absent ou `false` : commissions normales (10% marketplace, 17.5% services).

---

## 4. Flux technique

### Abonnement vendeur

1. Le vendeur va sur **Formules vendeurs** (`/seller-subscription`)
2. Clique sur **S'abonner** pour Starter/Business/Enterprise
3. Le montant est débité de son **wallet** (portefeuille utilisateur)
4. Création d'une `SellerSubscription` (status: active, expires_at: +1 mois)
5. Mise à jour de `SellerProfile.subscription_tier`

### Limite produits

- À la création d'un produit : vérification du nombre de produits actifs du vendeur
- Si `count >= maxProducts` (selon tier) → erreur « Limite atteinte »

### Expiration

- Un cron/job doit appeler `sellerSubscriptionService.expireSubscriptions()` régulièrement
- Les abonnements expirés passent en `status: expired`
- Le `subscription_tier` du vendeur repasse à `free`

---

## 5. Fichiers modifiés

| Fichier | Rôle |
|---------|------|
| `backend/prisma/schema.prisma` | Modèle `SellerSubscription` |
| `backend/src/services/sellerSubscription.service.ts` | Service abonnement (subscribe, expire) |
| `backend/src/routes/sellerSubscription.routes.ts` | API `/api/seller-subscription/*` |
| `backend/src/services/escrow.service.ts` | Commission 0% si Phase 1 |
| `backend/src/services/booking.service.ts` | Commission 0% si Phase 1 |
| `backend/src/services/product.service.ts` | Vérification maxProducts |
| `backend/src/services/sellerProfile.service.ts` | Mise à jour tier : seul "free" via update |
| `src/pages/SellerSubscription.jsx` | UI : paiement obligatoire pour tiers payants |
| `src/api/expressClient.js` | `api.sellerSubscription.subscribe()`, `getActive()` |

---

## 6. Services (prestataires)

Les prestataires de services (`ServiceProvider`) utilisent le même flag `MARKETPLACE_PHASE1_SUBSCRIPTION_ONLY` pour désactiver la commission.

L'ajout d'abonnements pour les prestataires (comme pour les vendeurs) pourra être fait dans une itération ultérieure.
