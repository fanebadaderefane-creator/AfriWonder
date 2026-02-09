# 🎯 Guide Complet : Compléter Orange Money Mali

## 📋 État Actuel

### ✅ Déjà Configuré
- ✅ `VITE_ORANGE_MERCHANT_ID` = `7701901162`
- ✅ `VITE_REACT_APP_ORANGE_MERCHANT_ID` = `7701901162`
- ✅ MSISDN : `7701901162`
- ✅ Agent Code : `102782`
- ✅ Credentials Simulateur : Login `7701901162`, MDP `MerchantWP01162`

### ⏳ Manque
- ❌ `VITE_ORANGE_API_KEY` = `[OBTENIR_VIA_API_ORANGE_MONEY]`
- ❌ `VITE_REACT_APP_ORANGE_API_KEY` = `[OBTENIR_VIA_API_ORANGE_MONEY]`

---

## 🔑 Étape 1 : Obtenir l'API_KEY (Clé Marchand)

### Option A : Via l'API Orange Money (Recommandé)

#### 1.1. Tester l'API d'authentification

Créez un fichier de test pour obtenir le token :

```javascript
// test-orange-money.js
const MSISDN = '7701901162';
const AGENT_CODE = '102782';

// Option 1 : Essayer avec Agent Code comme client_secret
fetch('https://api.orange.ml/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic ' + btoa(`${MSISDN}:${AGENT_CODE}`)
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials'
  })
})
.then(res => res.json())
.then(data => {
  console.log('Token obtenu:', data);
  console.log('API_KEY (access_token):', data.access_token);
})
.catch(err => console.error('Erreur:', err));
```

#### 1.2. Endpoints possibles Orange Money Mali

Essayez ces URLs (selon la documentation Orange Money Mali) :

- `https://api.orange.ml/oauth/token`
- `https://api.orange.ml/payment/v1/oauth/token`
- `https://api.orange-sonatel.com/oauth/token`
- `https://sandbox.orange.ml/oauth/token` (pour test)

#### 1.3. Paramètres à essayer

**Essai 1 : Agent Code comme secret**
```javascript
client_id: '7701901162'
client_secret: '102782'
```

**Essai 2 : PIN comme secret**
```javascript
client_id: '7701901162'
client_secret: '5324' // PIN
```

**Essai 3 : MDP Simulateur comme secret**
```javascript
client_id: '7701901162'
client_secret: 'MerchantWP01162'
```

---

### Option B : Via le Dashboard Orange Money

1. **Connectez-vous** au dashboard Orange Money Mali
   - URL : Généralement `https://developer.orange.ml` ou similaire
   - Utilisez vos credentials (MSISDN + PIN ou MDP)

2. **Allez dans la section "API" ou "Intégration"**

3. **Générez ou récupérez la clé marchand**
   - Fournissez le MSISDN : `7701901162`
   - Fournissez l'Agent Code : `102782`
   - Générez l'API_KEY

4. **Copiez l'API_KEY** générée

---

### Option C : Contacter le Support Orange Money

1. **Contactez le support technique Orange Money Mali**
   - Email : Généralement `support-api@orange.ml` ou similaire
   - Téléphone : Support technique Orange Money

2. **Fournissez les informations** :
   ```
   Bonjour,
   
   Je souhaite obtenir la clé marchand (API_KEY) pour intégrer Orange Money dans mon application.
   
   Informations :
   - MSISDN : 7701901162
   - Agent Code : 102782
   - Type : Environnement de test
   
   Merci de me fournir l'API_KEY nécessaire.
   ```

3. **Attendez la réponse** avec l'API_KEY

---

## 📝 Étape 2 : Configurer l'API_KEY dans `.env.local`

Une fois que vous avez l'API_KEY, mettez-la dans `.env.local` :

```env
# Orange Money Mali - Test
VITE_ORANGE_MERCHANT_ID=7701901162
VITE_REACT_APP_ORANGE_MERCHANT_ID=7701901162
VITE_ORANGE_API_KEY=votre_api_key_obtenue_ici
VITE_REACT_APP_ORANGE_API_KEY=votre_api_key_obtenue_ici
```

**Remplacez** `votre_api_key_obtenue_ici` par la vraie API_KEY.

---

## 🧪 Étape 3 : Tester l'Intégration

### 3.1. Redémarrer l'application

```bash
# Arrêter le serveur (Ctrl+C)
npm run dev
```

### 3.2. Tester un paiement

1. **Ouvrir l'application** : http://localhost:5173
2. **Aller dans la section paiement**
3. **Sélectionner Orange Money**
4. **Tester avec le compte abonné** :
   - MSISDN : `7701101162`
   - PIN : `7936`
   - Balance : `1 000 000` XOF

### 3.3. Vérifier les logs

Dans la console du navigateur, vérifiez :
- ✅ Pas d'erreur "API_KEY manquante"
- ✅ Connexion à Orange Money réussie
- ✅ Paiement traité correctement

---

## 🔄 Étape 4 : Gérer le Token (Si Valide 1 Heure)

Si le token expire après 1 heure, vous devrez :

### Option 1 : Rafraîchir automatiquement

Modifier `src/components/payment/OrangeMoneyIntegration.jsx` pour rafraîchir le token automatiquement.

### Option 2 : Utiliser MSISDN + Agent Code directement

Si l'API_KEY est en fait le token OAuth, vous devrez peut-être générer le token à chaque requête.

---

## 📞 Ressources Orange Money Mali

### Documentation
- Documentation API Orange Money Mali
- Guide d'intégration Orange Money
- Exemples de code

### Support
- Support technique Orange Money Mali
- Email : `support-api@orange.ml` (vérifier l'adresse exacte)
- Téléphone : Support Orange Money

### Simulateur
- URL : URL du simulateur Orange Money (fournie dans la documentation)
- Login : `7701901162`
- MDP : `MerchantWP01162`

---

## ✅ Checklist Finale

- [ ] API_KEY obtenue (via API, Dashboard, ou Support)
- [ ] API_KEY configurée dans `.env.local`
- [ ] Application redémarrée
- [ ] Test de paiement effectué
- [ ] Paiement réussi avec compte abonné (`7701101162`)
- [ ] Logs vérifiés (pas d'erreur)

---

## 🎯 Résumé des Actions

1. **Obtenir l'API_KEY** :
   - Essayer l'API OAuth avec MSISDN + Agent Code
   - OU Dashboard Orange Money
   - OU Contacter le support

2. **Configurer dans `.env.local`** :
   - Remplacer `[OBTENIR_VIA_API_ORANGE_MONEY]` par la vraie API_KEY

3. **Tester** :
   - Redémarrer l'app
   - Tester un paiement
   - Vérifier les logs

---

## 🚀 Une Fois Complété

Votre intégration Orange Money sera **100% fonctionnelle** ! 🎉

Vous pourrez :
- ✅ Accepter les paiements Orange Money
- ✅ Traiter les transactions
- ✅ Gérer les remboursements
- ✅ Suivre les paiements en temps réel

---

## 💡 Astuce

Si vous avez accès au **simulateur Orange Money**, testez d'abord là-bas pour comprendre comment obtenir l'API_KEY, puis utilisez la même méthode dans votre application.

