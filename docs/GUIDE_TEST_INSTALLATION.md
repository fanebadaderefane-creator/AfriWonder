# 🧪 Guide de Test - Installation PWA AfriConnect

## ✅ Tests Automatiques Réussis

Tous les tests automatiques sont passés avec succès :
- ✅ **36 tests réussis**
- ✅ **0 erreur**
- ✅ Configuration PWA complète

---

## 🚀 Méthodes de Test

### Méthode 1 : Test en Développement (Recommandé)

#### Étape 1 : Démarrer le serveur de développement

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:5173` et est accessible depuis votre réseau local.

#### Étape 2 : Trouver votre adresse IP

**Windows PowerShell :**
```powershell
ipconfig | findstr IPv4
```

**Linux/Mac :**
```bash
ifconfig | grep inet
```

Vous obtiendrez quelque chose comme : `192.168.1.100`

#### Étape 3 : Tester sur Mobile

**Sur Android :**
1. Ouvrez **Chrome** sur votre téléphone Android
2. Allez sur : `http://192.168.1.100:5173` (remplacez par votre IP)
3. Attendez que la page charge
4. Menu (⋮) en haut à droite
5. Cliquez sur **"Installer l'application"** ou **"Ajouter à l'écran d'accueil"**
6. Confirmez l'installation
7. ✅ L'icône apparaît sur l'écran d'accueil !

**Sur iPhone/iPad :**
1. Ouvrez **Safari** sur votre iPhone/iPad
2. Allez sur : `http://192.168.1.100:5173` (remplacez par votre IP)
3. Attendez que la page charge
4. Cliquez sur le bouton **Partager** (□↑) en bas
5. Faites défiler et cliquez sur **"Sur l'écran d'accueil"**
6. Personnalisez le nom si vous voulez
7. Cliquez sur **"Ajouter"**
8. ✅ L'icône apparaît sur l'écran d'accueil !

---

### Méthode 2 : Test en Production (Build)

#### Étape 1 : Construire l'application

```bash
npm run build
```

#### Étape 2 : Prévisualiser le build

```bash
npm run preview
```

Le serveur démarre sur `http://localhost:4173`

#### Étape 3 : Tester sur Mobile

Suivez les mêmes étapes que la Méthode 1, mais utilisez le port `4173` au lieu de `5173`.

---

### Méthode 3 : Test avec Serveur HTTP Simple

#### Option A : Avec Python

```bash
# Après npm run build
cd dist
python -m http.server 8080
```

Puis accédez à `http://VOTRE_IP:8080` sur mobile.

#### Option B : Avec Node.js (http-server)

```bash
# Installer http-server globalement
npm install -g http-server

# Après npm run build
cd dist
http-server -p 8080 --host 0.0.0.0
```

---

## 🔍 Vérifications dans le Navigateur

### Chrome DevTools (Desktop)

1. Ouvrez l'application dans Chrome
2. Appuyez sur **F12** pour ouvrir DevTools
3. Allez dans l'onglet **Application**

#### Vérifier le Manifest
- **Application** → **Manifest**
  - ✅ Doit afficher "AfriConnect - Plateforme Sociale Africaine"
  - ✅ Doit montrer 9 icônes
  - ✅ Ne doit pas avoir d'erreurs en rouge

#### Vérifier le Service Worker
- **Application** → **Service Workers**
  - ✅ Doit afficher "activated and is running"
  - ✅ Status: activated
  - ✅ Source: `/service-worker.js`

#### Vérifier le Cache
- **Application** → **Storage** → **Cache Storage**
  - ✅ Doit avoir un cache nommé `africonnect-v1`
  - ✅ Doit contenir `/` et `/index.html`

### Safari Web Inspector (iOS)

1. Sur Mac : **Safari** → **Préférences** → **Avancé** → Cocher "Afficher le menu Développement"
2. Connectez votre iPhone/iPad via USB
3. Sur iPhone : **Réglages** → **Safari** → **Avancé** → Activer "Inspecteur Web"
4. Sur Mac : **Safari** → **Développement** → Sélectionnez votre appareil
5. Vérifiez les onglets similaires à Chrome DevTools

---

## 📱 Tests par Plateforme

### ✅ Android - Checklist

- [ ] L'application s'ouvre dans Chrome
- [ ] Le menu propose "Installer l'application"
- [ ] L'installation fonctionne
- [ ] L'icône apparaît sur l'écran d'accueil
- [ ] L'application s'ouvre en mode plein écran (sans barre d'adresse)
- [ ] Le service worker est actif (vérifier dans DevTools)
- [ ] L'application fonctionne hors ligne (après première visite)

### ✅ iOS / iPhone - Checklist

- [ ] L'application s'ouvre dans Safari
- [ ] Le bouton Partager propose "Sur l'écran d'accueil"
- [ ] L'installation fonctionne
- [ ] L'icône apparaît sur l'écran d'accueil
- [ ] L'application s'ouvre en mode standalone
- [ ] La barre de statut est stylisée (noir translucide)
- [ ] L'icône est nette (pas pixelisée)

### ✅ iPad - Checklist

- [ ] L'application s'ouvre dans Safari iPad
- [ ] L'installation fonctionne
- [ ] L'icône apparaît sur l'écran d'accueil iPad
- [ ] L'application fonctionne en portrait ET paysage
- [ ] L'icône est adaptée à la taille iPad (152px ou 1024px)

---

## 🐛 Dépannage

### Le menu "Installer l'application" n'apparaît pas

**Causes possibles :**
1. ❌ Vous êtes sur `localhost` → Utilisez votre IP réseau
2. ❌ Pas de HTTPS → En production, HTTPS est requis (sauf localhost)
3. ❌ Manifest.json invalide → Vérifiez dans DevTools → Application → Manifest

**Solutions :**
- Utilisez `http://VOTRE_IP:5173` au lieu de `localhost`
- Vérifiez que le manifest.json se charge : DevTools → Network → manifest.json

### L'icône ne s'affiche pas correctement

**Causes possibles :**
1. ❌ Icône manquante → Vérifiez que toutes les icônes existent dans `/public`
2. ❌ Chemin incorrect → Vérifiez les chemins dans `manifest.json`

**Solutions :**
```bash
# Régénérer toutes les icônes
npm run generate-icons

# Vérifier que les fichiers existent
ls public/icon-*.png
```

### Le service worker ne s'enregistre pas

**Causes possibles :**
1. ❌ Vous êtes en développement sur localhost → Normal, désactivé intentionnellement
2. ❌ Service worker invalide → Vérifiez la syntaxe

**Solutions :**
- En développement : C'est normal, le service worker est désactivé sur localhost
- En production : Vérifiez la console pour les erreurs

### L'application ne fonctionne pas hors ligne

**Causes possibles :**
1. ❌ Service worker non enregistré
2. ❌ Cache non créé

**Solutions :**
- Vérifiez dans DevTools → Application → Service Workers
- Vérifiez dans DevTools → Application → Cache Storage

---

## 📊 Commandes de Test Disponibles

```bash
# Test automatique complet
npm run test-pwa

# Vérification PWA
npm run verify-pwa

# Générer les icônes
npm run generate-icons

# Build pour production
npm run build

# Prévisualiser le build
npm run preview
```

---

## ✅ Résultat Attendu

Après installation réussie :

1. ✅ **Icône sur l'écran d'accueil** avec le logo AfriConnect
2. ✅ **Application s'ouvre en mode standalone** (plein écran)
3. ✅ **Pas de barre d'adresse** visible
4. ✅ **Fonctionne hors ligne** après première visite
5. ✅ **Service worker actif** (vérifiable dans DevTools)

---

## 🎉 Succès !

Si tous les tests passent, votre application AfriConnect est **100% installable comme PWA** sur :
- ✅ Android
- ✅ iOS / iPhone  
- ✅ iPad
- ✅ Windows Mobile
- ✅ Chrome OS

**Félicitations ! 🎊**

