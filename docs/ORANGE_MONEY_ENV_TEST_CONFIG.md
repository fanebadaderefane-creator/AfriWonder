# 🔧 Configuration Variables d'Environnement - Orange Money Test

**Date** : 17 Février 2026  
**Environnement** : Test (Production 26 février)

---

## 📋 VARIABLES À CONFIGURER

### Backend (`backend/.env`)

```env
# ========== Orange Money Mali - Test Environment ==========
# Compte 1 (FANE) - Recommandé
ORANGE_MONEY_MERCHANT_ID=7701901162
ORANGE_MONEY_API_KEY=[À OBTENIR - Utiliser MSISDN 7701901162 + Agent Code 102782]
ORANGE_MONEY_AGENT_CODE=102782
ORANGE_MONEY_API_URL=https://api.orange.ml

# OU Compte 2 (Alternative)
# ORANGE_MONEY_MERCHANT_ID=7701901163
# ORANGE_MONEY_API_KEY=[À OBTENIR - Utiliser MSISDN 7701901163 + Agent Code 102783]
# ORANGE_MONEY_AGENT_CODE=102783
# ORANGE_MONEY_API_URL=https://api.orange.ml

# Token refresh (validité 1 heure)
ORANGE_MONEY_TOKEN_REFRESH_INTERVAL=3600000

# Webhook secret (pour production)
ORANGE_MONEY_WEBHOOK_SECRET=[À CONFIGURER EN PRODUCTION]

# Environment
ORANGE_MONEY_ENV=test
```

### Frontend (`.env.local`)

```env
# ========== Orange Money Mali - Test Environment ==========
# Compte 1 (FANE) - Recommandé
VITE_ORANGE_MERCHANT_ID=7701901162
VITE_ORANGE_API_KEY=[À OBTENIR - Utiliser MSISDN 7701901162 + Agent Code 102782]

# OU Compte 2 (Alternative)
# VITE_ORANGE_MERCHANT_ID=7701901163
# VITE_ORANGE_API_KEY=[À OBTENIR - Utiliser MSISDN 7701901163 + Agent Code 102783]

# Pour compatibilité React
VITE_REACT_APP_ORANGE_MERCHANT_ID=7701901162
VITE_REACT_APP_ORANGE_API_KEY=[À OBTENIR]
```

---

## 🔑 COMMENT OBTENIR LA CLÉ MARCHAND (API_KEY)

### Option 1 : Via le Portail Développeur Orange Money

1. **Accéder au portail** :
   ```
   https://developer.orange.com/signin?r=/apis/om-webpay-dev/overview
   ```

2. **Se connecter** avec les credentials :
   - **Compte 1** : Login `7701901162`, MDP `MerchantWP01162`
   - **Compte 2** : Login `7701901163`, MDP `MerchantWP01163`

3. **Générer la clé marchand** :
   - Aller dans la section "API Keys" ou "Merchant Keys"
   - Utiliser MSISDN + Agent Code pour générer
   - Copier la clé générée

### Option 2 : Via le Simulateur

1. **Se connecter au simulateur** avec les credentials ci-dessus
2. **Accéder à la section "Merchant Key"**
3. **Générer ou récupérer la clé**

### Option 3 : Contacter le Support Orange Money

1. **Contacter le support technique** Orange Money Mali
2. **Fournir les informations** :
   - MSISDN : `7701901162` (ou `7701901163`)
   - Agent Code : `102782` (ou `102783`)
   - Type de clé : Merchant Key / API Key pour intégration WebPay
3. **Demander la clé marchand**

---

## 🧪 COMPTES DE TEST DISPONIBLES

### Compte Subscriber (Pour tester les paiements)

**Compte 1** :
```
MSISDN: 7701101162
PIN: 7936
Balance: 1 000 000 FCFA
```

**Compte 2** :
```
MSISDN: 7701101163
PIN: 2028
Balance: 1 000 000 FCFA
```

**Utilisation** : Utiliser ces comptes pour tester les paiements dans l'application.

---

## ⚠️ IMPORTANT - VALIDITÉ DU TOKEN

Le token Orange Money a une **validité de 1 heure**.

### Implémentation du Refresh Automatique

Le backend doit implémenter un système de refresh automatique :

```typescript
// Exemple dans payment.service.ts
const tokenRefreshInterval = parseInt(
  process.env.ORANGE_MONEY_TOKEN_REFRESH_INTERVAL || '3600000'
); // 1 heure par défaut

// Stocker le token avec sa date d'expiration
let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken() {
  const now = Date.now();
  if (accessToken && tokenExpiresAt > now) {
    return accessToken; // Token encore valide
  }
  
  // Refresh le token
  const response = await axios.post(
    `${ORANGE_MONEY_API_URL}/token`,
    {
      grant_type: 'client_credentials'
    },
    {
      auth: {
        username: merchantId,
        password: apiKey
      }
    }
  );
  
  accessToken = response.data.access_token;
  tokenExpiresAt = now + (tokenRefreshInterval - 60000); // Refresh 1 min avant expiration
  
  return accessToken;
}
```

---

## 📝 CHECKLIST DE CONFIGURATION

### Avant de commencer les tests

- [ ] Obtenir la clé marchand (API_KEY) pour le compte choisi
- [ ] Configurer `ORANGE_MONEY_MERCHANT_ID` dans backend `.env`
- [ ] Configurer `ORANGE_MONEY_API_KEY` dans backend `.env`
- [ ] Configurer `VITE_ORANGE_MERCHANT_ID` dans `.env.local`
- [ ] Configurer `VITE_ORANGE_API_KEY` dans `.env.local`
- [ ] Vérifier que `ORANGE_MONEY_API_URL` est correct
- [ ] Implémenter le refresh automatique du token (si nécessaire)
- [ ] Tester la connexion avec le simulateur

### Tests à effectuer

- [ ] Test de paiement avec le subscriber de test
- [ ] Vérification des webhooks
- [ ] Test de différents montants
- [ ] Test d'annulation de paiement
- [ ] Vérification des notifications

---

## 🔄 MIGRATION VERS PRODUCTION

Quand vous recevrez les credentials de production :

1. **Remplacer les variables d'environnement** :
   - `ORANGE_MONEY_MERCHANT_ID` → Nouveau MSISDN de production
   - `ORANGE_MONEY_API_KEY` → Nouvelle clé de production
   - `ORANGE_MONEY_API_URL` → URL de production (si différente)

2. **Configurer le webhook secret** :
   ```env
   ORANGE_MONEY_WEBHOOK_SECRET=[Secret fourni par Orange Money]
   ```

3. **Changer l'environnement** :
   ```env
   ORANGE_MONEY_ENV=production
   NODE_ENV=production
   ```

4. **Tester avec de petits montants réels** avant de passer en production complète

---

## 📞 SUPPORT

- **Portail API** : https://developer.orange.com/signin?r=/apis/om-webpay-dev/overview
- **Contact** : Utiliser le formulaire "Contact us" sur le portail développeur
- **Emails d'enregistrement** : Vérifier `abdoulayefane813@gmail.com` et `gaoussoudidi1234@gmail.com`

---

**Status** : ⏳ En attente de la clé marchand (API_KEY)  
**Prochaine étape** : Obtenir la clé marchand et configurer les variables d'environnement
