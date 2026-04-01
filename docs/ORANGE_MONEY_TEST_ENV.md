# 🧪 Configuration Environnement de Test Orange Money - Production 26 Février

**Date** : 17 Février 2026  
**Environnement** : Test (pour production du 26 février)  
**API** : Orange Money WebPay Dev API

---

## 📋 COMPTES DE TEST DISPONIBLES

### Compte 1 : FANE (MerchantWP01162)

#### Channel User (DistribLevel1)
```
id/login/name: MerchantWP01162
MSISDN: 7701901162
Agent Code: 102782
PIN: 5324
Balance: 0
```

#### Subscriber (Test)
```
id/login/name: WPSubs01162
MSISDN: 7701101162
PIN: 7936
Balance: 1 000 000 FCFA
```

#### Pour obtenir la clé marchand (Merchant Key)
```
MSISDN: 7701901162
Agent Code: 102782
```

#### Connexion au Simulateur
```
Login: 7701901162
Mot de passe (MDP): MerchantWP01162
```

---

### Compte 2 : (MerchantWP01163)

#### Channel User (DistribLevel1)
```
id/login/name: MerchantWP01163
MSISDN: 7701901163
Agent Code: 102783
PIN: 7590
Balance: 0
```

#### Subscriber (Test)
```
id/login/name: WPSubs01163
MSISDN: 7701101163
PIN: 2028
Balance: 1 000 000 FCFA
```

#### Pour obtenir la clé marchand (Merchant Key)
```
MSISDN: 7701901163
Agent Code: 102783
```

#### Connexion au Simulateur
```
Login: 7701901163
Mot de passe (MDP): MerchantWP01163
```

---

## 🔑 OBTENIR LA CLÉ MARCHAND (Merchant Key)

### Méthode 1 : Via l'API Orange Money WebPay Dev

1. **Se connecter au portail développeur** :
   ```
   https://developer.orange.com/signin?r=/apis/om-webpay-dev/overview
   ```

2. **Utiliser les credentials du compte** :
   - Pour Compte 1 : MSISDN `7701901162` + Agent Code `102782`
   - Pour Compte 2 : MSISDN `7701901163` + Agent Code `102783`

3. **Générer la clé marchand** via l'API ou le dashboard

### Méthode 2 : Via le Simulateur

1. **Se connecter au simulateur** avec les credentials ci-dessus
2. **Accéder à la section "Merchant Key"**
3. **Générer ou récupérer la clé**

---

## 🔐 VALIDITÉ DU TOKEN

⚠️ **IMPORTANT** : La validité du Token est de **1 heure**.

- Les tokens d'authentification expirent après 1 heure
- Il faut implémenter un système de refresh automatique
- Stocker le token avec sa date d'expiration

---

## 📧 ENREGISTREMENT DES COMPTES

### Emails à vérifier

Les emails suivants ont normalement reçu un lien d'enregistrement :
- `abdoulayefane813@gmail.com`
- `gaoussoudidi1234@gmail.com`

### Processus d'enregistrement

1. **Cliquer sur le lien HTTPS** reçu par email
2. **Créer un compte** ("Create account")
3. **Confirmer l'enregistrement** via l'email de confirmation

---

## 🔗 LIENS UTILES

### Portail API Orange Money WebPay Dev
```
https://developer.orange.com/signin?r=/apis/om-webpay-dev/overview
```

**Note** : Vous devrez vous connecter ou créer un compte. Un accès privilégié vous a été accordé pour voir cette API.

### Support
Si vous avez des questions, utilisez le formulaire "Contact us" sur le portail développeur.

---

## ⚙️ CONFIGURATION DANS LE PROJET

### Variables d'environnement à configurer

#### Backend (`.env` ou variables serveur)
```env
# Compte 1 (FANE) - Recommandé pour production
ORANGE_MONEY_MERCHANT_ID=7701901162
ORANGE_MONEY_API_KEY=[À OBTENIR VIA MSISDN + AGENT CODE]
ORANGE_MONEY_AGENT_CODE=102782
ORANGE_MONEY_API_URL=https://api.orange.ml

# OU Compte 2
# ORANGE_MONEY_MERCHANT_ID=7701901163
# ORANGE_MONEY_API_KEY=[À OBTENIR VIA MSISDN + AGENT CODE]
# ORANGE_MONEY_AGENT_CODE=102783

# Token refresh (1 heure de validité)
ORANGE_MONEY_TOKEN_REFRESH_INTERVAL=3600000
```

#### Frontend (`.env.local` ou variables build)
```env
# Compte 1 (FANE)
VITE_ORANGE_MERCHANT_ID=7701901162
VITE_ORANGE_API_KEY=[À OBTENIR VIA MSISDN + AGENT CODE]

# OU Compte 2
# VITE_ORANGE_MERCHANT_ID=7701901163
# VITE_ORANGE_API_KEY=[À OBTENIR VIA MSISDN + AGENT CODE]
```

---

## 🧪 TESTER AVEC LE SIMULATEUR

### Connexion au Simulateur

**Compte 1** :
```
URL: [URL du simulateur fourni par Orange Money]
Login: 7701901162
Mot de passe: MerchantWP01162
```

**Compte 2** :
```
URL: [URL du simulateur fourni par Orange Money]
Login: 7701901163
Mot de passe: MerchantWP01163
```

### Scénarios de test

1. **Test de paiement** :
   - Utiliser le subscriber avec balance de 1 000 000 FCFA
   - Tester un paiement de montant variable
   - Vérifier la confirmation

2. **Test de transfert** :
   - Tester les transferts entre comptes
   - Vérifier les notifications

3. **Test de webhook** :
   - Vérifier que les webhooks sont reçus correctement
   - Tester les différents statuts de paiement

---

## 📝 NOTES IMPORTANTES

### Pour la production du 26 février

1. ✅ **Comptes de test configurés** : Les deux comptes sont prêts
2. ⚠️ **Clé marchand à obtenir** : Utiliser MSISDN + Agent Code pour générer
3. ⚠️ **Token refresh** : Implémenter le refresh automatique (validité 1h)
4. ✅ **Subscriber de test** : Balance de 1M FCFA disponible pour tests
5. ⚠️ **Enregistrement emails** : Vérifier que les emails sont bien enregistrés

### Checklist avant production

- [ ] Obtenir la clé marchand (Merchant Key) pour le compte choisi
- [ ] Configurer les variables d'environnement (backend + frontend)
- [ ] Tester le paiement avec le simulateur
- [ ] Vérifier les webhooks
- [ ] Implémenter le refresh automatique du token
- [ ] Tester avec le subscriber de test (1M FCFA)
- [ ] Valider le flux complet de paiement

---

## 🔄 MIGRATION VERS PRODUCTION

Une fois les tests validés, pour passer en production :

1. **Demander les credentials de production** à Orange Money Mali
2. **Remplacer les variables d'environnement** de test par celles de production
3. **Mettre à jour l'URL de l'API** si différente
4. **Tester à nouveau** avec des montants réels (petits montants d'abord)

---

**Status** : ✅ Environnement de test configuré et prêt  
**Prochaine étape** : Obtenir la clé marchand et tester avec le simulateur
