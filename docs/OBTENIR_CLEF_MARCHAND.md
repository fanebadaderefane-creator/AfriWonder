# 🔑 Comment Obtenir la Clé Marchand Orange Money Mali

## 📋 Informations Fournies par Orange Money

D'après vos captures d'écran, vous avez reçu :

### Compte Marchand 1
- **MSISDN** : `7701901162`
- **Agent Code** : `102782`
- **PIN** : `5324`
- **Login Simulateur** : `7701901162`
- **MDP Simulateur** : `MerchantWP01162`

### Compte Marchand 2
- **MSISDN** : `7701901163`
- **Agent Code** : `102783`
- **PIN** : `7590`
- **Login Simulateur** : `7701901163`
- **MDP Simulateur** : `MerchantWP01163`

---

## ⚠️ Important : L'Agent Code N'EST PAS l'API_KEY

D'après la documentation Orange Money :
> **"Pour avoir la clef marchant il doit utiliser :"**
> - MSISDN
> - Agent Code

Cela signifie que le **MSISDN** et l'**Agent Code** sont utilisés **POUR OBTENIR** la clé marchand, pas qu'ils SONT la clé marchand.

---

## 🔑 Comment Obtenir l'API_KEY (Clé Marchand)

### Méthode 1 : Via l'API Orange Money (Recommandé)

L'API_KEY est généralement obtenue via un appel API d'authentification :

```javascript
// Exemple d'appel API pour obtenir le token/API_KEY
const response = await fetch('https://api.orange.ml/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: '7701901162', // MSISDN
    client_secret: '102782' // Agent Code (ou peut-être le PIN)
  })
});

const data = await response.json();
const apiKey = data.access_token; // C'est votre API_KEY
```

**Note** : La validité du Token est de **1 heure** selon la documentation.

### Méthode 2 : Via le Dashboard Orange Money

1. Connectez-vous au dashboard Orange Money Mali
2. Allez dans la section "API" ou "Intégration"
3. Utilisez le MSISDN (`7701901162`) et l'Agent Code (`102782`)
4. Générez ou récupérez la clé marchand (API_KEY)

### Méthode 3 : Contacter le Support Orange Money

1. Contactez le support technique Orange Money Mali
2. Fournissez :
   - **MSISDN** : `7701901162`
   - **Agent Code** : `102782`
3. Demandez la **clé marchand** (merchant key / API_KEY) pour l'intégration API

---

## 📝 Configuration dans `.env.local`

Une fois que vous avez l'API_KEY, mettez-la dans `.env.local` :

```env
# Orange Money Mali - Test
VITE_ORANGE_MERCHANT_ID=7701901162
VITE_REACT_APP_ORANGE_MERCHANT_ID=7701901162
VITE_ORANGE_API_KEY=votre_vraie_api_key_obtenue
VITE_REACT_APP_ORANGE_API_KEY=votre_vraie_api_key_obtenue
```

---

## 🔄 Token Dynamique (Si Token Valide 1 Heure)

Si le token expire après 1 heure, vous devrez peut-être :

1. **Obtenir le token dynamiquement** dans votre code
2. **Rafraîchir le token** automatiquement avant expiration
3. **Utiliser le MSISDN + Agent Code** pour générer un nouveau token

---

## 🧪 Tester avec le Simulateur

Vous pouvez tester avec le simulateur Orange Money :

- **Login** : `7701901162` (MSISDN)
- **MDP** : `MerchantWP01162` (ID du marchand)

---

## ✅ Prochaines Étapes

1. ⏳ **Obtenir l'API_KEY** via l'une des méthodes ci-dessus
2. ⏳ **Configurer dans `.env.local`** une fois obtenue
3. ✅ **Tester** avec le compte abonné (`7701101162`)

---

## 📞 Support Orange Money Mali

Si vous avez besoin d'aide :
- **Documentation API** : Consultez la documentation Orange Money Mali
- **Support Technique** : Contactez le support avec MSISDN + Agent Code
- **Simulateur** : Utilisez les credentials fournis pour tester

---

## 🎯 Résumé

| Élément | Valeur | Utilisation |
|---------|--------|-------------|
| MSISDN | `7701901162` | Identifiant marchand |
| Agent Code | `102782` | Pour obtenir l'API_KEY |
| API_KEY | À obtenir | Clé secrète pour l'API |
| Token | Valide 1h | Peut nécessiter rafraîchissement |

**L'API_KEY doit être obtenue séparément, elle n'est pas l'Agent Code !** 🔑

