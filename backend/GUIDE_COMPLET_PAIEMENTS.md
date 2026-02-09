# 💰 Guide Complet : Système de Paiements et Distribution des Fonds

## 🎯 Vue d'ensemble du Flux

### Comment ça fonctionne en réalité :

```
1. Utilisateur fait un tip/don
   ↓
2. Paiement Orange Money (l'argent va à Orange Money d'abord)
   ↓
3. Orange Money notifie la plateforme (webhook)
   ↓
4. Plateforme distribue l'argent :
   - 90% → Wallet du créateur (dans la base de données)
   - 10% → Wallet de la plateforme (dans la base de données)
   ↓
5. Créateur peut retirer son argent (vers son compte Orange Money)
```

## 📱 Orange Money - Comment ça marche

### 1. Clés API Orange Money Mali

Vous avez besoin de **2 types de clés** :

#### A. Clés pour Recevoir les Paiements (Merchant)
```env
ORANGE_MONEY_MERCHANT_ID=7701901162  # Votre numéro marchand
ORANGE_MONEY_API_KEY=votre_cle_marchand  # Clé pour initier les paiements
```

**Ces clés permettent de :**
- ✅ Initier un paiement (demander à l'utilisateur de payer)
- ✅ Vérifier le statut d'un paiement
- ❌ **NE PAS** recevoir l'argent directement sur votre compte

#### B. Clés pour Recevoir l'Argent (Compte Marchand)
L'argent des paiements va dans **VOTRE compte Orange Money marchand** (7701901162).

**Important :** 
- Tous les paiements arrivent d'abord dans **VOTRE compte Orange Money**
- Vous devez ensuite **distribuer manuellement ou automatiquement** aux créateurs

### 2. Flux de Paiement Orange Money

```
┌─────────────┐
│ Utilisateur │
│  (Payer)    │
└──────┬──────┘
       │ 1. Clique "Soutenir" (1000 FCFA)
       ↓
┌──────────────────┐
│   AfriConnect    │
│   (Backend)      │
└──────┬───────────┘
       │ 2. Initie paiement Orange Money
       ↓
┌──────────────────┐
│  Orange Money    │
│  (API)           │
└──────┬───────────┘
       │ 3. Demande confirmation à l'utilisateur
       ↓
┌─────────────┐
│ Utilisateur │
│ (Confirme)  │
└──────┬──────┘
       │ 4. Confirme sur son téléphone
       ↓
┌──────────────────┐
│  Orange Money    │
│  (Compte)        │
└──────┬───────────┘
       │ 5. L'argent est débité de l'utilisateur
       │    et crédité dans VOTRE compte marchand (7701901162)
       ↓
┌──────────────────┐
│  Orange Money    │
│  (Webhook)       │
└──────┬───────────┘
       │ 6. Notifie AfriConnect que le paiement est réussi
       ↓
┌──────────────────┐
│   AfriConnect    │
│   (Backend)      │
└──────┬───────────┘
       │ 7. Distribue l'argent dans les wallets internes :
       │    - 900 FCFA → Wallet créateur (dans la DB)
       │    - 100 FCFA → Wallet plateforme (dans la DB)
       ↓
┌──────────────────┐
│  Base de Données │
│  (Wallets)       │
└──────────────────┘
```

## 💳 Système de Wallets Internes

### Concept Important :

**Les wallets dans la base de données sont des "comptes virtuels"**, pas de vrais comptes Orange Money.

```
┌─────────────────────────────────────┐
│  Base de Données (Wallets)          │
├─────────────────────────────────────┤
│  Créateur A : 5000 FCFA            │
│  Créateur B : 12000 FCFA           │
│  Créateur C : 3000 FCFA            │
│  Plateforme : 2500 FCFA            │
└─────────────────────────────────────┘
```

**L'argent réel est dans VOTRE compte Orange Money (7701901162)**

### Distribution Automatique

Quand un tip est complété :

```typescript
// 1. L'argent est déjà dans votre compte Orange Money (7701901162)
// 2. On met à jour les wallets dans la base de données

// Créateur reçoit 90%
await paymentService.addToWallet(creatorId, 900, "Tip reçu");

// Plateforme reçoit 10%
await platformRevenueService.addRevenue(100, "video_tips", "Commission");
```

## 💸 Comment les Créateurs Reçoivent leur Argent

### Option 1 : Retrait Manuel (Recommandé pour commencer)

1. **Créateur demande un retrait** via l'application
2. **Vous recevez une notification** (email/admin panel)
3. **Vous transférez manuellement** depuis votre compte Orange Money (7701901162) vers le compte du créateur
4. **Vous marquez le retrait comme complété** dans l'application

### Option 2 : Retrait Automatique (Plus tard)

1. **Créateur demande un retrait**
2. **Système utilise l'API Orange Money** pour transférer automatiquement
3. **Nécessite des clés API supplémentaires** pour les transferts

## 🔑 Clés API Orange Money Nécessaires

### Pour Recevoir les Paiements (Déjà configuré)

```env
# Clés pour initier les paiements
ORANGE_MONEY_MERCHANT_ID=7701901162
ORANGE_MONEY_API_KEY=votre_cle_marchand
ORANGE_MONEY_API_URL=https://api.orange.ml
```

### Pour les Transferts Automatiques (Optionnel - Plus tard)

```env
# Clés pour transférer de l'argent aux créateurs
ORANGE_MONEY_TRANSFER_API_KEY=cle_pour_transferts
ORANGE_MONEY_TRANSFER_MERCHANT_ID=7701901162
```

## 📊 Exemple Concret

### Scénario : Utilisateur fait un tip de 1000 FCFA

1. **Utilisateur clique "Soutenir"** → Entre 1000 FCFA
2. **Backend initie paiement Orange Money** → Utilisateur confirme sur son téléphone
3. **Orange Money débite 1000 FCFA** de l'utilisateur
4. **Orange Money crédite 1000 FCFA** dans VOTRE compte (7701901162)
5. **Webhook Orange Money** → Notifie votre backend
6. **Backend distribue** :
   - Wallet créateur : +900 FCFA (dans la DB)
   - Wallet plateforme : +100 FCFA (dans la DB)
7. **Créateur voit** : "Vous avez 900 FCFA disponibles"
8. **Créateur demande retrait** → Vous transférez 900 FCFA depuis votre compte vers le créateur

## 🎁 Comment les Utilisateurs Font des Dons

### Option 1 : Paiement Direct (Recommandé)

```
Utilisateur → Clique "Soutenir" 
           → Entre montant (ex: 1000 FCFA)
           → Entre numéro Orange Money
           → Confirme sur téléphone
           → Paiement direct via Orange Money
```

### Option 2 : Cadeaux (Gifts) - Déjà implémenté

```
Utilisateur → Clique "Envoyer un cadeau"
           → Choisit un cadeau (ex: Coeur = 100 FCFA)
           → Entre numéro Orange Money
           → Confirme sur téléphone
           → Paiement direct via Orange Money
```

**Les deux options utilisent Orange Money directement**, pas de wallet intermédiaire.

## 🔄 Système de Retrait pour les Créateurs

### Table `Withdrawal` (À créer)

```prisma
model Withdrawal {
  id              String   @id @default(uuid())
  user_id         String
  amount          Float
  status          String   // pending, processing, completed, failed
  orange_money_phone String
  transaction_reference String?
  created_at      DateTime @default(now())
  completed_at    DateTime?
  user            User     @relation(fields: [user_id], references: [id])
}
```

### Flux de Retrait

```
1. Créateur demande retrait (1000 FCFA)
   ↓
2. Vérification solde suffisant dans wallet
   ↓
3. Création demande de retrait (status: pending)
   ↓
4. Notification admin
   ↓
5. Admin/System transfère depuis compte Orange Money (7701901162)
   ↓
6. Mise à jour status: completed
   ↓
7. Débit du wallet créateur
```

## 📝 Configuration Complète

### Backend `.env`

```env
# Orange Money - Recevoir les paiements
ORANGE_MONEY_MERCHANT_ID=7701901162
ORANGE_MONEY_API_KEY=votre_cle_marchand
ORANGE_MONEY_API_URL=https://api.orange.ml

# Wallet de la plateforme
PLATFORM_USER_ID=00000000-0000-0000-0000-000000000000

# Webhook URL (pour recevoir les notifications Orange Money)
APP_URL=https://votre-domaine.com
```

### Frontend `.env.local`

```env
VITE_ORANGE_MERCHANT_ID=7701901162
VITE_ORANGE_API_KEY=votre_cle_marchand
```

## ⚠️ Points Importants

### 1. L'argent va d'abord dans VOTRE compte
- Tous les paiements arrivent dans votre compte Orange Money (7701901162)
- Vous devez ensuite distribuer aux créateurs

### 2. Les wallets sont virtuels
- Les wallets dans la DB sont des "comptes internes"
- L'argent réel est dans votre compte Orange Money
- Vous devez gérer les retraits manuellement ou automatiquement

### 3. Commission automatique
- La plateforme prend automatiquement sa commission (10% tips, 30% gifts)
- Stockée dans le wallet plateforme (virtuel)
- Vous pouvez retirer quand vous voulez

### 4. Sécurité
- Ne jamais exposer les clés API dans le frontend
- Utiliser les webhooks pour confirmer les paiements
- Vérifier toujours le statut avant de créditer les wallets

## 🚀 Prochaines Étapes

1. ✅ **Obtenir les clés API Orange Money** pour initier les paiements
2. ⏳ **Configurer le webhook** Orange Money pour recevoir les notifications
3. ⏳ **Créer le système de retrait** pour les créateurs
4. ⏳ **Dashboard admin** pour voir tous les paiements et retraits
5. ⏳ **Système de transfert automatique** (optionnel, plus tard)

## 💡 Résumé Simple

**Question :** L'argent va directement à la plateforme ?
**Réponse :** Oui, d'abord dans votre compte Orange Money (7701901162), puis vous distribuez aux créateurs.

**Question :** Comment les créateurs reçoivent leur argent ?
**Réponse :** Via retrait - vous transférez depuis votre compte Orange Money vers leur compte.

**Question :** Comment les utilisateurs paient ?
**Réponse :** Directement via Orange Money - ils confirment sur leur téléphone.

**Question :** C'est automatique ?
**Réponse :** Les paiements oui, les retraits peuvent être manuels ou automatiques.

