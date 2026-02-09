# ⚙️ Configuration Base44 - Guide Rapide

## 📋 Étapes de Configuration (10 minutes)

### 1. Créer un compte Base44
- Aller sur [https://base44.com](https://base44.com)
- Créer un compte gratuit
- Confirmer votre email

### 2. Créer une application
- Dans le dashboard, cliquer sur "Créer une application"
- Donner un nom (ex: "AfriConnect")
- Noter l'`APP_ID` et l'`APP_BASE_URL` affichés

### 3. Créer le fichier `.env.local`
À la racine du projet, créer un fichier `.env.local` avec :

```env
# Base44 Configuration (Obligatoire)
VITE_BASE44_APP_ID=votre_app_id_ici
VITE_BASE44_APP_BASE_URL=https://votre-app.base44.app
VITE_BASE44_FUNCTIONS_VERSION=v1

# Orange Money (Optionnel)
VITE_REACT_APP_ORANGE_MERCHANT_ID=votre_merchant_id
VITE_REACT_APP_ORANGE_API_KEY=votre_api_key

# Stripe (Optionnel)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_votre_cle

# Push Notifications (Optionnel)
VITE_REACT_APP_VAPID_PUBLIC_KEY=votre_vapid_key
```

### 4. Redémarrer l'application
```bash
# Arrêter le serveur (Ctrl+C)
# Puis redémarrer
npm run dev
```

### 5. Vérifier
- Ouvrir http://localhost:5173
- Les erreurs Base44 404 devraient disparaître
- L'application devrait être 100% fonctionnelle

## ✅ C'est tout !

Votre application est maintenant configurée et prête à l'emploi.

