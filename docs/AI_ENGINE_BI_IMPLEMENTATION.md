# AI Engine & Business Intelligence - Documentation

## Vue d'ensemble

Implémentation complète du **Moteur d'intelligence central (AI Engine)** et du **Business Intelligence Analytics & Data Insights** dans l'Admin Dashboard d'AfriWonder.

## Backend

### Modèles Prisma

#### AI Engine
- **AIModel** : Modèles ML/AI (nom, type, version, précision, latence, statut)
- **AIPrediction** : Prédictions générées (entity_type, entity_id, prediction_type, confidence)
- **AIRecommendation** : Recommandations (product, content, ad optimization)
- **AICreditScore** : Scores de crédit utilisateurs (0-1000, risk_level)
- **AIFraudDetection** : Détections de fraude (fraud_probability, risk_level, flagged_reasons)
- **AIModeration** : Modération automatique (content_type, moderation_decision, flagged_categories)
- **AIDynamicPricing** : Pricing dynamique (suggested_price, demand_factor, competition_factor)

#### Business Intelligence
- **BIMetric** : Métriques agrégées par période (active_users, transactions, revenue, etc.)
- **BIRevenueByService** : Revenus par service/catégorie (marketplace, live, transport, etc.)
- **BIGeographyAnalytics** : Analytics géographiques (par pays/région)
- **BIRetentionAnalytics** : Analytics de rétention utilisateurs (cohort analysis)
- **BIInsight** : Insights automatiques générés (growth, retention, revenue, anomaly, trend)

### Services

#### `aiEngine.service.ts`
- `getEngineStats()` : Statistiques globales (prédictions, précision moyenne, latence moyenne, modèles)
- `getModels()` : Liste des modèles AI avec stats
- `getAIFeatures()` : Fonctionnalités IA (Product Recommendation, Ad Optimization, Microcredit Scoring, Fraud Detection, Live Moderation, Dynamic Pricing)
- `getRecentRecommendations()` : Recommandations récentes
- `getRecentFraudDetections()` : Détections de fraude récentes
- `getRecentCreditScores()` : Scores de crédit récents
- `upsertModel()` : Créer/mettre à jour un modèle AI
- `createPrediction()` : Créer une prédiction
- `createRecommendation()` : Créer une recommandation

#### `businessIntelligence.service.ts`
- `getKPIs()` : KPIs principaux (Utilisateurs Actifs, Transactions Jour, Volume Transactions, Revenus Commission) avec calcul de croissance %
- `getUserGrowth()` : Croissance utilisateurs sur plusieurs mois (graphique)
- `getRevenueByService()` : Revenus par service (Marketplace, Live, Transport, Services, Mini-Apps)
- `getInsights()` : Insights automatiques (non-acknowledged)
- `generateInsight()` : Générer un insight automatique
- `getGeographyAnalytics()` : Analytics géographiques (par pays)
- `getRetentionAnalytics()` : Analytics de rétention (cohort analysis)

### Routes API

#### `/api/admin/ai-engine/*`
- `GET /stats` : Statistiques globales AI Engine
- `GET /models` : Liste modèles AI
- `GET /features` : Fonctionnalités IA avec stats
- `GET /recommendations` : Recommandations récentes
- `GET /fraud-detections` : Détections de fraude récentes
- `GET /credit-scores` : Scores de crédit récents
- `POST /models` : Créer/mettre à jour modèle AI

#### `/api/admin/business-intelligence/*`
- `GET /kpis?period=month` : KPIs principaux (day|week|month|year)
- `GET /user-growth?months=12` : Croissance utilisateurs
- `GET /revenue-by-service?period=month` : Revenus par service
- `GET /insights?limit=10` : Insights automatiques
- `GET /geography?period=month` : Analytics géographiques
- `GET /retention?months=6` : Analytics de rétention
- `POST /insights` : Générer insight

## Frontend

### Composants Admin

#### `AIEnginePanel.jsx`
**Fonctionnalités :**
- **Header** : Titre "AfriWonder AI - Moteur d'intelligence central" avec badge "Système Actif"
- **KPIs** : 4 cartes (Prédictions, Précision, Latence, Modèles)
- **Banner AI Powered** : Description des capacités IA
- **Tabs** : Aperçu, Recommandations, Scoring, Fraude, Modération
- **Fonctionnalités IA** : 6 cartes avec statut (active/beta) et précision :
  - Product Recommendation (94%)
  - Ad Optimization (89%)
  - Microcredit Scoring (91%)
  - Fraud Detection (97%)
  - Live Moderation (85%)
  - Dynamic Pricing (82% - beta)
- **Actions** : Boutons "Voir mes recommandations" et "Mon score de crédit"

**Design :**
- Thème dark avec gradients purple/pink
- Badges verts pour "active", jaunes pour "beta"
- Progress bars pour précision
- Icons Lucide React

#### `BusinessIntelligencePanel.jsx`
**Fonctionnalités :**
- **Header** : Titre "Business Intelligence - Analytics & Data Insights"
- **Filtres temporels** : Jour, Semaine, Mois, Année (boutons sélectables)
- **KPIs** : 4 cartes avec croissance % :
  - Utilisateurs Actifs (ex: 459K, +11.3%)
  - Transactions Jour (ex: 9K, +14.2%)
  - Volume Transactions (ex: 156.8M, +10.1%)
  - Revenus Commission (ex: 4.6M, +17.4%)
- **Tabs** : Aperçu, Utilisateurs, Transactions, Géographie, Rétention
- **Croissance Utilisateurs** : Graphique LineChart (Recharts) avec mois (Jan, Fev, Mar...)
- **Revenus par Service** : Barres horizontales avec montants CFA (Marketplace, Live, Transport, Services)
- **Insights** : Liste d'insights automatiques avec icône ⚡

**Design :**
- Thème dark avec gradients blue/purple
- Badges verts avec flèche ↑ pour croissance
- Graphiques Recharts avec style dark
- Formatage nombres (K, M) et devises (CFA)

### Intégration Admin Dashboard

**Fichiers modifiés :**
- `src/components/admin/AdminLayout.jsx` : Ajout tabs "AI Engine" et "Business Intelligence"
- `src/pages/AdminDashboard.jsx` : Import et routing des nouveaux panels
- `src/api/expressClient.js` : Ajout méthodes API `api.admin.getAIEngineStats()`, `api.admin.getBIKPIs()`, etc.

**Permissions :**
- `super_admin` : Accès complet
- `admin` : Accès complet
- `finance_admin` : Accès Business Intelligence uniquement
- `moderation_admin` : Accès AI Engine uniquement
- `data_admin` : Accès aux deux

## Migration Prisma

Pour créer les tables en base de données :

```bash
cd backend
npx prisma migrate dev --name add_ai_engine_bi
npx prisma generate
```

## Utilisation

### Accès Admin Dashboard
1. Se connecter en tant qu'admin
2. Aller sur `/AdminDashboard`
3. Cliquer sur l'onglet **"AI Engine"** ou **"Business Intelligence"**

### AI Engine
- Visualiser les stats globales (prédictions, précision, latence, modèles)
- Voir les fonctionnalités IA actives avec leur précision
- Naviguer entre les tabs (Recommandations, Scoring, Fraude, Modération)

### Business Intelligence
- Sélectionner période (Jour/Semaine/Mois/Année)
- Visualiser KPIs avec croissance %
- Voir graphique croissance utilisateurs
- Analyser revenus par service
- Consulter insights automatiques

## Prochaines étapes

1. **Intégration ML réelle** : Connecter modèles ML Python (TensorFlow/PyTorch) via API
2. **Temps réel** : WebSockets pour updates temps réel des KPIs
3. **Export** : Export CSV/PDF des analytics
4. **Alertes** : Notifications automatiques pour insights critiques
5. **Prédictions avancées** : Forecasting revenus, croissance utilisateurs
6. **A/B Testing** : Intégration tests A/B pour optimiser recommandations
7. **Dashboard personnalisé** : Widgets configurables par admin

## Notes techniques

- **Fallback mock data** : Les composants utilisent des données mock si l'API échoue
- **Formatage** : Nombres formatés (K, M), devises en CFA
- **Graphiques** : Utilisation de Recharts pour visualisations
- **Responsive** : Design responsive mobile-first
- **Performance** : Requêtes parallèles avec `Promise.all()`
- **Caching** : Les données peuvent être cachées côté client (React Query recommandé)

## Architecture

```
Backend:
├── prisma/schema.prisma (modèles AI & BI)
├── services/
│   ├── aiEngine.service.ts
│   └── businessIntelligence.service.ts
└── routes/
    ├── aiEngine.routes.ts
    └── businessIntelligence.routes.ts

Frontend:
├── components/admin/
│   ├── AIEnginePanel.jsx
│   └── BusinessIntelligencePanel.jsx
├── pages/
│   └── AdminDashboard.jsx (routing)
└── api/
    └── expressClient.js (méthodes API)
```

## Sécurité

- Routes protégées par `authenticate` + `requireAdmin`
- Vérification rôle utilisateur côté frontend
- Validation données côté backend
- Rate limiting sur routes sensibles
