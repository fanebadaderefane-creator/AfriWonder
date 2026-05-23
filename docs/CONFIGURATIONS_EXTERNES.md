# 🔧 Configurations Externes Requises (Non Gérées par l'ancien service)

## ⚠️ Important

l'ancien service **ne gère PAS** ces fonctionnalités automatiquement. Vous devez configurer des services externes.

---

## 📧 1. SendGrid - Emails Automatiques

### ❌ l'ancien service ne gère PAS les emails

**Service requis** : SendGrid (ou alternative)

### Configuration Nécessaire

**Backend (functions/emailNotifications.ts)** :
```env
SENDGRID_API_KEY=votre_cle_sendgrid
```

**Comment configurer** :

1. **Créer un compte SendGrid**
   - Aller sur [sendgrid.com](https://sendgrid.com)
   - Créer un compte gratuit (100 emails/jour)

2. **Obtenir l'API Key**
   - Dashboard → Settings → API Keys
   - Créer une nouvelle clé API
   - Copier la clé

3. **Configurer dans l'ancien service**
   - l'ancien service Dashboard → Environment Variables
   - Ajouter : `SENDGRID_API_KEY` = votre clé
   - **OU** dans votre code backend directement

**Alternatives à SendGrid** :
- Resend (moderne, simple)
- Mailgun
- AWS SES
- Postmark

**Impact** : ⚠️ **Sans configuration** : Les emails ne seront pas envoyés (notifications, confirmations, etc.)

**Priorité** : 🟡 **MOYENNE** (important pour les notifications utilisateurs)

---

## 📱 2. Push Notifications

### ❌ l'ancien service ne gère PAS les push notifications

**Service requis** : Service de Push Notifications

### Configuration Nécessaire

**Frontend (.env.local)** :
```env
VITE_REACT_APP_VAPID_PUBLIC_KEY=votre_vapid_public_key
```

**Comment configurer** :

### Option A : Firebase Cloud Messaging (FCM) - Recommandé

1. **Créer un projet Firebase**
   - Aller sur [firebase.google.com](https://firebase.google.com)
   - Créer un nouveau projet
   - Activer Cloud Messaging

2. **Obtenir les clés VAPID**
   - Firebase Console → Project Settings → Cloud Messaging
   - Générer les clés VAPID
   - Copier la clé publique

3. **Configurer dans l'app**
   - Ajouter `VITE_REACT_APP_VAPID_PUBLIC_KEY` dans `.env.local`
   - Configurer le service worker

### Option B : OneSignal

1. **Créer un compte OneSignal**
   - Aller sur [onesignal.com](https://onesignal.com)
   - Créer une application web

2. **Obtenir l'App ID**
   - Dashboard → Settings → Keys & IDs
   - Copier l'App ID

3. **Configurer dans l'app**
   - Ajouter les clés dans `.env.local`

**Impact** : ⚪ **Sans configuration** : Les notifications push ne fonctionneront pas

**Priorité** : ⚪ **FAIBLE** (optionnel, peut être ajouté plus tard)

---

## 🔐 3. Social Authentication (Google/Facebook)

### ❌ l'ancien service ne gère PAS l'authentification sociale automatiquement

**Services requis** : Google OAuth + Facebook OAuth

### Configuration Nécessaire

**Backend (functions/socialAuth.ts)** :
```env
GOOGLE_CLIENT_ID=votre_google_client_id
GOOGLE_CLIENT_SECRET=votre_google_client_secret
FACEBOOK_APP_ID=votre_facebook_app_id
FACEBOOK_APP_SECRET=votre_facebook_app_secret
```

### Configuration Google OAuth

1. **Créer un projet Google Cloud**
   - Aller sur [console.cloud.google.com](https://console.cloud.google.com)
   - Créer un nouveau projet

2. **Activer Google+ API**
   - APIs & Services → Enable APIs
   - Activer "Google+ API"

3. **Créer des credentials OAuth 2.0**
   - APIs & Services → Credentials
   - Create Credentials → OAuth 2.0 Client ID
   - Type : Web application
   - Authorized redirect URIs : `https://votre-app.base44.app/auth/google/callback`
   - Copier Client ID et Client Secret

4. **Configurer dans l'ancien service**
   - l'ancien service Dashboard → Environment Variables
   - Ajouter `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`

### Configuration Facebook OAuth

1. **Créer une application Facebook**
   - Aller sur [developers.facebook.com](https://developers.facebook.com)
   - Créer une nouvelle application

2. **Configurer Facebook Login**
   - Add Product → Facebook Login
   - Settings → Valid OAuth Redirect URIs
   - Ajouter : `https://votre-app.base44.app/auth/facebook/callback`

3. **Obtenir les clés**
   - Settings → Basic
   - Copier App ID et App Secret

4. **Configurer dans l'ancien service**
   - l'ancien service Dashboard → Environment Variables
   - Ajouter `FACEBOOK_APP_ID` et `FACEBOOK_APP_SECRET`

**Impact** : ⚪ **Sans configuration** : L'authentification sociale ne fonctionnera pas (mais l'auth normale fonctionne)

**Priorité** : ⚪ **FAIBLE** (optionnel, l'authentification email/mot de passe fonctionne)

---

## 📋 Récapitulatif des Services Externes

| Service | l'ancien service Gère ? | Configuration Requise | Priorité |
|---------|---------------|----------------------|----------|
| **Emails (SendGrid)** | ❌ Non | Compte SendGrid + API Key | 🟡 Moyenne |
| **Push Notifications** | ❌ Non | Firebase/OneSignal + VAPID Key | ⚪ Faible |
| **Social Auth** | ❌ Non | Google OAuth + Facebook OAuth | ⚪ Faible |
| **Base de données** | ✅ Oui | Automatique via l'ancien service | ✅ OK |
| **Authentification** | ✅ Oui | Automatique via l'ancien service | ✅ OK |
| **WebSockets** | ✅ Oui | Automatique via l'ancien service | ✅ OK |
| **Stockage fichiers** | ✅ Oui | Automatique via l'ancien service | ✅ OK |

---

## 🎯 Plan d'Action pour les Services Externes

### Cette Semaine (Recommandé)

1. **SendGrid (Emails)**
   - Créer compte SendGrid (gratuit)
   - Obtenir API Key
   - Configurer dans l'ancien service

### Plus Tard (Optionnel)

2. **Push Notifications**
   - Choisir Firebase ou OneSignal
   - Configurer les clés VAPID
   - Ajouter dans `.env.local`

3. **Social Authentication**
   - Configurer Google OAuth
   - Configurer Facebook OAuth
   - Ajouter dans l'ancien service

---

## ✅ Ce que l'ancien service Gère Automatiquement

- ✅ Base de données (PostgreSQL)
- ✅ Authentification (JWT, sessions)
- ✅ API REST automatique
- ✅ WebSockets (temps réel)
- ✅ Stockage de fichiers (vidéos, images)
- ✅ Fonctions serverless
- ✅ Déploiement automatique
- ✅ Scaling automatique

---

## ❌ Ce que l'ancien service NE Gère PAS

- ❌ Envoi d'emails (besoin SendGrid/Resend/etc.)
- ❌ Push notifications (besoin Firebase/OneSignal/etc.)
- ❌ OAuth social (besoin Google/Facebook credentials)
- ❌ Paiements (besoin Stripe/Orange Money/etc.)
- ❌ SMS (besoin Twilio/etc.)

---

## 💡 Recommandation

**Pour Démarrer** :
1. ✅ l'ancien service (déjà configuré)
2. ⏳ Orange Money (demain)
3. 🟡 SendGrid (cette semaine - pour les emails)

**Pour Plus Tard** :
- Push Notifications
- Social Auth

**L'application fonctionne déjà sans ces services externes !** 🚀

