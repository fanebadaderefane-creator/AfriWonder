# 💰 Système de Tips/Dons pour les Vidéos - Orange Money Mali

## 📋 Vue d'ensemble

Ce document décrit le système de tips/dons pour les vidéos avec intégration Orange Money Mali uniquement.

## 🎯 Fonctionnalités

### 1. **Tips de Vidéos**
- Les utilisateurs peuvent faire des dons (tips) aux créateurs de vidéos
- Montant minimum : 50 FCFA
- Commission plateforme : 10%
- Gains créateur : 90%

### 2. **Paiement Orange Money Mali**
- **Uniquement Orange Money Mali** pour l'instant
- Les autres moyens de paiement (Stripe, Wave, MTN) sont conservés pour le futur mais non activés
- Numéro de téléphone requis pour le paiement

### 3. **Gestion des Transactions**
- Toutes les transactions sont enregistrées dans la table `Transaction`
- Les tips sont enregistrés dans la table `VideoTip`
- Statuts : `pending`, `completed`, `failed`

## 🗄️ Structure de la Base de Données

### Table `VideoTip`
```prisma
model VideoTip {
  id              String   @id @default(uuid())
  video_id        String
  sender_id       String   // Utilisateur qui fait le don
  receiver_id     String   // Créateur de la vidéo
  amount          Float    // Montant total
  currency        String   @default("XOF")
  payment_method  String   @default("orange_money")
  transaction_id  String?  // Référence à la transaction
  message         String?  // Message optionnel
  status          String   @default("pending")
  africonnect_fee Float    @default(0) // 10% commission
  creator_earnings Float   @default(0) // 90% pour le créateur
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
}
```

### Table `Transaction` (mise à jour)
- Ajout de `payment_method` : `orange_money`, `stripe`, `wallet`, etc.
- Ajout de `phone_number` : Pour Orange Money

## 🔌 API Endpoints

### POST `/api/videos/:id/tip`
Créer un tip pour une vidéo

**Body:**
```json
{
  "amount": 1000,
  "phone": "7701101162",
  "message": "Super vidéo !"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "tip-uuid",
    "video_id": "video-uuid",
    "amount": 1000,
    "paymentUrl": "https://orange-money.ml/payment/...",
    "transactionId": "transaction-uuid"
  }
}
```

### GET `/api/videos/:id/tips`
Obtenir la liste des tips d'une vidéo

**Query params:**
- `page` (default: 1)
- `limit` (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "tips": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### POST `/api/payments/orange-money/verify`
Vérifier et compléter un paiement Orange Money

**Body:**
```json
{
  "orderId": "tip-uuid",
  "status": "SUCCESS",
  "pay_token": "token-from-orange"
}
```

## 💳 Configuration Orange Money Mali

### Variables d'environnement requises

**Backend (.env):**
```env
ORANGE_MONEY_MERCHANT_ID=7701901162
ORANGE_MONEY_API_KEY=votre_cle_marchand
ORANGE_MONEY_API_URL=https://api.orange.ml
APP_URL=http://localhost:3000
```

**Frontend (.env.local):**
```env
VITE_ORANGE_MERCHANT_ID=7701901162
VITE_ORANGE_API_KEY=votre_cle_marchand
```

### Compte de Test
- **MSISDN Abonné** : `7701101162`
- **PIN** : `7936`
- **Balance** : `1 000 000` XOF

## 🔄 Flux de Paiement

1. **Utilisateur clique sur "Soutenir"** sur une vidéo
2. **Saisit le montant** (minimum 50 FCFA) et **numéro de téléphone**
3. **Backend crée** :
   - Un `VideoTip` avec statut `pending`
   - Une `Transaction` avec statut `pending`
4. **Backend initie** le paiement Orange Money Mali
5. **Utilisateur confirme** le paiement sur son téléphone
6. **Orange Money envoie** un webhook/callback
7. **Backend vérifie** le statut et **complète le tip** :
   - Met à jour `VideoTip` → `completed`
   - Met à jour `Transaction` → `completed`
   - **Crédite le wallet du créateur** avec 90% du montant
   - **Crée une notification** pour le créateur

## 💰 Calcul des Montants

```typescript
const amount = 1000; // Montant du tip
const platformFee = amount * 0.1; // 10% = 100 FCFA
const creatorEarnings = amount - platformFee; // 90% = 900 FCFA
```

## 📊 Statistiques

### GET `/api/users/:id/tip-stats` (à implémenter)
Retourne les statistiques de tips d'un créateur :
- Total de tips reçus
- Montant total reçu
- Gains totaux (après commission)
- Derniers tips reçus

## 🔐 Sécurité

- ✅ Validation du montant minimum (50 FCFA)
- ✅ Vérification que l'utilisateur ne se donne pas un tip à lui-même
- ✅ Vérification de l'existence de la vidéo
- ✅ Authentification requise pour créer un tip
- ✅ Vérification du statut de paiement avant crédit du wallet

## 🚀 Prochaines Étapes

1. **Migration Prisma** : Exécuter la migration pour créer la table `VideoTip`
2. **Configuration Orange Money** : Obtenir les vraies clés API
3. **Tests** : Tester avec le compte de test
4. **Frontend** : Mettre à jour le composant `TipModal` pour utiliser uniquement Orange Money
5. **Webhooks** : Implémenter le webhook Orange Money pour les callbacks automatiques

## 📝 Notes

- Les autres moyens de paiement (Stripe, Wave, MTN) sont **conservés** dans le code mais **non activés**
- Ils pourront être activés plus tard quand vous aurez une équipe solide
- Pour l'instant, **Orange Money Mali uniquement**

## 🔗 Fichiers Modifiés/Créés

- ✅ `backend/prisma/schema.prisma` - Ajout table `VideoTip` et mise à jour `Transaction`
- ✅ `backend/src/services/videoTip.service.ts` - Service de gestion des tips
- ✅ `backend/src/routes/videos.routes.ts` - Routes pour les tips
- ✅ `backend/src/routes/payments.routes.ts` - Intégration avec Orange Money
- ✅ `backend/src/services/payment.service.ts` - Mise à jour pour Orange Money Mali

## ⚠️ Important

**Avant de déployer en production :**
1. Obtenir les vraies clés API Orange Money Mali
2. Configurer les webhooks Orange Money
3. Tester complètement le flux de paiement
4. Vérifier la sécurité des transactions

