# 📱 Configuration Orange Money Mali - Environnement de Test

## ✅ Informations Fournies

D'après votre capture d'écran, voici les paramètres de test Orange Money Mali :

### 🏪 Channel User (Marchand)
- **ID/Login/Name** : `MerchantWP01162`
- **MSISDN** : `7701901162` ✅ (Utilisé comme MERCHANT_ID)
- **Agent Code** : `102782` ✅ (Nécessaire pour obtenir la clé marchand)
- **PIN** : `5324` (⚠️ Ne pas mettre dans .env.local - sécurité)
- **Balance** : `0`

### 👤 Subscriber (Abonné de Test)
- **ID/Login/Name** : `WPSubs01162`
- **MSISDN** : `7701101162` (Pour tester les paiements)
- **PIN** : `7936` (Pour tester les paiements)
- **Balance** : `1 000 000` XOF

---

## 🔑 Obtenir la Clé Marchand (API_KEY)

**Important** : Pour obtenir la clé marchand (merchant key), vous devez utiliser :

| Paramètre | Valeur |
|-----------|--------|
| **MSISDN** | `7701901162` |
| **Agent Code** | `102782` |

**Action requise** :
1. Contacter Orange Money Mali (support technique ou API)
2. Fournir le MSISDN (`7701901162`) et l'Agent Code (`102782`)
3. Demander la clé marchand (merchant key / API_KEY)
4. Une fois obtenue, remplacer `[OBTENIR_VIA_MSISDN_ET_AGENT_CODE]` dans `.env.local`

---

## 📝 Configuration dans `.env.local`

Une fois que vous avez la clé marchand, votre configuration sera :

```env
# Orange Money Mali - Test
VITE_ORANGE_MERCHANT_ID=7701901162
VITE_REACT_APP_ORANGE_MERCHANT_ID=7701901162
VITE_ORANGE_API_KEY=votre_cle_marchand_obtenue
VITE_REACT_APP_ORANGE_API_KEY=votre_cle_marchand_obtenue
```

---

## 🧪 Tester les Paiements

### Compte Abonné de Test
- **MSISDN** : `7701101162`
- **PIN** : `7936`
- **Balance** : `1 000 000` XOF

Utilisez ce compte pour tester les paiements dans l'application.

---

## ⚠️ Sécurité

- ✅ **MSISDN** et **Agent Code** : OK à mettre dans `.env.local` (déjà dans .gitignore)
- ❌ **PIN** : **NE JAMAIS** mettre dans `.env.local` ou dans le code
- ✅ **API_KEY** : OK à mettre dans `.env.local` (déjà dans .gitignore)

---

## 🔄 Variables Utilisées dans le Code

### Frontend (`src/components/payment/OrangeMoneyIntegration.jsx`)
- `VITE_ORANGE_MERCHANT_ID` ou `REACT_APP_ORANGE_MERCHANT_ID`
- `VITE_ORANGE_API_KEY` ou `REACT_APP_ORANGE_API_KEY`

### Backend (`functions/orangeMoneyIntegration.ts`)
- `ORANGE_MONEY_CLIENT_ID` (peut être différent du MERCHANT_ID)
- `ORANGE_MONEY_CLIENT_SECRET` (peut être différent de l'API_KEY)

**Note** : Le backend utilise OAuth avec CLIENT_ID et CLIENT_SECRET, qui peuvent être différents des credentials frontend. Vérifiez avec Orange Money Mali si vous avez besoin de credentials séparés pour le backend.

---

## ✅ Prochaines Étapes

1. ✅ **MSISDN configuré** : `7701901162`
2. ⏳ **Obtenir la clé marchand** : Contacter Orange Money Mali avec MSISDN + Agent Code
3. ⏳ **Configurer l'API_KEY** : Remplacer dans `.env.local` une fois obtenue
4. ✅ **Tester** : Utiliser le compte abonné (`7701101162`) pour tester

---

## 📞 Contact Orange Money Mali

Pour obtenir la clé marchand :
- **Support API** : Contactez le support technique Orange Money Mali
- **Documentation** : Consultez la documentation API Orange Money Mali
- **Informations à fournir** :
  - MSISDN : `7701901162`
  - Agent Code : `102782`
  - Type de clé : Merchant Key / API Key pour intégration

---

## 🎯 Résumé

| Élément | Valeur | Statut |
|---------|--------|--------|
| MSISDN Marchand | `7701901162` | ✅ Configuré |
| Agent Code | `102782` | ✅ Documenté |
| API_KEY | À obtenir | ⏳ En attente |
| MSISDN Test | `7701101162` | ✅ Prêt pour tests |

Une fois l'API_KEY obtenue, l'intégration Orange Money sera **100% fonctionnelle** ! 🚀

