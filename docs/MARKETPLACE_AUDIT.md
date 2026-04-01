# Audit Marketplace — Vérification des fonctionnalités (Prompt officiel)

Ce document vérifie l’implémentation des fonctionnalités listées dans le prompt officiel Marketplace.

---

## 1. Objectifs Marketplace

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Marketplace multi-vendeurs | ✅ | `Product.seller_id`, `SellerProfile`, `SellerWallet` |
| Produits physiques / digitaux / services | ⚠️ Partiel | Pas de champ `type` (physique/digital/service) sur `Product` |
| Paiements locaux africains + internationaux | ✅ | Orange Money, Stripe (payments.routes) |
| Logistique locale & internationale | ✅ | `Shipping`, `ShippingRate`, `DeliveryTracking`, `shipping.routes` |
| Monétisation intégrée | ✅ | `SellerWallet`, commission dans `orderService.confirmPayment` |
| Architecture multi-pays | ✅ | `Address.country`, `ShippingRate.destination_country` |

---

## 2. Module vendeurs (obligatoire)

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Compte vendeur distinct | ✅ | `SellerProfile` (store_name, store_description, etc.) |
| Boutique par vendeur | ✅ | Produits par `seller_id`, pages `SellerStorefront`, `SellerProfile` |
| KYC léger | ✅ | `UserVerification` (email, phone, id, business) |
| Badge vendeur vérifié | ✅ | `SellerProfile.is_verified` |
| Statut vendeur (actif, suspendu, bloqué) | ❌ | Pas de champ `status` sur `SellerProfile` |
| Profil vendeur (nom, description, pays/ville) | ⚠️ Partiel | Pas de pays/ville sur `SellerProfile` |
| Méthode de paiement (payout) | ✅ | `Withdrawal` (orange_money_phone, etc.) |
| Note moyenne | ✅ | `SellerProfile.rating` |
| Nombre de ventes | ✅ | `SellerProfile.total_sales` |
| Historique commandes vendeur | ⚠️ | Pas de route dédiée « commandes vendeur » (ordre par vendeur) ; page `SellerOrders` existe côté front |

---

## 3. Produits

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Produits physiques / digitaux / services | ⚠️ Partiel | Pas de type produit en base |
| Catégories & sous-catégories | ⚠️ Partiel | `Product.category` (string), pas de sous-catégories |
| Variantes (taille, couleur, durée) | ✅ | `ProductVariant` (name, value, price_diff, stock) |
| Prix multi-devise | ⚠️ Partiel | `Product.price` sans `currency` ; `Transaction.currency` présent |
| Conversion automatique devise | ❌ | Non implémenté |
| Stock (illimité possible) | ✅ | `Product.stock` (Int) |
| Images & vidéos produit | ⚠️ Partiel | `Product.images` (String[]), pas de champ vidéo |
| Statut produit (brouillon, actif, suspendu) | ❌ | Pas de champ `status` sur `Product` |
| Données minimales (id, seller_id, name, description, price, currency, stock, category, brand, condition, delivery_options, created_at) | ⚠️ Partiel | Manquent : `currency`, `brand`, `condition`, `delivery_options` sur `Product` |

---

## 4. Recherche & filtrage (backend first)

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Recherche texte côté serveur | ✅ | `productService.list({ search })` (name, description) |
| Indexation produits | ⚠️ | Prisma uniquement ; pas d’index full-text dédié |
| Pagination serveur | ✅ | `page`, `limit` dans `productService.list` |
| Filtres : prix, catégorie, pays, note, livraison, vendeur vérifié | ⚠️ Partiel | Backend : `category`, `seller_id`, `search`. Manquent : prix, pays, note, livraison, vendeur vérifié |
| Tri : popularité, nouveauté, prix, ventes | ⚠️ Partiel | Backend : `orderBy: created_at desc` uniquement ; pas de param `sort`/`order` |
| Aucune logique critique côté client | ⚠️ | Filtres avancés (prix, note, etc.) faits côté client dans `Marketplace.jsx` |

---

## 5. Panier (Cart)

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Panier persistant (utilisateur connecté) | ✅ | `Cart` par `user_id`, `cart.routes` (get, add, remove, update, clear) |
| Panier multi-vendeurs | ✅ | Items JSON avec `productId` (plusieurs vendeurs possibles) |
| Validation stock temps réel | ✅ | Vérification stock dans `cartService.addItem` et `updateQuantity` (plafonnement + refus si indisponible) |
| Calcul frais par vendeur | ❌ | Pas dans le panier ; commission au moment de `confirmPayment` |
| Modification quantités | ✅ | `cartService.updateQuantity` |
| Suppression produit | ✅ | `cartService.removeItem` |

**Note :** Les routes `cart.routes.ts` sont montées dans `app.ts` (`app.use('/api/cart', cartRoutes)`). Frontend : `api.cart.get/add/remove/update/clear`.

---

## 6. Commandes (Orders)

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Une commande par vendeur | ✅ | `orderService.createFromCart` groupe par `seller_id` et crée **une commande par vendeur** ; coupon réparti au prorata |
| Lien panier → commande | ✅ | `orderService.createFromCart` |
| Calcul total (produit + livraison + commission) | ⚠️ Partiel | Total produit + coupon ; livraison/commission dans `confirmPayment` (sellerWallet) |
| Historique commandes utilisateur | ✅ | `orderService.list(userId)` |
| Historique ventes vendeur | ✅ | GET `/api/orders?as=seller` + `orderService.listBySeller(sellerId)` ; front `SellerOrders` utilise `api.orders.list({ as: 'seller' })` |
| Statuts (pending, paid, processing, shipped, delivered, cancelled, refunded) | ⚠️ Partiel | `Order.status` (défaut `pending`) ; pas de valeurs standardisées documentées |

---

## 7. Paiements (priorité Afrique)

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Mobile Money (Wave, MTN, Orange, Moov…) | ✅ | Orange Money dans `payments.routes` (initiate + verify) |
| Carte bancaire (Visa / Mastercard) | ✅ | Stripe (checkout, verify) |
| Wallet interne | ✅ | Modèle `Wallet` ; usage à confirmer pour commandes |
| Paiement à la livraison | ⚠️ | À vérifier dans `payment_method` / logique commande |
| Intégration PSP (Paystack, Flutterwave, Stripe) | ✅ | Stripe + Orange Money présents |
| Webhooks paiement | ⚠️ | Vérification Orange Money côté backend ; webhooks Stripe à confirmer |
| Réconciliation / gestion échecs / remboursements | ⚠️ | Transaction et statuts présents ; flux complets à auditer |

---

## 8. Payout vendeurs

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Solde vendeur | ✅ | `SellerWallet` (balance, currency) |
| Payout différé (ex. J+7) | ⚠️ | `Withdrawal` existe ; politique de délai à vérifier en logique métier |
| Historique payouts | ✅ | Modèle `Withdrawal` + `withdrawals.routes` |
| Blocage payout en cas de litige | ⚠️ | Modèle `Dispute` ; pas de liaison explicite blocage payout dans l’audit |
| Commission plateforme configurable | ✅ | `platformRevenueService`, commission dans `confirmPayment` |

---

## 9. Livraison & logistique

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Adresse utilisateur multi-pays | ✅ | `Address` (street, city, country, postal_code, phone) |
| Livraison locale / internationale | ✅ | `Shipping`, `ShippingRate` (destination_country), `shipping.routes` |
| Points relais | ❌ | Non trouvé dans le schéma |
| Calcul frais dynamique | ✅ | `shippingService.getShippingRates(destinationCountry, weight)` |
| Suivi statut livraison | ✅ | `Shipping.status`, `TrackingEvent` |
| Confirmation livraison | ⚠️ | Statut livraison présent ; flow « confirmation réception » à vérifier |

---

## 10. Avis, litiges & support

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Avis produits | ✅ | Modèle `Review` (product_id, rating, content, status) + `reviews.routes` |
| Avis vendeurs | ❌ | Pas d’entité « avis vendeur » distincte |
| Signalement produit | ⚠️ | `Moderation` / reports ; lien explicite « signalement produit » à confirmer |
| Litiges commande | ✅ | Modèle `Dispute` (order_id, user_id, seller_id, reason, status) |
| Blocage vendeur si abus | ✅ | Admin : `adminService.banUser` |
| Support utilisateur | ⚠️ | Pas de module support dédié (tickets, chat) dans l’audit |

**Important :** Les routes `reviews.routes.ts` existent mais **ne sont pas montées** dans `app.ts`.

**Implémenté :** API Dispute : `POST/GET/PATCH /api/disputes`, `dispute.service.ts` (create, list, getById, updateStatus/resolution). Monté dans `app.ts`. Frontend : `api.disputes.list/create/getById/update`.

---

## 11. Admin & back-office

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Dashboard admin | ✅ | `adminService.getDashboard`, `GET /api/admin/dashboard` |
| Gestion vendeurs / validation KYC | ⚠️ | Admin : users, role, ban ; pas de route dédiée « liste vendeurs » / validation KYC vendeur |
| Gestion produits / modération contenu | ⚠️ | Modération reports ; pas d’endpoints admin dédiés produits dans l’audit |
| Gestion commandes / paiements / payouts | ⚠️ | Orders et withdrawals existent ; pas d’endpoints admin dédiés dans l’audit |
| Gestion litiges | ❌ | Pas d’API Dispute donc pas de gestion litiges côté admin |
| Statistiques globales / exports comptables | ⚠️ | Dashboard présent ; exports à confirmer |

**Important :** Les routes `admin.routes.ts` existent mais **ne sont pas montées** dans `app.ts` (pas de `app.use('/api/admin', adminRoutes)`).

---

## 12. Sécurité & scalabilité

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| JWT + Refresh Token | ✅ | Auth (login, refresh) |
| Rate limiting | ⚠️ | À vérifier (middleware global) |
| Validation backend stricte | ✅ | Services + Prisma |
| Logs transactions | ✅ | `logger` dans services |
| Monitoring erreurs / sauvegardes / anti-fraude / protection API | ⚠️ | À vérifier (infra, config) |

---

## 13. Entités techniques minimales

| Entité | Statut | Détail |
|--------|--------|--------|
| User | ✅ | Présent |
| Seller | ✅ | Représenté par `User` + `SellerProfile` |
| Product | ✅ | Présent |
| Cart | ✅ | Présent (items en JSON) |
| CartItem | ⚠️ | Pas de modèle dédié ; champs dans `Cart.items` (JSON) |
| Order | ✅ | Présent |
| OrderItem | ✅ | Présent |
| Payment | ✅ | Représenté par `Transaction` + flux Orange Money / Stripe |
| Payout | ✅ | `Withdrawal` (+ modèle `Payout` pour créateurs selon schéma) |
| Review | ✅ | Présent (produit) |
| Dispute | ✅ | Modèle + `disputes.routes.ts` + `dispute.service.ts` (create, list by role, getById, update status/resolution) |
| Address | ✅ | Présent |

---

## 14. Flow standard Marketplace

| Étape | Statut | Détail |
|-------|--------|--------|
| Utilisateur explore les produits | ✅ | Marketplace, Product, recherche/filtres (partiellement backend) |
| Ajout au panier | ✅ | Si `/api/cart` est monté |
| Validation panier | ✅ | Création commande depuis panier |
| Paiement Mobile Money | ✅ | Orange Money initiate + verify |
| Webhook confirme paiement | ⚠️ | Vérification manuelle côté backend à confirmer |
| Création commande | ✅ | `createFromCart` (une commande globale actuellement) |
| Notification vendeur | ⚠️ | Notifications existantes ; notification « nouvelle commande » à confirmer |
| Livraison / suivi | ✅ | Shipping, tracking |
| Confirmation réception | ⚠️ | À lier clairement au statut commande/livraison |
| Crédit solde vendeur | ✅ | Dans `confirmPayment` (SellerWallet) |
| Payout vendeur | ✅ | Withdrawal |

---

## 15. Synthèse des manques critiques

1. **Routes non montées dans `app.ts`**  
   - **Cart** : `app.use('/api/cart', cartRoutes)`  
   - **Reviews** : `app.use('/api/reviews', reviewsRoutes)`  
   - **Admin** : `app.use('/api/admin', adminRoutes)`  

2. **Une commande par vendeur**  
   - Aujourd’hui : une commande pour tout le panier.  
   - À faire : scinder la commande en une commande par vendeur (ou par groupe de lignes par vendeur).

3. **API Dispute**  
   - Création, liste, mise à jour statut, résolution (et si besoin blocage payout si litige ouvert).

4. **Produits**  
   - Statut produit (brouillon / actif / suspendu).  
   - Optionnel : type (physique / digital / service), currency, brand, condition, delivery_options.

5. **Vendeurs**  
   - Statut vendeur (actif / suspendu / bloqué) sur `SellerProfile` (ou User).  
   - Pays/ville sur le profil vendeur.

6. **Recherche & filtrage backend**  
   - Filtres : prix (min/max), pays, note, vendeur vérifié, livraison.  
   - Tri : popularité, nouveauté, prix, ventes (paramètres `sort` / `order` dans `productService.list`).

7. **Panier**  
   - Vérification du stock dans `cartService.addItem` (et éventuellement à l’affichage du panier).  
   - Optionnel : calcul des frais par vendeur dans le panier.

8. **Payout**  
   - Règles de différé (ex. J+7) et blocage des payouts en cas de litige (lien Dispute ↔ Withdrawal / SellerWallet).

---

## Recommandations immédiates

1. Monter les routes existantes dans `app.ts` :  
   - `cart.routes` → `/api/cart`  
   - `reviews.routes` → `/api/reviews`  
   - `admin.routes` → `/api/admin`  

2. Créer les routes et services pour **Dispute** (CRUD + résolution + lien avec payout).

3. Ajouter **validation du stock** dans `cartService.addItem` (refuser ou limiter la quantité si stock insuffisant).

4. Prévoir l’évolution vers **une commande par vendeur** (split du panier par `seller_id` à la création de commande).

5. Étendre **productService.list** avec paramètres de tri et filtres (prix, pays, note, vendeur vérifié, etc.) pour respecter « backend first » et limiter la logique critique côté client.

Si vous voulez, on peut détailler les changements à faire dans le code (fichiers à modifier, signatures des routes, schéma Prisma) pour chaque point ci-dessus.
