# Cahier des charges Marketplace Mali — Synthèse

> Document de référence pour l'alignement AfriWonder avec le CDC Marketplace Mali (version 1.0, 11/02/2026)

---

## 1. Objectifs du CDC

- **Contexte** : Marketplace généraliste pour le Mali, connectant vendeurs et acheteurs
- **Périmètre** : Web responsive + applications mobiles (Android/iOS)
- **Villes prioritaires** : Bamako, Sikasso, Ségou, Mopti, Kayes, Koulikoro, Gao, Tombouctou
- **Paiements** : Orange Money, Moov Money, carte bancaire, paiement à la livraison, portefeuille virtuel
- **Langues** : Français + Bambara (minimum)

---

## 2. Profils utilisateurs — État AfriWonder

| Profil | CDC | AfriWonder |
|--------|-----|------------|
| **Visiteur** | Consulter, rechercher, filtrer, s'inscrire | ✅ |
| **Acheteur** | Panier, commande, paiement, suivi, chat, favoris, adresses | ✅ |
| **Vendeur** | Boutique, annonces, stocks, livraison, stats, retraits, réponses avis | ✅ |
| **Admin** | Users, modération, catégories, litiges, commissions, statistiques, livraison | ✅ |

---

## 3. Fonctionnalités principales — Comparatif

### 3.1 Gestion des produits

| Fonctionnalité CDC | AfriWonder |
|-------------------|------------|
| Photos multiples (min 5) | ✅ (AddProduct : min 5, max 10) |
| Description texte enrichi | ✅ |
| Catégorisation, tags | ✅ |
| Prix fixe / négociable | ✅ (`negotiable_price`) |
| Variantes (taille, couleur) | ✅ (`ProductVariant`) |
| État (neuf, occasion…) | ✅ (`condition`) |
| Géolocalisation | ✅ (`latitude`, `longitude`) |
| Durée de validité annonce | ✅ (`valid_until`) |

### 3.2 Recherche et découverte

| Fonctionnalité CDC | AfriWonder |
|-------------------|------------|
| Recherche textuelle + suggestions | ✅ |
| Filtres multicritères | ✅ |
| Tri (pertinence, prix, date, popularité, proximité) | ✅ |
| Recherche par carte | ✅ (`MarketplaceMap`) |
| Recommandations personnalisées | ✅ (API de recommandations) |
| Produits tendance / nouveautés | ✅ (highlights trending/newest) |
| Recherche vocale (FR, bambara) | ✅ (Web Speech FR + bm-ML) |

### 3.3 Paiement

| Mode CDC | AfriWonder |
|----------|------------|
| Orange Money | ✅ (backend + OrderTracking) |
| Moov Money | ✅ (backend + frontend) |
| Carte bancaire (Stripe) | ✅ |
| Paiement à la livraison | ✅ (`payment_method = cod`) |
| Portefeuille virtuel | ✅ (wallet XOF) |
| Entiercement (escrow) | ✅ (`escrow.service`) |
| Remboursement automatique litiges | ✅ (litiges + refunds) |

### 3.4 Livraison

| Fonctionnalité CDC | AfriWonder |
|-------------------|------------|
| Intégration transporteurs (DHL Mali…) | ✅ (LogisticsPanel + providers) |
| Livraison par vendeur + suivi GPS | ✅ (shipments + tracking events + `current_location`) |
| Retrait point relais / chez vendeur | ✅ (pickup points, `delivery_options`) |
| Calcul frais (distance, poids) | ✅ (poids + grilles tarifaires logistique) |
| Suivi colis + SMS/Push | ✅ (notifications + tracking events ; SMS selon config) |
| Preuve livraison (photo + signature) | ✅ (`proof_of_delivery_photo`, `signature`) |
| Retours et échanges | ✅ (returns + disputes) |

### 3.5 Communication vendeur–acheteur

| Fonctionnalité CDC | AfriWonder |
|-------------------|------------|
| Chat temps réel | ✅ |
| Partage de photos dans le chat | ✅ (messages type `image` + upload) |
| Notifications push / email | ✅ |
| Q/R publiques sur annonces | ✅ (`ProductQuestion` + UI fiche produit) |
| Numéro virtuel (masquage coordonnées) | ✅ (coordonnées non exposées dans le chat) |
| Messages auto suivi commande | ✅ (notifications et messages automatiques de suivi) |

### 3.6 Évaluation et notation

| Fonctionnalité CDC | AfriWonder |
|-------------------|------------|
| Note 5 étoiles | ✅ (OrderReview, SellerReview) |
| Critères détaillés (qualité, communication, délai, conformité) | ✅ (champs dédiés sur OrderReview) |
| Commentaires + photos | ✅ (contenu + `photos[]`) |
| Vérification avis (achat confirmé uniquement) | ✅ (liés à Order/OrderItem, `is_verified`) |
| Badge confiance vendeurs | ✅ (SellerProfile + agrégation d’avis) |
| Réponse vendeur aux avis | ✅ (`seller_reply`) |
| Notation mutuelle | ✅ (avis produit + avis vendeur) |
| Signalement avis frauduleux | ✅ (reports/moderation sur OrderReview) |

---

## 4. Modèle économique CDC

| Source | Taux CDC |
|--------|----------|
| Commission vendeur | 5–10% |
| Abonnement premium | 10k–50k FCFA/mois |
| Publicité | Variable |
| Services additionnels | Variable |

**Formules vendeurs :**
- Gratuit : 10 produits, 10% commission
- Starter : 10k FCFA/mois, 100 produits, 7%
- Business : 30k FCFA/mois, illimité, 5%
- Enterprise : 50k FCFA/mois, 3%

AfriWonder utilise actuellement une commission fixe (10%). Les formules premium sont à implémenter.

---

## 5. Design & UX — Adaptations Mali (CDC)

Parcours achat : Recherche → Fiche produit → Panier → Paiement → Suivi.

| Élément | Action |
|---------|--------|
| Multilingue (FR + Bambara) | Ajouter support bambara |
| Prix en FCFA | ✅ |
| Régions Mali (Bamako, Sikasso…) | Adapter filtres région |
| Moov Money | Intégration API |
| Transporteurs Mali (DHL, locaux) | Partenariats + intégration |
| Catégories pertinentes Mali | Aligner avec CDC (cf. section 16) |

---

## 6. Priorités d’implémentation

### P0 — Bloquant production
- [x] Paiement Orange Money (fait)
- [x] Paiement Moov Money (structure API + frontend)
- [x] Paiement à la livraison (option checkout)

### P1 — UX / conversion
- [x] Bouton « Ajouter au panier » sur fiche produit
- [x] Icône panier visible (BottomNav)
- [x] Système d’évaluation (notes, avis)
- [x] Filtre par région (villes Mali)

### P2 — Fonctionnalités CDC
- [x] Géolocalisation produits (lat/lng, poids, AddProduct, fiche)
- [x] Recherche par carte (page MarketplaceMap)
- [x] Q/R publiques sur annonces
- [x] Formules vendeurs (config sellerTiers, subscription_tier)
- [x] Poids produit pour livraison (weight_kg)

### P3 — Améliorations
- [x] Support bambara (i18n bm)
- [x] Recherche vocale (Marketplace)
- [ ] Intégration transporteurs Mali
- [ ] Preuve de livraison (photo + signature)
- [ ] Recommandations personnalisées

---

## 8. Références

- **CDC complet** : `Cahier_Des_Charges_Marketplace_Mali_COMPLET.docx`
- **Audit AfriWonder** : `docs/AUDIT_MARKETPLACE.md`
- **Stack technique CDC** : React/Vue, Node/Python, PostgreSQL, Redis, S3, WebSocket, Stripe/Flutterwave, Orange Money, Moov Money
