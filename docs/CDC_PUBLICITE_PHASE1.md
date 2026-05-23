# CDC Module Publicité & Monétisation — Phase 1

**Date** : 13 février 2026  
**Dernière mise à jour** : 13 février 2026

---

## 🎯 OBJECTIF GLOBAL

Mettre en place un système publicitaire complet, scalable et monétisable dès le lancement, inspiré de TikTok, avec intégration native dans le feed vidéo, gestion des campagnes, tarification flexible et tracking des performances.

**Objectif final** : Générer des revenus dès le premier jour sans dépendre d'investisseurs.

---

## 📢 1. SYSTÈME PUBLICITAIRE (CORE BUSINESS)

### 🧠 LOGIQUE DE DIFFUSION

| Spécification | Statut | Implémentation |
|---------------|--------|-----------------|
| Intégration native dans le feed vidéo (Home) | ✅ | `feed.service.ts` + `api.feed.list()` |
| Fréquence : 1 publicité tous les 4 à 5 contenus organiques | ✅ | `AD_FREQUENCY_MIN=4`, `AD_FREQUENCY_MAX=5` |
| Format : Vidéo plein écran (comme un post normal) | ✅ | `AdCard.jsx` |
| Scroller pour ignorer | ✅ | Comportement natif feed |
| Cliquer (CTA : Acheter / Visiter / Installer) | ✅ | `AdCard.jsx` + `recordClick` |

---

### 🎥 TYPES DE PUBLICITÉS

| Type | Statut | Implémentation |
|------|--------|----------------|
| 1. In-Feed Ads (principal) | ✅ | `ad_type: 'in_feed'` |
| 2. Sponsored Video (boost de contenu) | ⚠️ Optionnel | - |
| 3. Business Campaign (multi-vidéos) | ✅ | Créatifs multiples par campagne |
| 4. Story Ads | ⚠️ Optionnel si story activée | - |

---

### ⏱️ DURÉE DES CAMPAGNES

Chaque publicité doit obligatoirement avoir une durée définie :

| Durée | Statut |
|-------|--------|
| 1 jour | ✅ |
| 3 jours | ✅ |
| 7 jours | ✅ |
| 14 jours | ✅ |
| 30 jours | ✅ |
| 60 jours | ✅ |
| 90 jours | ✅ |

**À expiration :**
- La publicité est automatiquement désactivée ✅ `adsExpiration.job.ts`
- Elle disparaît du feed ✅ `expireCampaigns()`
- Les stats restent accessibles ✅

---

### 💰 TARIFICATION (FLEXIBLE + ADAPTÉE AFRIQUE)

#### 🔹 MODE 1 : PAR DURÉE

| Durée | Prix (FCFA) | Statut |
|-------|-------------|--------|
| 1 jour | 2 000 | ✅ |
| 3 jours | 5 000 | ✅ |
| 7 jours | 10 000 | ✅ |
| 14 jours | 18 000 | ✅ |
| 30 jours | 35 000 | ✅ |
| 60 jours | 60 000 | ✅ |
| 90 jours | 85 000 | ✅ |

#### 🔹 MODE 2 : PAR PERFORMANCE (OPTIONNEL)

| Mode | Statut |
|------|--------|
| Paiement par vues (CPM) | ❌ Non implémenté |
| Paiement par clic (CPC) | ❌ Non implémenté |

---

### 🎯 CIBLAGE PUBLICITAIRE

| Critère | Statut | Implémentation |
|---------|--------|----------------|
| Pays | ✅ | `target_countries` |
| Ville (optionnel) | ✅ | `target_cities` |
| Âge | ✅ | `target_age_min`, `target_age_max` |
| Sexe (optionnel) | ✅ | `target_gender` |
| Centres d'intérêt (basique) | ✅ | `target_interests` |

---

### 📊 DASHBOARD ANNONCEUR

| Fonctionnalité | Statut | Implémentation |
|----------------|--------|-----------------|
| Nombre de vues | ✅ | `getCampaignStats()` → impressions |
| Nombre de clics | ✅ | idem → clicks |
| Taux de conversion | ✅ | Calcul CTR côté front |
| Coût total | ✅ | `price_fcfa` sur campagne |
| Durée restante | ✅ | `ends_at` |
| Performance par jour | ✅ | Stats agrégées |
| Page dédiée | ✅ | `AdvertiserDashboard.jsx` |

---

### ⚙️ GESTION TECHNIQUE

| Règle | Statut | Implémentation |
|-------|--------|----------------|
| Upload vidéo/image publicité | ✅ | `addCreative()` avec `media_url` |
| Validation admin obligatoire avant diffusion | ✅ | `submitForReview()` → `approveCampaign()` |
| Stockage CDN optimisé | ✅ | URLs externes (S3) |
| Compression automatique | ⚠️ Optionnel | - |

### 👑 VALIDATION ADMIN — Comment approuver les campagnes

1. **Accès** : Se connecter avec un compte admin (super_admin, admin, finance_admin ou moderation_admin)
2. **Navigation** : Aller sur **AdminDashboard** (Centre de Contrôle) → onglet **« Campagnes pub »**
3. **Liste** : Les campagnes en statut `pending_review` s'affichent avec aperçu du créatif
4. **Aperçu** : Cliquer sur la miniature pour voir l'image/vidéo en grand avant de décider
5. **Approuver** : Bouton vert « Approuver » → la campagne passe en `active` et apparaît dans le feed
6. **Rejeter** : Optionnellement saisir une raison, puis bouton rouge « Rejeter » → la campagne passe en `rejected`

---

### 🚨 RÈGLES IMPORTANTES

| Règle | Statut | Implémentation |
|-------|--------|----------------|
| Toute publicité marquée "Sponsorisé" | ✅ | `AdCard.jsx` badge |
| Pas de contenu interdit | ✅ | Validation admin |
| Système de signalement actif | ✅ | Modération existante |

---

## 💰 2. SÉPARATION DES REVENUS (CRITIQUE)

### 🧾 TYPES DE REVENUS

| Type | Répartition | Statut | Implémentation |
|------|-------------|--------|----------------|
| 1. Revenus Publicitaires | 100% plateforme | ✅ | `platformRevenue.service.ts` (type `ads`) |
| 2. Revenus Créateurs (Gifts / Tips) | 70% créateur, 30% plateforme | ✅ | `video_tips`, `live_gifts`, `gifts_tips` |
| 3. Revenus Marketplace | Commission plateforme | ✅ | Commission 8–12% |

---

### 📊 DASHBOARD GLOBAL ADMIN

| Indicateur | Statut | Implémentation |
|------------|--------|----------------|
| Total revenus publicité | ✅ | `adsRevenue30d` (AnalyticsPanel) |
| Total revenus gifts | ✅ | `giftsTipsRevenue30d` |
| Total revenus marketplace | ✅ | `commissionRevenue30d` |
| Revenus abonnements | ✅ | `subscriptionRevenue30d` |
| Total revenus plateforme 30j | ✅ | `totalPlatformRevenue30d` |
| Statistiques journalières / mensuelles | ✅ | `getRevenueByType()`, `getStrategicAnalytics()` |

**Fichiers** : `admin.service.ts`, `platformRevenue.service.ts`, `AnalyticsPanel.jsx`, `platform.routes.ts` (GET `/api/platform/revenue-by-type`)

---

## 🎥 3. MONÉTISATION CRÉATEURS (SOLUTION MVP)

⚠️ Pas de paiement basé sur les vues (phase actuelle)

### ✅ À METTRE EN PLACE

| Fonctionnalité | Statut | Implémentation |
|----------------|--------|----------------|
| Système de "Support Créateur" (bouton "Soutenir") | ✅ | `creatorSupport.service.ts`, `creatorSupport.routes.ts` |
| Paiement via wallet | ✅ | POST `/api/creator-support/:id` |
| Gifts pendant live | ✅ | Existant |
| Tips sur vidéos | ✅ | `videoTip.service.ts` |

### 💡 OBJECTIF

Permettre aux créateurs de gagner de l'argent sans dépendre du nombre de vues ni d'un fonds de monétisation complexe.

---

## 👑 4. ABONNEMENT PREMIUM (CRÉATEURS)

### 🎯 OBJECTIF

Créer une source de revenu récurrente + valoriser les créateurs sérieux.

### 💎 OFFRES

| Offre | Avantages | Statut |
|-------|-----------|--------|
| **Premium Basic** | Badge vérifié, Priorité feed, Analytics basique | ✅ |
| **Premium Pro** | Badge premium, Analytics avancées, Accès pub boost, Support prioritaire | ✅ |

### 💰 TARIFS

| Offre | Prix | Statut | Implémentation |
|-------|------|--------|----------------|
| Basic | 1 000 FCFA / mois | ✅ | `CREATOR_TIERS.basic` |
| Pro | 3 000 FCFA / mois | ✅ | `CREATOR_TIERS.pro` |

**Fichiers** : `creatorSubscription.service.ts`, `creatorSubscription.routes.ts`

---

## 🏅 5. SYSTÈME DE BADGES

### TYPES DE BADGES

| Badge | Statut |
|-------|--------|
| Nouveau créateur | ✅ Schéma |
| Créateur actif | ✅ Schéma |
| Créateur premium | ✅ `CreatorSubscription.tier` |
| Top créateur | ✅ Schéma |
| Vérifié | ✅ `User.is_verified` |

### UTILITÉ

- Créer de la crédibilité
- Encourager l'engagement
- Motiver la création de contenu

---

## ⚙️ 6. MISE À JOUR SANS RÉINSTALLATION

| Règle | Statut | Implémentation |
|-------|--------|----------------|
| Publicités 100% dynamiques (backend) | ✅ | `getActiveAdsForFeed()` à chaque requête |
| Aucune mise à jour manuelle utilisateur | ✅ | - |
| Campagnes modifiables en temps réel | ✅ | Statut + créatifs en DB |

---

## 🧪 7. TESTS AVANT LANCEMENT

| Test | Statut | Fichier / Commande |
|------|--------|---------------------|
| Insertion publicité dans feed | ✅ | `ads.test.ts` : GET /api/feed |
| Vérifier fréquence (1/5) | ✅ | `feed.service.ts` (4–5) |
| Expiration automatique | ✅ | `ads.service.test.ts` : `expireCampaigns` |
| Dashboard annonceur | ✅ | `AdvertiserDashboard` + smoke |
| Paiement | ✅ | `ads.test.ts` (création campagne) |

---

## 🚀 PRIORITÉ

Ce module est **critique**. Il doit être :
- **Stable** ✅
- **Rapide** ✅
- **Précis** ✅
- **Directement monétisable** ✅

---

## ✅ IMPLÉMENTATION DÉTAILLÉE (13 fév 2026)

### Backend

| Composant | Fichier | Description |
|-----------|---------|-------------|
| Modèles Prisma | `schema.prisma` | AdCampaign, AdCreative, AdImpression, AdClick, CreatorSubscription, CreatorSupport, PlatformRevenue |
| Migration | `20260213140000_ads_system_phase1` | Système publicitaire complet |
| Service Ads | `ads.service.ts` | Création campagne, créatifs, submit, approve/reject, impressions, clics, stats, `expireCampaigns()` |
| Service Feed | `feed.service.ts` | Feed combiné vidéos + pubs (1 pub / 4–5 contenus) |
| Service CreatorSupport | `creatorSupport.service.ts` | Support créateur via wallet |
| Service CreatorSubscription | `creatorSubscription.service.ts` | Premium Basic 1000, Pro 3000 FCFA/mois |
| Service PlatformRevenue | `platformRevenue.service.ts` | `getRevenueByType('ads' \| 'gifts_tips' \| 'marketplace' \| ...)` |
| Service Admin | `admin.service.ts` | `adsRevenue30d`, `giftsTipsRevenue30d`, `getStrategicAnalytics()` |
| Routes Ads | `ads.routes.ts` | `/api/ads/*` (feed, impression, click, campaigns, pricing, creatives, submit, approve, reject) |
| Routes CreatorSupport | `creatorSupport.routes.ts` | POST `/api/creator-support/:id` |
| Routes CreatorSubscription | `creatorSubscription.routes.ts` | Abonnement premium |
| Routes Platform | `platform.routes.ts` | GET `/api/platform/revenue-by-type?type=ads|gifts_tips|marketplace` |
| Job Expiration | `adsExpiration.job.ts` | Expiration auto des campagnes (cron) |

### Frontend

| Composant | Fichier | Description |
|-----------|---------|-------------|
| AdCard | `AdCard.jsx` | Carte pub plein écran, badge "Sponsorisé", CTA |
| AdvertiserDashboard | `AdvertiserDashboard.jsx` | Dashboard annonceur (vues, clics, stats) |
| AnalyticsPanel | `AnalyticsPanel.jsx` | Revenus pub 30j, gifts/tips 30j, marketplace 30j, abonnements 30j |
| Home | `Home.jsx` | Onglet "Pour toi" → `api.feed.list()` |
| API client | `expressClient.js` | `api.ads.*`, `api.feed.list()` |

### Tests

| Suite | Fichier | Couverture |
|-------|---------|------------|
| Ads API (intégration) | `ads.test.ts` | Feed, pricing, campaigns, creatives, submit |
| Ads Service (unit) | `ads.service.test.ts` | Tarification, `expireCampaigns` |
| CreatorSupport (unit) | `creatorSupport.service.test.ts` | Stats, validation |
| CreatorSubscription (unit) | `creatorSubscription.service.test.ts` | Tiers, abonnement actif, expiration |
| PlatformRevenue (unit) | `platformRevenue.service.test.ts` | `getRevenueByType` |

### Implémenté (13 fév 2026 - suite CDC complet)

| Fonctionnalité | Statut | Implémentation |
|----------------|--------|----------------|
| Signaler une pub | ✅ | `POST /api/ads/report` + AdCard menu |
| Masquer une pub | ✅ | `localStorage` afw_hidden_ads + filtre Home |
| Ciblage campagne | ✅ | CreateAdCampaign: pays, ville, âge, sexe |
| Objectifs CTA | ✅ | Acheter, Contacter, WhatsApp, Voir plus |
| Top Banner Ads | ✅ | En haut du feed, AdBannerCard.jsx |
| Boost Post | ✅ | Sponsoriser sa propre vidéo (CreateAdCampaign) |
| Page inscription annonceur | ✅ | AdvertiserRegistration.jsx |
| Option Orange Money | ✅ | Lien RechargeWallet dans CreateAdCampaign |

### À faire (optionnel)

- Mode CPM/CPC (tarification par performance)
- Story Ads (si story activée)
- Intégration paiement direct Orange Money pour campagnes (actuellement : portefeuille + recharge)

---

**Références** : `VERIFICATION_TESTS_MODULE_PUBLICITE.md`, `PLAN_LANCEMENT_26_FEVRIER_Modules.md`
