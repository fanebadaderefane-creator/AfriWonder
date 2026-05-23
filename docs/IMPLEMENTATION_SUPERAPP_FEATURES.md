# Implémentation des fonctionnalités Partiel / Absent

Ce document résume les changements effectués pour compléter les fonctionnalités marquées **Partiel** ou **Absent** dans `VERIFICATION_FONCTIONNALITES_SUPER_APP.md`.

---

## 1. Migration base de données

**À exécuter une fois** (après avoir appliqué les modifications du schéma Prisma) :

```bash
cd backend
npx prisma migrate deploy
# ou en dev :
npx prisma migrate dev --name superapp_partial_absent_features
```

La migration se trouve dans :  
`backend/prisma/migrations/20260315000000_superapp_partial_absent_features/migration.sql`

Elle crée ou ajoute notamment :

- **Post** (feed social texte/image)
- **Comment.mention_ids** (mentions @username)
- **Video** : remix_of_id, subtitle_url, download_allowed, is_premium
- **VideoChapter**
- **Message** : is_ephemeral, expires_at, location_*, contact_*, sticker_url
- **PaymentRequest** (paiement par QR)
- **BusinessPage**
- **LiveStreamProduct** (live commerce)
- **Product.delivery_url** (produits digitaux)
- **CashbackConfig**
- **ChatBot**
- **Order.cashback_amount**

---

## 2. Nouvelles routes API

| Préfixe | Description |
|--------|-------------|
| `POST/GET/PUT/DELETE /api/posts` | Posts texte/image, feed, archives |
| `GET /api/posts/archived` | Mes posts archivés |
| `POST /api/payment-request` | Créer une demande de paiement (générer QR) |
| `POST /api/payment-request/pay` | Payer via qr_token (scan QR) |
| `GET /api/payment-request/:qrToken` | Détail demande (affichage avant paiement) |
| `GET /api/videos/archived/list` | Mes vidéos archivées |
| `PUT /api/videos/:id/archive` | Archiver une vidéo |
| `GET/POST /api/videos/:id/chapters` | Chapitres VOD |
| `GET /api/videos/:id/download` | URL de téléchargement (si autorisé) |
| `PUT/GET /api/business-page` | Page entreprise (créer / ma page) |
| `GET /api/business-page/slug/:slug` | Page par slug (public) |
| `GET /api/chatbot`, `GET /api/chatbot/:username` | Liste bots, détail bot |
| `GET /api/products/compare?ids=id1,id2` | Comparateur de prix |
| `GET/POST/DELETE /api/live/:id/products` | Produits en vente pendant le live (live commerce) |
| `GET /api/seller/customers` | CRM : acheteurs ayant commandé chez moi |

---

## 3. Comportements modifiés

- **Commentaires** : les mentions `@username` dans le contenu sont extraites et stockées dans `mention_ids`.
- **Messages** : types supportés `text`, `image`, `video`, `audio`, `voice`, `file`, `sticker`, `location`, `contact`. Body étendu avec `is_ephemeral`, `expires_at`, `location_lat`, `location_lng`, `location_label`, `contact_user_id`, `contact_name`, `sticker_url`.
- **Vidéo** : à la création, champs optionnels `remix_of_id`, `subtitle_url`, `download_allowed`, `is_premium`.
- **Commande** : après confirmation de paiement, application du cashback (CashbackConfig actif) et enregistrement de `cashback_amount` sur la commande.

---

## 4. Deuxième vague (migration 20260315120000_superapp_remaining_features)

- **Pages publiques** : `GET /api/users/username/:username` (profil public par username).
- **Montage vidéo** : `Video.trim_start_sec`, `trim_end_sec` ; `POST /api/videos/:id/trim`.
- **Filtres vidéo** : modèle `VideoFilter`, `GET /api/filters`.
- **Stickers** : modèles `StickerPack`, `Sticker` ; `GET /api/stickers/packs`, `GET /api/stickers/packs/:id/stickers`.
- **Messages éphémères** : exclusion des messages éphémères expirés dans `getMessages` ; `GET /api/messages/export` (sauvegarde cloud).
- **Appels groupe** : modèles `GroupCall`, `GroupCallParticipant` ; `POST /api/group-calls`, `GET /api/group-calls/room/:roomId`, `POST /api/group-calls/:callId/join`, `POST /api/group-calls/:callId/leave`.
- **Multi-appareils** : `UserSession` ; `GET /api/me/sessions`, `DELETE /api/me/sessions/:id`.
- **Marketplace créateur** : `GET /api/creators/:id/store` (produits vendus par le créateur).
- **Fan-club** : `GET /api/creators/:id/fan-club` (tier abo + wonder/followers count).
- **Collaboration marques** : modèle `BrandDeal` ; CRUD `GET/POST/GET/PATCH/DELETE /api/brand-deals`.
- **Services publics** : modèle `PublicService` ; `GET /api/public-services`.

---

## 5. Troisième vague (migration 20260315140000_parcel_merchandising)

- **Livraison colis** : modèle `ParcelShipment` (envoi standalone, hors commande). Routes : `POST /api/shipping/parcel` (créer), `GET /api/shipping/parcel` (mes colis), `GET /api/shipping/parcel/track/:trackingNumber` (suivi public), `GET /api/shipping/parcel/:id`, `PUT /api/shipping/parcel/:id/status`, `POST /api/shipping/parcel/:id/tracking`.
- **Vente merchandising** : `Product.is_merchandising` ; `GET /api/creators/:id/merchandising` (produits merchandising du créateur) ; création/édition produit avec champ `is_merchandising`.

---

## 6. Non implémenté (hors scope court terme)

- **Paiement en magasin** (terminaux / partenaires)
- **Cartes virtuelles** (prestataire carte)
- **Transferts internationaux** (conformité / prestataires)
- **Messages éphémères “disparition après lecture”** (actuellement : expiration dans le temps via `expires_at`)

---

## 7. Frontend

Les écrans ou composants pour **Posts**, **Archives**, **Paiement QR**, **Business Page**, **Chatbot**, **Comparateur**, **Live commerce**, **CRM** peuvent être ajoutés progressivement en s’appuyant sur les routes ci-dessus.
