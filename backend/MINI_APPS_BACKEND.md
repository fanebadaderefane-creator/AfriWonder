# Backend Mini-Apps - Documentation

## Vue d'ensemble

Le backend pour le système de monétisation des Mini-Apps est maintenant implémenté avec :
- **Modèles Prisma** pour la persistance des données
- **Service de revenus** avec calcul automatique des commissions
- **Routes API** pour les développeurs et utilisateurs
- **Gestion des abonnements** développeur (Starter/Pro/Enterprise)
- **Système de boosts** pour la visibilité

## Modèles Prisma

### DeveloperSubscription
Abonnement développeur avec 3 plans :
- **Starter** : 10% commission, 1 mini-app max
- **Pro** : 8% commission, apps illimitées, mensuel
- **Enterprise** : 5% commission, apps illimitées, permanent

### MiniApp
Mini-app publiée avec :
- Métadonnées (nom, description, catégorie, icône, screenshots)
- Statut (pending | published | rejected | suspended | draft)
- Statistiques (installs, rating, GMV, revenus)
- Taux de commission (selon catégorie et plan)

### MiniAppTransaction
Transaction dans une mini-app avec :
- Split automatique : commission plateforme + revenu développeur
- Statut (pending | completed | failed | refunded)
- Référence paiement Orange Money

### MiniAppBoost
Boost de visibilité (featured, trending, push, search)

### DeveloperRevenue
Wallet développeur avec :
- Solde disponible
- Solde en attente (période retrait)
- Total historique gagné/retiré

### DeveloperWithdrawal
Demande de retrait avec frais (500 XOF)

## Service Mini-App (`miniApp.service.ts`)

### Fonctionnalités principales

#### 1. Abonnement développeur
```typescript
await miniAppService.subscribeDeveloper(developerId, 'pro', 'orange_money');
```
- Crée ou met à jour l'abonnement
- Calcule le taux de commission selon le plan
- Crée automatiquement le wallet revenus

#### 2. Création mini-app
```typescript
await miniAppService.createMiniApp(developerId, {
  name: 'Mon App',
  description: 'Description',
  category: 'commerce',
  permissions: ['location', 'wallet'],
});
```
- Vérifie les limites du plan (Starter = 1 app max)
- Calcule le taux commission (catégorie vs plan, prend le plus bas)
- Statut initial : `pending` (nécessite validation admin)

#### 3. REVENUE ENGINE - Traitement transaction
```typescript
await miniAppService.processTransaction(
  miniAppId,
  userId,
  10000, // montant XOF
  'orange_money'
);
```
**Fonctionnement automatique :**
1. Récupère la mini-app et son abonnement
2. Calcule commission selon `commission_rate` de l'app
3. Crée transaction en `pending`
4. Met à jour stats app (GMV, revenus, commission)
5. Crédite wallet développeur automatiquement
6. Marque transaction `completed`

**En production :** Le paiement Orange Money se fait via webhook, puis `confirmTransaction()` est appelé.

#### 4. Boost
```typescript
await miniAppService.purchaseBoost(
  miniAppId,
  'featured',
  50000, // prix XOF
  30 // jours
);
```

#### 5. Installation
```typescript
await miniAppService.installMiniApp(miniAppId, userId);
```

#### 6. Retrait revenus
```typescript
await miniAppService.withdrawRevenue(
  developerId,
  10000,
  'orange_money',
  '+22370123456'
);
```
- Vérifie solde suffisant
- Montant minimum : 5000 XOF
- Frais : 500 XOF
- Crée demande en `pending` (traitement manuel admin)

## Routes API

### `/api/mini-apps/*`

#### GET `/api/mini-apps`
Liste publique des mini-apps publiées
- Query params : `category`, `status`, `featured`, `search`, `page`, `limit`
- Retourne pagination + apps avec développeur, stats

#### GET `/api/mini-apps/:id`
Détails d'une mini-app (public)

#### POST `/api/mini-apps`
Créer une mini-app (authentifié, développeur)
- Body : `name`, `description`, `category`, `permissions`, `icon_url`, `screenshots`, `bundle_url`, `bundle_hash`

#### POST `/api/mini-apps/:id/install`
Installer une mini-app (authentifié)

#### POST `/api/mini-apps/:id/transaction`
Créer transaction dans une mini-app (authentifié)
- Body : `amount`, `payment_method`, `description`
- Traite automatiquement le split commission/revenu

#### POST `/api/mini-apps/:id/boost`
Acheter boost (authentifié, développeur propriétaire)
- Body : `boost_type`, `price`, `duration_days`, `payment_reference`

### `/api/developer/*`

#### GET `/api/developer/subscription`
Obtenir abonnement actuel (authentifié)
- Crée Starter par défaut si n'existe pas

#### POST `/api/developer/subscription`
Souscrire/changer plan (authentifié)
- Body : `plan_type` (starter|pro|enterprise), `payment_method`

#### GET `/api/developer/revenue`
Obtenir revenus développeur (authentifié)
- Query : `time_range` (day|week|month|year)
- Retourne balance, transactions, stats

#### POST `/api/developer/revenue/withdraw`
Demander retrait (authentifié)
- Body : `amount`, `payment_method`, `phone_number` (si mobile money), `bank_account` (si virement)

#### GET `/api/developer/apps`
Lister mini-apps du développeur (authentifié)

#### GET `/api/developer/analytics`
Analytics développeur (authentifié)
- Query : `time_range`
- Retourne GMV, commission, earnings, transactions, installs

## Taux de commission

### Par catégorie
- `commerce` : 10%
- `marketplace` : 12%
- `services` : 10%
- `transport` : 15%
- `education` : 5%
- `sante` : 8%
- `finance` : 5%
- `social` : 5%
- `agriculture` : 8%
- `travel` : 12%
- `default` : 10%

### Par plan développeur
- `starter` : 10%
- `pro` : 8%
- `enterprise` : 5%

**Règle :** Le taux final appliqué est le **minimum** entre catégorie et plan (plan prioritaire).

## Migration Prisma

Pour créer les tables en base de données :

```bash
cd backend
npx prisma migrate dev --name add_mini_apps_system
npx prisma generate
```

## Prochaines étapes

1. **Webhook Orange Money** : Intégrer confirmation transaction via webhook
2. **Validation admin** : Route admin pour approuver/rejeter mini-apps
3. **Expiration boosts** : Job cron pour désactiver boosts expirés
4. **Expiration abonnements Pro** : Job cron pour gérer renouvellement/expiration
5. **Notifications** : Notifier développeur lors de transaction, retrait, etc.
6. **Analytics avancés** : Graphiques revenus, tendances, prévisions

## Sécurité

- Routes authentifiées avec `authenticate` middleware
- Vérification propriétaire pour boost/apps
- Validation montants (minimum retrait 5000 XOF)
- Hash bundle pour vérification intégrité mini-app
- Permissions déclaratives par mini-app

## Notes importantes

- Les transactions sont traitées **immédiatement** dans le code actuel (simulation)
- En production, utiliser webhook Orange Money pour confirmer paiement avant crédit wallet
- Les mini-apps nécessitent validation admin avant publication (`status: pending` → `published`)
- Le wallet développeur est créé automatiquement lors de la première transaction ou abonnement
