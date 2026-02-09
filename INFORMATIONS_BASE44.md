# 📋 Informations à Demander à Base44

## ✅ INFORMATIONS OBLIGATOIRES (Minimum requis)

Demandez à Base44 ces **3 informations** après avoir créé votre application :

### 1. **APP_ID** (Identifiant de l'application)
- **Où le trouver** : Dashboard Base44 → Votre application → Paramètres → App ID
- **Format** : Généralement une chaîne alphanumérique (ex: `abc123xyz456`)
- **Exemple** : `app_1234567890abcdef`

### 2. **APP_BASE_URL** (URL de base de l'application)
- **Où le trouver** : Dashboard Base44 → Votre application → Paramètres → Base URL
- **Format** : URL complète (ex: `https://votre-app.base44.app`)
- **Exemple** : `https://africonnect.base44.app`

### 3. **FUNCTIONS_VERSION** (Version des fonctions serverless)
- **Où le trouver** : Dashboard Base44 → Functions → Version
- **Format** : Généralement `v1` ou `v2`
- **Par défaut** : `v1` (si non spécifié)

---

## 📝 Template à Remplir

Après avoir obtenu les informations de Base44, remplissez ce template :

```env
# ============================================
# BASE44 CONFIGURATION (OBLIGATOIRE)
# ============================================
VITE_BASE44_APP_ID=_________________________
VITE_BASE44_APP_BASE_URL=___________________
VITE_BASE44_FUNCTIONS_VERSION=v1
```

**Exemple rempli :**
```env
VITE_BASE44_APP_ID=app_1234567890abcdef
VITE_BASE44_APP_BASE_URL=https://africonnect.base44.app
VITE_BASE44_FUNCTIONS_VERSION=v1
```

---

## 🔍 Questions à Poser à Base44

### Question 1 : "Quel est mon APP_ID ?"
- Réponse attendue : Un identifiant unique de votre application

### Question 2 : "Quel est mon APP_BASE_URL ?"
- Réponse attendue : L'URL complète de votre application Base44

### Question 3 : "Quelle version de fonctions dois-je utiliser ?"
- Réponse attendue : Généralement `v1` (ou `v2` si disponible)

---

## ⚙️ Informations Optionnelles (Pour Plus Tard)

Ces informations ne sont **PAS obligatoires** pour démarrer, mais seront utiles pour les fonctionnalités avancées :

### Paiements
- **Stripe** : Clé publique Stripe (pour paiements par carte)
- **Orange Money** : Merchant ID et API Key (pour paiements mobile money)

### Push Notifications
- **VAPID Public Key** : Pour les notifications push

### WebSocket
- **WebSocket URL** : Pour les fonctionnalités temps réel

---

## ✅ Checklist

Avant de me fournir les informations, vérifiez :

- [ ] J'ai créé un compte Base44
- [ ] J'ai créé une application dans Base44
- [ ] J'ai l'**APP_ID**
- [ ] J'ai l'**APP_BASE_URL**
- [ ] Je connais la **FUNCTIONS_VERSION** (ou je sais que c'est `v1` par défaut)

---

## 📤 Format de Réponse

Quand vous avez les informations, donnez-les moi dans ce format :

```
APP_ID: [votre_app_id]
APP_BASE_URL: [votre_app_base_url]
FUNCTIONS_VERSION: [v1 ou v2]
```

**Exemple :**
```
APP_ID: app_1234567890abcdef
APP_BASE_URL: https://africonnect.base44.app
FUNCTIONS_VERSION: v1
```

---

## 🚀 Une Fois les Informations Reçues

Je vais :
1. ✅ Créer le fichier `.env.local` avec vos credentials
2. ✅ Configurer l'application
3. ✅ Tester la connexion Base44
4. ✅ Vous confirmer que tout fonctionne

**C'est tout ce dont j'ai besoin !** 🎯

