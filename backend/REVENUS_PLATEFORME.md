# 💰 Système de Revenus de la Plateforme

## 📋 Vue d'ensemble

La plateforme **AfriConnect** gagne des revenus sur **TOUS** les tips, peu importe qui les fait :
- ✅ Tips d'utilisateurs normaux → 10% commission
- ✅ Tips de créateurs → 10% commission (même si c'est un créateur qui donne à un autre créateur)
- ✅ Gifts en live → 30% commission
- ✅ Marketplace → Commission configurable
- ✅ Abonnements → Commission configurable

## 🎯 Principe

**La plateforme prend TOUJOURS sa commission**, que le tip soit fait par :
- Un utilisateur normal
- Un créateur
- Un autre créateur

### Exemple concret :

1. **Utilisateur A** fait un tip de **1000 FCFA** à **Créateur B**
   - Plateforme gagne : **100 FCFA** (10%)
   - Créateur B reçoit : **900 FCFA** (90%)

2. **Créateur B** (qui a reçu 900 FCFA) fait ensuite un tip de **500 FCFA** à **Créateur C**
   - Plateforme gagne : **50 FCFA** (10%)
   - Créateur C reçoit : **450 FCFA** (90%)

**Total plateforme** : 100 + 50 = **150 FCFA** sur 1500 FCFA de tips

## 🗄️ Architecture

### Wallet de la Plateforme

Un wallet spécial est créé pour la plateforme avec l'ID :
```
PLATFORM_USER_ID = 00000000-0000-0000-0000-000000000000
```

Toutes les commissions sont créditées dans ce wallet.

### Service PlatformRevenueService

Service dédié pour gérer les revenus de la plateforme :
- `getPlatformWallet()` - Obtenir le wallet de la plateforme
- `addRevenue()` - Ajouter des revenus (commissions)
- `getRevenueStats()` - Statistiques globales
- `getRevenueByType()` - Revenus par type (tips, gifts, etc.)

## 📊 API Endpoints

### GET `/api/platform/revenue`
Statistiques de revenus de la plateforme

**Query params:**
- `startDate` (optionnel)
- `endDate` (optionnel)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 50000,
    "totalTransactions": 150,
    "currentBalance": 50000,
    "recentTransactions": [...],
    "revenueBySource": [
      {
        "source": "video_tips",
        "amount": 30000,
        "count": 100
      },
      {
        "source": "live_gifts",
        "amount": 20000,
        "count": 50
      }
    ]
  }
}
```

### GET `/api/platform/revenue/:type`
Revenus par type spécifique

**Types disponibles:**
- `video_tips` - Tips de vidéos
- `live_gifts` - Gifts en live
- `marketplace` - Ventes marketplace
- `subscriptions` - Abonnements

### GET `/api/platform/wallet`
Wallet de la plateforme

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "wallet-uuid",
    "user_id": "00000000-0000-0000-0000-000000000000",
    "balance": 50000,
    "currency": "XOF"
  }
}
```

## 💳 Flux de Commission

### Tips de Vidéos

```typescript
// Quand un tip est complété
const tip = {
  amount: 1000,           // Montant total
  africonnect_fee: 100,   // 10% pour la plateforme
  creator_earnings: 900   // 90% pour le créateur
};

// 1. Créditer le créateur
await paymentService.addToWallet(receiverId, 900, ...);

// 2. Créditer la plateforme
await platformRevenueService.addRevenue(
  100,
  'video_tips',
  'Commission sur tip vidéo',
  tip.id
);
```

### Gifts en Live

```typescript
// Dans live.service.ts
const totalAmount = 1000;
const creatorEarnings = totalAmount * 0.7;  // 70% créateur
const platformCommission = totalAmount * 0.3; // 30% plateforme

// Créditer créateur
await paymentService.addToWallet(creatorId, creatorEarnings, ...);

// Créditer plateforme
await platformRevenueService.addRevenue(
  platformCommission,
  'live_gifts',
  'Commission sur gift live',
  gift.id
);
```

## 📈 Sources de Revenus

### 1. Tips de Vidéos (10%)
- Commission : 10% sur chaque tip
- Exemple : 1000 FCFA tip → 100 FCFA pour la plateforme

### 2. Gifts en Live (30%)
- Commission : 30% sur chaque gift
- Exemple : 1000 FCFA gift → 300 FCFA pour la plateforme

### 3. Marketplace (Configurable)
- Commission : Variable selon le produit
- À implémenter dans `order.service.ts`

### 4. Abonnements (Configurable)
- Commission : Variable selon le type d'abonnement
- À implémenter dans `subscription.service.ts`

## 🔐 Sécurité

- ✅ Seuls les admins peuvent accéder aux statistiques de revenus
- ✅ Toutes les transactions sont enregistrées
- ✅ Wallet de la plateforme séparé des wallets utilisateurs
- ✅ Audit trail complet de toutes les commissions

## 📝 Configuration

### Variables d'environnement

```env
# ID de l'utilisateur système pour la plateforme
PLATFORM_USER_ID=00000000-0000-0000-0000-000000000000
```

## 🚀 Prochaines Étapes

1. ✅ Implémenter le système de commission sur tips
2. ✅ Créer le wallet de la plateforme
3. ✅ Créer le service PlatformRevenueService
4. ⏳ Ajouter middleware `isAdmin` pour protéger les routes
5. ⏳ Implémenter commissions marketplace
6. ⏳ Implémenter commissions abonnements
7. ⏳ Dashboard admin pour visualiser les revenus

## 💡 Notes Importantes

- **La plateforme gagne sur TOUS les tips**, même ceux faits par les créateurs
- Le système est conçu pour être **transparent** et **traçable**
- Toutes les commissions sont **automatiquement créditées** au wallet de la plateforme
- Les statistiques permettent de **suivre les revenus** par source et par période

