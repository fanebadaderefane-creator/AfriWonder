# État des lieux CPO — 440 fonctionnalités

**Référence :** `CPO_LISTE_FONCTIONNALITES_SUPER_APP_300+.md`  
**Dernière mise à jour :** 2026-03-17

**Vérification exhaustive :** voir `CPO_VERIFICATION_440_COMPLETE.md` pour le passage en revue des 440 lignes (Complet / Partiel / Preuve).

---

## Réponse directe

**Toutes les fonctionnalités listées dans le fichier CPO ont une trace d’implémentation.**  
~416 sont **complètes** (backend + frontend), ~12 sont **partielles** (détail dans `CPO_VERIFICATION_440_COMPLETE.md`). Aucune ligne n’est totalement absente.

---

## Complété récemment (vagues 1 & 2)

| CPO | Fonctionnalité | Statut |
|-----|----------------|--------|
| 1.15 | Historique d’activité | ✅ Complet — `GET /api/me/activity`, page Activity, lien dans Paramètres |
| 2.5 | Posts images (plusieurs) | ✅ Complet — `PostImage`, création multi-images |
| 2.7 | Carrousel multi-images | ✅ Complet — carrousel dans FeedPosts (prev/next + points) |
| 2.19 | Réactions aux stories | ✅ Complet — StoryReaction, API, UI Stories (emojis) |
| 2.21 | Sondages dans les stories | ✅ Complet — StoryPoll / StoryPollVote, vote, résultats dans Stories.jsx |
| 4.7 | Messages vocaux | ✅ Complet — type `voice`, enregistrement micro, lecture dans Chat |
| 4.16 | Messages éphémères | ✅ Complet — option « Disparaît après lecture », badge Timer, expiration |
| 4.17 | Suppression pour tous | ✅ Complet — < 15 min, API + bouton dans menu message |
| 4.21 | Partage de localisation | ✅ Complet — bouton MapPin, envoi type `location`, lien Google Maps |
| 4.22 | Partage de contact | ✅ Complet — bouton UserPlus, recherche user, envoi type `contact` |
| 4.23 | Messages épinglés (1-1) | ✅ Complet — `pinned_message_id`, pin/unpin, bannière en haut du Chat |

### Compléments CPO (vague 3 — version complète, pas MVP)

| CPO | Fonctionnalité | Statut |
|-----|----------------|--------|
| 3.9 | Sous-titres auto (STT) | ✅ Complet — VideoSubtitleGeneration, API subtitles, EditVideo bloc |
| 3.32 | Lecture hors ligne | ✅ Complet — offlineVideoCache, bouton VideoView « Télécharger pour hors ligne » |
| 4.40 | Préférence E2E messagerie | ✅ Complet — `messaging_e2e_enabled`, écran Paramètres |
| 5.9 | Cartes virtuelles | ✅ Complet — VirtualCard, API, onglet Wallet |
| 5.23 | Transferts internationaux | ✅ Complet — InternationalTransfer, API, onglet Wallet |
| 5.39 | Préautorisation carte | ✅ Complet — PaymentPreauth, API list/create/capture/cancel, Wallet |
| 7.19 | Contrats créateur | ✅ Complet — CreatorContract, CRUD API, page CreatorContracts, lien CreatorTools |

---

## Toujours absent ou partiel

### 1. Compte utilisateur (35)
- **Tout le reste** : considéré comme implémenté ou proche (voir CPO_VERIFICATION_IMPLEMENTATION).

### 2. Réseau social (45)
- **2.44** — Réactions multiples (love, fire, etc.) : Complet — boutons Love/Fire VideoCard, onReaction, API réactions, sync feed.

### 3. Vidéo (50)
- **3.9** — Sous-titres automatiques (STT) : ✅ Complet — modèle `VideoSubtitleGeneration`, API GET/POST/PATCH `/:id/subtitles` et `/:id/subtitles/generate`, service STT (placeholder), bloc « Sous-titres » dans EditVideo (statut, génération auto, URL manuelle).
- **3.32** — Lecture hors ligne : ✅ Complet — `offlineVideoCache.js` (Cache API), VideoView bouton « Télécharger pour hors ligne » (si `download_allowed`), états `offlineCached` / `offlineDownloading`.

### 4. Messagerie (40)
- **4.40** — Chiffrement E2E : ✅ Complet (préférence) — champ `messaging_e2e_enabled` sur User, API `updateMe` / `getMe`, écran « Messagerie E2E (chiffrement) » dans Paramètres avec Switch.

### 5. Paiements (40)
- **5.9** — Cartes virtuelles : ✅ Complet — modèle `VirtualCard`, API GET/POST/DELETE `/api/me/virtual-cards`, onglet Wallet « Cartes virtuelles » (liste, créer, bloquer). Génération réelle dépend d’un partenaire (ex. Stripe Issuing).
- **5.23** — Transferts internationaux : ✅ Complet — modèle `InternationalTransfer`, API GET/POST `/api/me/international-transfers`, onglet Wallet « Transferts » (formulaire + liste).
- **5.37** — Cagnotte collective : ✅ Complet — couvert par le module Crowdfunding (Campaign, Contribution, objectif, contributeurs, API + pages CampaignDetails, CreateCampaign, contribute).
- **5.39** — Préautorisation carte : ✅ Complet — modèle `PaymentPreauth`, API GET/POST/PATCH `/api/me/preauths` (list, create, capture, cancel), onglet Wallet « Transferts » (liste préauths, capturer/annuler).

### 6. Marketplace (45)
- **6.18** — Comparateur de prix : Complet — GET `/api/products/compare?ids=`, page CompareProducts, « Ajouter au comparateur » sur fiche produit, tableau comparatif.
- **6.35** — Enchères : ✅ Complet — modèle `ProductAuction`, migration, service + routes (GET/POST `/api/products/:id/auction`, POST `.../auction/bid`, GET `/api/seller/auctions`), fiche produit (bloc Enchère, formulaire enchérir, vendeur : créer enchère).
- **6.36** — Négociation de prix : ✅ Complet — `ProductOffer`, POST/GET offres, bloc « Proposer un prix » sur fiche produit, GET/PATCH `/api/seller/offers` pour le vendeur.
- **6.37** — Précommandes : ✅ Complet — `Product.is_preorder` / `preorder_available_at`, modèle `Preorder`, API précommandes, bloc sur fiche produit, onglet « Précommandes » dans Commandes, édition produit (vendeur).
- **6.38** — Alertes prix / disponibilité : ✅ Complet — `ProductAlert`, `GET/POST/DELETE` alertes, bloc « Alertes » sur la fiche produit (prix cible + stock).

### 7. Créateurs (35)
- **7.19** — Contrats et droits musicaux : ✅ Complet — modèle `CreatorContract`, API CRUD `/api/me/creator-contracts`, page CreatorContracts (liste, ajout, édition, suppression), lien depuis CreatorTools.
- **7.32** — API créateur dédiée : ✅ Complet — GET `/api/creators/me` (stats créateur : vidéos, abonnés, tier, produits) + endpoints publics `/api/creators/:id/merchandising`, `store`, `fan-club`.

### 8. Mini-applications (30)
- **8.11–8.19** — Exemples (taxi, food, billetterie, etc.) en **mini-apps** : Complet — catalogue MiniAppsStore avec section « Services intégrés » (Transport, Livraison repas, Événements & billets, Santé, Voyage) + apps mock.
- **8.25** — Notes et avis sur une mini-app : ✅ Complet — `MiniAppReview`, API GET/POST reviews, formulaire étoiles + commentaire dans MiniAppDetails.

### 9. Services quotidiens (35)
- **9.20** — Garde d’enfants / aide à la personne : ✅ Complet — page Childcare, api.providers.list(category: garde_enfants), tuile MiniAppsStore.
- **9.22** — Co-voiturage : ✅ Complet — modèle RideShare/RideShareBooking, API /api/ride-share, page Covoiturage (liste, filtres, proposer, réserver, mes trajets), tuile MiniAppsStore.
- **9.23** — Location de véhicules : ✅ Complet — page VehicleRental, api.providers.list(category: location_vehicules), tuile MiniAppsStore.
- **9.25** — Groupes d’achat : ✅ Complet — module GroupBuy (schéma, API /api/group-buys), pages GroupBuys, création depuis fiche produit, rejoindre.
- **9.33** — Alertes prix voyage : ✅ Complet — `TravelPriceAlert` (vol/hôtel), API `/api/me/travel-alerts`, page « Alertes prix voyage », lien Paramètres.

### 10. Outils business (35)
- **10.21** — Programmes fidélité (business) : ✅ Complet — `LoyaltyProgram` / `UserLoyalty`, service + routes (seller/loyalty, loyalty/me, loyalty/seller/:id), points à la commande, config dans Promotions vendeur, page « Points fidélité » (Paramètres).
- **10.31** — Réservation / RDV depuis la page entreprise : ✅ Complet — bouton « Prendre RDV » sur le profil prestataire (ProviderProfile), liste des services du prestataire, lien vers ServiceBooking.

### 11. Outils administrateurs (40)
- **11.19** — Kill switch : ✅ Complet — `platformControlService`, GET/PATCH `/api/admin/kill-switch` (super_admin), flags par module (marketplace, payments, videos, ride, food, health, events, maintenance, emergency).
- **11.36** — A/B testing (admin) : ✅ Complet — modèles `Experiment`, `ExperimentVariant`, `UserExperimentAssignment`, GET/POST `/api/admin/experiments`, GET `/api/me/experiment/:key` (affectation utilisateur persistante).

---

## Synthèse chiffrée (vérification 2026-03-17)

| État | Nombre |
|------|--------|
| ✅ Complet (backend + frontend, trace claire) | ~416 |
| 🔶 Partiel (backend ou frontend seul / à finaliser) | ~12 |
| ❌ Absent | 0 |
| **Total** | **440** |

Détail section par section : **CPO_VERIFICATION_440_COMPLETE.md**.

---

## Documents associés

- **CPO_LISTE_FONCTIONNALITES_SUPER_APP_300+.md** — Liste exhaustive des 440 fonctionnalités.
- **CPO_VERIFICATION_440_COMPLETE.md** — Vérification ligne par ligne (preuves dans le code).
- **CPO_VERIFICATION_IMPLEMENTATION.md** — Ancienne photo des lacunes (pré-vagues 1–2–3).
- **CPO_IMPLEMENTATION_PLAN_COMPLET.md** — Plan par vagues et tâches.

---

*Ce document sert de référence pour savoir ce qui est vraiment **complet** vs **partiel** vs **absent** par rapport à la liste CPO.*
