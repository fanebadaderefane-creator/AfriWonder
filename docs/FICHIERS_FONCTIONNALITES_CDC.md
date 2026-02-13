# Fichiers des fonctionnalités CDC — Publicité & Monétisation

**Référence** : CDC complet (système publicitaire, revenus, support créateur, premium, badges)

---

## 📢 1. SYSTÈME PUBLICITAIRE (CORE BUSINESS)

### Logique de diffusion (1 pub / 4-5 contenus, plein écran)

| Fichier | Rôle |
|---------|------|
| `backend/src/services/feed.service.ts` | Fusion vidéos + pubs (fréquence 1/4-5) |
| `backend/src/routes/feed.routes.ts` | GET /api/feed |
| `src/pages/Home.jsx` | Feed "Pour toi" avec vidéos + pubs |
| `src/components/video/AdCard.jsx` | Carte pub plein écran, badge "Sponsorisé", CTA |
| `src/api/expressClient.js` | `api.feed.list()`, `api.ads.*` |

### Types de publicités (In-Feed, Sponsored, Business, Story)

| Fichier | Rôle |
|---------|------|
| `backend/prisma/schema.prisma` | Modèle AdCampaign (ad_type: in_feed, sponsored_video, business_campaign, story) |
| `backend/src/services/ads.service.ts` | Logique campagnes, créatifs, ciblage |
| `backend/src/routes/ads.routes.ts` | Routes /api/ads/* |

### Durée des campagnes (1 à 90 jours, expiration auto)

| Fichier | Rôle |
|---------|------|
| `backend/src/services/ads.service.ts` | `AD_PRICING_BY_DURATION`, `expireCampaigns()` |
| `backend/src/jobs/adsExpiration.job.ts` | Job horaire : active → expired |
| `backend/prisma/schema.prisma` | AdCampaign.starts_at, ends_at, status |

### Tarification FCFA (Mode 1 par durée)

| Fichier | Rôle |
|---------|------|
| `backend/src/services/ads.service.ts` | `AD_PRICING_BY_DURATION` (2000 à 85000 FCFA) |
| `backend/src/routes/ads.routes.ts` | GET /api/ads/pricing |

### Ciblage (pays, ville, âge, sexe, intérêts)

| Fichier | Rôle |
|---------|------|
| `backend/prisma/schema.prisma` | AdCampaign.target_countries, target_cities, target_age_min/max, target_gender, target_interests |
| `backend/src/services/ads.service.ts` | `getActiveAdsForFeed()` — filtre par pays, âge, sexe |

### Dashboard annonceur (vues, clics, conversion, coût, durée restante)

| Fichier | Rôle |
|---------|------|
| `backend/src/services/ads.service.ts` | `getAdvertiserCampaigns()`, `getCampaignStats()` |
| `backend/src/routes/ads.routes.ts` | GET /api/ads/campaigns, GET /api/ads/campaigns/:id |
| `src/api/expressClient.js` | `api.ads.getCampaigns()`, `api.ads.getCampaignStats()` |
| **À créer** | `src/pages/AdvertiserDashboard.jsx` (dashboard campagnes pub — distinct de CreateCampaign crowdfunding) |

### Gestion technique (upload, validation admin, CDN)

| Fichier | Rôle |
|---------|------|
| `backend/src/services/ads.service.ts` | `submitForReview()`, `approveCampaign()`, `rejectCampaign()` |
| `backend/src/routes/ads.routes.ts` | POST submit, approve, reject (admin) |
| `backend/src/routes/upload.routes.ts` | Upload média (existant) |
| **À créer** | UI admin validation campagnes |

### Règles (Sponsorisé, contenu interdit, signalement)

| Fichier | Rôle |
|---------|------|
| `src/components/video/AdCard.jsx` | Badge "Sponsorisé" |
| `backend/prisma/schema.prisma` | AdCreative.is_approved, rejection_reason |
| `backend/src/routes/moderation.routes.ts` | Signalement (existant) |

### Base de données

| Fichier | Rôle |
|---------|------|
| `backend/prisma/schema.prisma` | AdCampaign, AdCreative, AdImpression, AdClick |
| `backend/prisma/migrations/20260213140000_ads_system_phase1/migration.sql` | Migration tables pub |

---

## 💰 2. SÉPARATION DES REVENUS

### Modèles & services

| Fichier | Rôle |
|---------|------|
| `backend/prisma/schema.prisma` | PlatformRevenue (source: ads, gifts_tips, marketplace) |
| `backend/src/services/platformRevenue.service.ts` | Agrégation revenus |
| `backend/src/routes/admin.routes.ts` | Dashboard admin (revenue) |
| `backend/src/services/admin.service.ts` | getDashboard, revenus |
| `backend/src/services/commission.service.ts` | Commission marketplace |
| `backend/src/config/commissions.ts` | 70/30 gifts, commission marketplace |

### Dashboard Admin global

| Fichier | Rôle |
|---------|------|
| `src/pages/AdminDashboard.jsx` | Page admin |
| `src/components/admin/FinancePanel.jsx` | Revenus, stats |
| `src/components/admin/OverviewPanel.jsx` | Vue d’ensemble |

---

## 🎥 3. MONÉTISATION CRÉATEURS (MVP)

### Support Créateur (bouton "Soutenir" → wallet)

| Fichier | Rôle |
|---------|------|
| `backend/prisma/schema.prisma` | CreatorSupport (supporter_id, creator_id, amount_fcfa, creator_earnings, platform_fee) |
| `backend/prisma/migrations/20260213140000_ads_system_phase1/migration.sql` | Table CreatorSupport |
| **À créer** | `backend/src/services/creatorSupport.service.ts` |
| **À créer** | `backend/src/routes/creatorSupport.routes.ts` |
| `src/components/video/TipModal.jsx` | Modal tip (existant, à adapter) |
| `docs/AUDIT_SOUTENIR_CREATEUR.md` | Spécifications |

### Gifts pendant live

| Fichier | Rôle |
|---------|------|
| `backend/src/services/live.service.ts` | Gifts live |
| `backend/src/routes/gifts.routes.ts` | API gifts |
| `src/components/live/GiftSelector.jsx` | Sélecteur de gifts |
| `src/components/live/GiftAnimation.jsx` | Animation gift |

### Tips sur vidéos

| Fichier | Rôle |
|---------|------|
| `backend/src/services/videoTip.service.ts` | Tips vidéo (70/30) |
| `backend/src/routes/videos.routes.ts` | Endpoint tip |
| `src/components/video/TipModal.jsx` | Modal tip |
| `src/pages/Home.jsx` | Bouton tip sur VideoCard |

---

## 👑 4. ABONNEMENT PREMIUM CRÉATEURS

### Modèles & tarifs (Basic 1000, Pro 3000 FCFA/mois)

| Fichier | Rôle |
|---------|------|
| `backend/prisma/schema.prisma` | CreatorSubscription (tier: basic, pro) |
| `backend/prisma/migrations/20260213140000_ads_system_phase1/migration.sql` | Table CreatorSubscription |
| `backend/src/services/subscription.service.ts` | Abonnements (existant, à étendre) |
| **À créer** | Routes CreatorSubscription (basic/pro) |
| `src/components/creator/SubscriptionTiers.jsx` | Affichage offres (existant) |

### Avantages (badge, priorité feed, analytics)

| Fichier | Rôle |
|---------|------|
| `backend/prisma/schema.prisma` | User.is_verified, CreatorSubscription.tier |
| `src/components/video/VideoCard.jsx` | Badge vérifié (BadgeCheck) |
| `src/components/gamification/UserBadgeDisplay.jsx` | Affichage badges |
| `backend/src/services/video.service.ts` | Priorité feed (à implémenter) |

---

## 🏅 5. SYSTÈME DE BADGES

| Fichier | Rôle |
|---------|------|
| `src/components/gamification/UserBadgeDisplay.jsx` | Affichage badges |
| `src/components/gamification/UserLevelBadge.jsx` | Badge niveau |
| `src/components/video/VideoCard.jsx` | BadgeCheck (vérifié) |
| `backend/prisma/schema.prisma` | UserBadge, CreatorLevel |
| `backend/src/services/gamification.service.ts` | Logique badges |
| `src/pages/BadgesProfile.jsx` | Page badges profil |

---

## ⚙️ 6. MISE À JOUR SANS RÉINSTALLATION

| Fichier | Rôle |
|---------|------|
| `backend/src/services/feed.service.ts` | Feed dynamique (appel API à chaque chargement) |
| `backend/src/services/ads.service.ts` | Campagnes modifiables en temps réel |
| `src/pages/Home.jsx` | Utilise api.feed.list() (pas de cache statique) |

---

## 🧪 7. TESTS

| Fichier | Rôle |
|---------|------|
| `backend/__tests__/ads.test.ts` | Tests intégration API ads |
| `backend/__tests__/ads.service.test.ts` | Tests unitaires ads service |
| `tests/e2e/feed-ads.spec.ts` | E2E feed + pubs |
| `scripts/verify-ads-feed-connectivity.js` | Vérif connectivité |
| `backend/scripts/load-test.k6.js` | Load test (feed, ads) |
| `scripts/load-test-feed.k6.js` | Load test dédié feed |

---

## ⚠️ PAGES EXISTANTES (autres modules)

| Page | Usage | À ne pas confondre avec |
|------|-------|-------------------------|
| `CreateCampaign.jsx` | Crowdfunding (levée de fonds) | Campagnes publicitaires |
| `CampaignDetails.jsx` | Détail campagne crowdfunding | Stats campagnes pub |

---

## 📋 RÉSUMÉ — FICHIERS À CRÉER / COMPLÉTER

| Fonctionnalité | Statut | Fichiers manquants |
|----------------|--------|---------------------|
| Dashboard annonceur (pub) | ❌ À créer | `src/pages/AdvertiserDashboard.jsx` |
| UI admin validation campagnes | ❌ À créer | Section dans AdminDashboard ou page dédiée |
| Support Créateur (API + UI) | ❌ À créer | `creatorSupport.service.ts`, routes, bouton "Soutenir" |
| Premium créateur (Basic/Pro) | ⚠️ Partiel | Routes API, paiement récurrent |
| Mode 2 tarification (CPM/CPC) | ❌ Optionnel | Extension ads.service |
| Story Ads | ❌ Optionnel | Si module Stories activé |

---

## 📁 ARBORESCENCE PRINCIPALE

```
backend/
├── prisma/
│   ├── schema.prisma          # AdCampaign, AdCreative, CreatorSupport, CreatorSubscription, PlatformRevenue
│   └── migrations/20260213140000_ads_system_phase1/
├── src/
│   ├── services/
│   │   ├── ads.service.ts     # Core pub
│   │   ├── feed.service.ts    # Feed combiné
│   │   ├── platformRevenue.service.ts
│   │   └── videoTip.service.ts
│   ├── routes/
│   │   ├── ads.routes.ts
│   │   └── feed.routes.ts
│   └── jobs/
│       └── adsExpiration.job.ts

src/
├── pages/
│   └── Home.jsx               # Feed avec pubs
├── components/
│   └── video/
│       ├── AdCard.jsx         # Carte pub
│       └── TipModal.jsx       # Tips
└── api/
    └── expressClient.js       # api.feed, api.ads
```
