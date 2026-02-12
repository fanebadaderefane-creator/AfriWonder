# 📋 Audit Marketplace — Production Ready ?

> **Date** : 11 février 2025  
> **Objectif** : Identifier les manques et déterminer si le Marketplace est prêt pour la production.

---

## 1. Vue d'ensemble

| Module | État | Commentaire |
|--------|------|-------------|
| Liste produits | ✅ | Recherche, filtres, tri, catégories |
| Fiche produit | ✅ | Images, vendeur, livraison, prix |
| Panier (Cart) | ⚠️ | Backend OK, mais peu accessible |
| Checkout | ⚠️ | Crée commande mais **pas de paiement** |
| Suivi commande | ⚠️ | Pas de bouton "Payer" |
| Vendeur | ✅ | AddProduct, EditProduct, SellerDashboard |
| Litiges / Remboursements | ✅ | OrderDispute, Refunds |
| Escrow backend | ✅ | Fonds bloqués jusqu'à livraison |

---

## 2. 🚨 CRITIQUE : Flux paiement cassé

### Problème

Quand un acheteur confirme une commande (Product "Acheter maintenant" ou Checkout) :

1. La commande est créée avec `status: pending`, `payment_status: pending`
2. L'utilisateur est redirigé vers OrderTracking
3. **Aucun paiement Orange Money n'est initié**

Sur OrderTracking, pour une commande en attente de paiement :

- Aucun bouton "Payer avec Orange Money"
- Aucun appel à `api.payments.initiateOrangeMoney(orderId, amount, phone, returnUrl)`
- La commande reste indéfiniment en `pending`

### Impact

**Bloquant production** — Les clients ne peuvent pas payer. Les commandes restent en attente sans possibilité de procéder au règlement.

### Solution implémentée ✅

1. **Option A** (fait) : Sur OrderTracking, lorsque `payment_status === 'pending'` :
   - Bouton "Payer avec Orange Money"
   - Modal ou formulaire : numéro Orange Money
   - Appel `api.payments.initiateOrangeMoney(orderId, amount, phone, returnUrl)`
   - Redirection vers `paymentUrl` retourné par l’API

2. **Option B** : Avant la redirection vers OrderTracking, lancer le flux Orange Money :
   - Dans Checkout : après `createOrdersMutation`, pour chaque commande avec `payment_status === 'pending'`, afficher un modal de paiement puis rediriger vers OrderTracking après paiement
   - Dans Product : idem après `createOrderMutation`

---

## 3. UX : Panier peu visible

| Élément | État |
|---------|------|
| Lien vers Cart | ❌ Pas d’icône panier dans BottomNav |
| Add to Cart sur Product | ❌ Page produit : uniquement "Acheter maintenant" |
| Add to Cart sur ProductCard | ❌ Uniquement bouton "Acheter" → page produit |

### Effets

- Le panier existe (Cart.jsx, api.cart) mais n’est pas mis en avant
- Pas de moyen rapide d’ajouter au panier depuis la fiche produit
- Accès au panier uniquement via Menu+ ou liens internes (ex. Wishlist → Add to Cart)

### Recommandations

1. Ajouter un bouton "Ajouter au panier" sur la page Product (à côté de "Acheter maintenant")
2. Ajouter une icône Panier dans la navigation (BottomNav ou Menu+) avec badge du nombre d’articles

---

## 4. Checkout invité (Guest)

| Élément | État |
|---------|------|
| Formulaire guest | ✅ Nom, email, téléphone, adresse, ville |
| API orders.create | ❌ Nécessite une session utilisateur (authenticate) |

### Problème

Le backend exige une authentification pour `POST /api/orders`. Un checkout "invité" ne peut pas créer de commande côté API.

### Recommandation

- Soit retirer le mode invité et imposer la connexion avant commande
- Soit ajouter un flux guest côté backend (création de session temporaire ou commande sans compte)

---

## 5. Ce qui fonctionne

| Fonction | Détail |
|----------|--------|
| Escrow | `confirmPayment` bloque les fonds, libération après livraison |
| Commission | 10 % configurable, CommissionNotice affiché |
| Multi-devises | CurrencySelector, MarketplaceCurrencyContext |
| Recherche | Suggestions, filtres avancés |
| Wishlist | Add to Cart depuis la liste de souhaits |
| Litiges | OrderDispute, api.disputes |
| Remboursements | api.refunds, OrderTracking demande de remboursement |
| Offline | Orders avec cache (getCachedOrders, ordersOfflineCache) |
| Facture | api.orders.downloadInvoice |
| Vendeur | SellerDashboard, SellerOrders, AddProduct, EditProduct |

---

## 6. Correctifs recommandés (priorité)

| Priorité | Action |
|----------|--------|
| ~~P0~~ | ~~Implémenter le flux de paiement Orange Money~~ ✅ Fait (OrderTracking) |
| P1 | Bouton "Ajouter au panier" sur la page Product |
| P1 | Icône Panier accessible dans la navigation |
| ~~Livraison~~ | ✅ Expédition : bouton « Expédier » + modal (transporteur, numéro de suivi) dans SellerOrders |
| P2 | Clarifier / retirer le checkout invité si non supporté backend |
| P2 | Vérifier la route refunds (frontend `/refunds/orders/:id/refund` vs backend) |

---

## 7. Verdict

**Le Marketplace n’est pas prêt pour la production** tant que le flux de paiement Orange Money n’est pas implémenté.

Après correction du flux paiement (P0) et des principaux points UX (P1), le module pourra être considéré comme prêt pour un lancement contrôlé.
