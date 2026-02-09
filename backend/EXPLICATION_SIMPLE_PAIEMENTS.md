# 💰 Explication Simple : Comment Fonctionnent les Paiements

## 🎯 Questions Répondues

### ❓ L'argent va directement à la plateforme ?

**Réponse : OUI, mais temporairement !**

```
1. Utilisateur paie 1000 FCFA via Orange Money
   ↓
2. L'argent arrive dans VOTRE compte Orange Money (7701901162)
   ↓
3. Votre système distribue automatiquement :
   - 900 FCFA → Wallet créateur (virtuel dans la DB)
   - 100 FCFA → Wallet plateforme (virtuel dans la DB)
```

**L'argent réel est dans votre compte Orange Money, les wallets sont des "comptes virtuels" pour suivre qui doit recevoir quoi.**

---

### ❓ Comment les créateurs reçoivent leur argent ?

**Réponse : Via retrait manuel ou automatique**

#### Option 1 : Retrait Manuel (Pour commencer)

```
1. Créateur demande retrait (ex: 5000 FCFA)
   ↓
2. Vous recevez notification (email/admin panel)
   ↓
3. Vous transférez depuis votre compte Orange Money (7701901162)
   vers le compte Orange Money du créateur
   ↓
4. Vous marquez "complété" dans l'application
```

#### Option 2 : Retrait Automatique (Plus tard)

```
1. Créateur demande retrait
   ↓
2. Système utilise API Orange Money pour transférer automatiquement
   ↓
3. Créateur reçoit l'argent directement
```

---

### ❓ Comment les utilisateurs font des dons ?

**Réponse : Paiement direct via Orange Money**

#### Pour les Tips de Vidéos :

```
1. Utilisateur voit une vidéo
   ↓
2. Clique sur "Soutenir" ou "Faire un don"
   ↓
3. Entre le montant (ex: 1000 FCFA)
   ↓
4. Entre son numéro Orange Money (ex: 7701101162)
   ↓
5. Orange Money envoie une demande de paiement sur son téléphone
   ↓
6. Utilisateur confirme sur son téléphone
   ↓
7. L'argent est débité de son compte Orange Money
   ↓
8. L'argent arrive dans VOTRE compte Orange Money (7701901162)
   ↓
9. Votre système distribue :
   - 900 FCFA → Wallet créateur
   - 100 FCFA → Wallet plateforme
```

#### Pour les Cadeaux (Gifts) :

```
Même processus, mais avec des montants prédéfinis (100 F, 500 F, 1000 F, etc.)
```

---

## 🔑 Clés API Orange Money Nécessaires

### 1. Clés pour Recevoir les Paiements (Déjà configuré)

```env
ORANGE_MONEY_MERCHANT_ID=7701901162
ORANGE_MONEY_API_KEY=votre_cle_marchand
```

**Ces clés permettent de :**
- ✅ Demander à un utilisateur de payer (initier un paiement)
- ✅ Vérifier si un paiement a réussi
- ❌ **NE PAS** recevoir l'argent directement (l'argent va dans votre compte marchand)

### 2. Clés pour Transférer aux Créateurs (Optionnel - Plus tard)

```env
ORANGE_MONEY_TRANSFER_API_KEY=cle_pour_transferts
```

**Ces clés permettent de :**
- ✅ Transférer automatiquement de l'argent depuis votre compte vers les créateurs
- ⏳ À configurer plus tard quand vous aurez une équipe

---

## 💳 Flux Complet en Détail

### Étape 1 : Utilisateur Fait un Tip

```
┌─────────────┐
│ Utilisateur │
│ (Frontend)  │
└──────┬──────┘
       │ 1. Clique "Soutenir" → Entre 1000 FCFA
       ↓
┌──────────────────┐
│   Backend API    │
│ POST /videos/:id │
│     /tip         │
└──────┬───────────┘
       │ 2. Crée VideoTip (status: pending)
       │    Crée Transaction (status: pending)
       ↓
┌──────────────────┐
│ Orange Money API │
│  (Initiate)      │
└──────┬───────────┘
       │ 3. Envoie demande de paiement
       ↓
┌─────────────┐
│ Utilisateur │
│ (Téléphone) │
└──────┬──────┘
       │ 4. Reçoit notification Orange Money
       │    Confirme le paiement
       ↓
┌──────────────────┐
│ Orange Money     │
│ (Compte)         │
└──────┬───────────┘
       │ 5. Débite 1000 FCFA de l'utilisateur
       │    Crédite 1000 FCFA dans VOTRE compte (7701901162)
       ↓
┌──────────────────┐
│ Orange Money     │
│ (Webhook)        │
└──────┬───────────┘
       │ 6. Notifie votre backend que le paiement est réussi
       ↓
┌──────────────────┐
│   Backend API    │
│ (Webhook Handler)│
└──────┬───────────┘
       │ 7. Met à jour VideoTip → status: completed
       │    Met à jour Transaction → status: completed
       │    Crédite wallet créateur : +900 FCFA
       │    Crédite wallet plateforme : +100 FCFA
       ↓
┌──────────────────┐
│  Base de Données │
│  (Wallets)       │
└──────────────────┘
```

### Étape 2 : Créateur Demande un Retrait

```
┌─────────────┐
│  Créateur    │
│ (Frontend)   │
└──────┬───────┘
       │ 1. Clique "Retirer" → Entre 5000 FCFA
       │    Entre son numéro Orange Money
       ↓
┌──────────────────┐
│   Backend API    │
│ POST /withdrawals│
│    /request      │
└──────┬───────────┘
       │ 2. Vérifie solde suffisant
       │    Débite wallet créateur : -5000 FCFA
       │    Crée Withdrawal (status: pending)
       ↓
┌──────────────────┐
│  Base de Données │
│  (Withdrawal)    │
└──────┬───────────┘
       │ 3. Notification admin (email/panel)
       ↓
┌─────────────┐
│    Admin    │
│  (Vous)     │
└──────┬──────┘
       │ 4. Vous voyez la demande dans le panel admin
       │    Vous transférez depuis votre compte Orange Money
       │    vers le compte du créateur
       ↓
┌──────────────────┐
│   Backend API    │
│ POST /withdrawals│
│  /:id/process    │
└──────┬───────────┘
       │ 5. Met à jour Withdrawal → status: completed
       │    Crée notification pour le créateur
       ↓
┌─────────────┐
│  Créateur   │
│ (Téléphone) │
└─────────────┘
       │ 6. Reçoit 5000 FCFA sur son compte Orange Money
```

---

## 📊 Où est l'Argent à Chaque Étape ?

### Après un Tip de 1000 FCFA :

| Où | Montant | Type |
|----|---------|------|
| **Votre compte Orange Money** (7701901162) | **1000 FCFA** | 💰 Argent réel |
| Wallet créateur (dans la DB) | 900 FCFA | 📊 Virtuel (compte) |
| Wallet plateforme (dans la DB) | 100 FCFA | 📊 Virtuel (compte) |

**Total :** 1000 FCFA réel dans votre compte, réparti en 900 + 100 dans les wallets virtuels

### Après un Retrait de 5000 FCFA :

| Où | Montant | Type |
|----|---------|------|
| **Votre compte Orange Money** (7701901162) | **-5000 FCFA** | 💰 Argent réel (débité) |
| **Compte Orange Money créateur** | **+5000 FCFA** | 💰 Argent réel (crédité) |
| Wallet créateur (dans la DB) | -5000 FCFA | 📊 Virtuel (débité) |

---

## 🎁 Cadeaux vs Tips : Quelle Différence ?

### Tips (Dons directs)
- Montant libre (minimum 50 FCFA)
- Message optionnel
- Commission : 10% plateforme

### Cadeaux (Gifts)
- Montants prédéfinis (100 F, 500 F, 1000 F, etc.)
- Animation visuelle
- Commission : 30% plateforme (plus élevée car plus "fun")

**Les deux utilisent Orange Money de la même manière !**

---

## ⚙️ Automatisation

### Actuellement Automatique :
- ✅ Distribution des tips (90% créateur, 10% plateforme)
- ✅ Crédit des wallets virtuels
- ✅ Création des transactions
- ✅ Notifications aux créateurs

### Actuellement Manuel :
- ⏳ Retraits (vous devez transférer manuellement)
- ⏳ Validation des retraits

### Plus Tard (Avec Équipe) :
- 🔮 Retraits automatiques via API Orange Money
- 🔮 Validation automatique
- 🔮 Rapports automatiques

---

## 📝 Résumé Ultra Simple

1. **Utilisateur paie** → Argent dans **VOTRE compte Orange Money**
2. **Système distribue** → Wallets virtuels (créateur + plateforme)
3. **Créateur demande retrait** → Vous transférez depuis votre compte
4. **Créateur reçoit** → Sur son compte Orange Money

**C'est comme une banque :**
- Votre compte Orange Money = La banque
- Les wallets dans la DB = Les comptes clients
- Les retraits = Les virements bancaires

---

## 🚀 Prochaines Étapes

1. ✅ **Obtenir les clés API Orange Money** pour initier les paiements
2. ⏳ **Configurer le webhook** pour recevoir les notifications
3. ⏳ **Tester un paiement** avec le compte de test (7701101162)
4. ⏳ **Créer le panel admin** pour voir les retraits en attente
5. ⏳ **Implémenter les transferts automatiques** (plus tard)

---

## 💡 Points Clés à Retenir

- ✅ **L'argent va d'abord dans votre compte Orange Money**
- ✅ **Les wallets sont virtuels** (juste pour suivre qui doit recevoir quoi)
- ✅ **Vous devez transférer manuellement** aux créateurs (pour l'instant)
- ✅ **Les utilisateurs paient directement** via Orange Money
- ✅ **Tout est traçable** dans la base de données

