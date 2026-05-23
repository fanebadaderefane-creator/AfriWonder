# 🚀 Guide Rapide - Configuration Orange Money Test

**Pour la production du 26 février 2026**

---

## ✅ CE QUI EST DÉJÀ CONFIGURÉ

- ✅ **Comptes de test** : 2 comptes disponibles
- ✅ **MSISDN Marchand** : `7701901162` (Compte 1) ou `7701901163` (Compte 2)
- ✅ **Agent Code** : `102782` (Compte 1) ou `102783` (Compte 2)
- ✅ **Subscribers de test** : Balance de 1M FCFA disponible
- ✅ **Fichiers de configuration** : Prêts à être remplis

---

## ⏳ CE QUI MANQUE

### 🔑 Clé Marchand (API_KEY)

**Action requise** : Obtenir la clé marchand en utilisant :
- **MSISDN** : `7701901162` (ou `7701901163`)
- **Agent Code** : `102782` (ou `102783`)

**Comment obtenir** :
1. Via le portail développeur : https://developer.orange.com/signin?r=/apis/om-webpay-dev/overview
2. Via le simulateur (Login: MSISDN, MDP: MerchantWP01162)
3. Contacter le support Orange Money Mali

---

## 📝 ÉTAPES DE CONFIGURATION

### 1. Obtenir la clé marchand

Utiliser les informations ci-dessus pour obtenir la clé via le portail ou le simulateur.

### 2. Configurer le Backend

Éditer `backend/.env` :
```env
ORANGE_MONEY_MERCHANT_ID=7701901162
ORANGE_MONEY_API_KEY=votre_cle_obtenue
ORANGE_MONEY_AGENT_CODE=102782
ORANGE_MONEY_API_URL=https://api.orange.ml
ORANGE_MONEY_TOKEN_REFRESH_INTERVAL=3600000
ORANGE_MONEY_ENV=test
```

### 3. Configurer le Frontend

Éditer `.env.local` :
```env
VITE_ORANGE_MERCHANT_ID=7701901162
VITE_ORANGE_API_KEY=votre_cle_obtenue
VITE_REACT_APP_ORANGE_MERCHANT_ID=7701901162
VITE_REACT_APP_ORANGE_API_KEY=votre_cle_obtenue
```

### 4. Redémarrer les serveurs

```bash
# Backend
cd backend
npm run dev

# Frontend
npm run dev
```

### 5. Tester

Utiliser le compte subscriber de test :
- **MSISDN** : `7701101162`
- **PIN** : `7936`
- **Balance** : 1 000 000 FCFA

---

## 📚 DOCUMENTATION COMPLÈTE

Pour plus de détails, consulter :
- `ORANGE_MONEY_TEST_ENV.md` - Informations complètes sur l'environnement de test
- `ORANGE_MONEY_ENV_TEST_CONFIG.md` - Configuration détaillée des variables
- `ORANGE_MONEY_CONFIG.md` - Configuration générale Orange Money

---

## ⚠️ NOTES IMPORTANTES

1. **Token valide 1 heure** : Le backend doit implémenter un refresh automatique
2. **Environnement de test** : Ces credentials sont pour les tests uniquement
3. **Production** : Demander les credentials de production avant le 26 février
4. **Sécurité** : Ne jamais commiter les clés dans Git (déjà dans .gitignore)

---

**Status** : ⏳ En attente de la clé marchand (API_KEY)  
**Prochaine étape** : Obtenir la clé et configurer les variables d'environnement
