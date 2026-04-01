# 🧪 GUIDE DE TEST COMPLET - AFRICONNECT

**Date** : 3 Février 2026  
**Status** : ⚠️ En cours - Problème de connexion DB à résoudre

---

## 🔴 PROBLÈME IDENTIFIÉ

### Erreur de Connexion Base de Données

```
[ERROR] Database connection failed
PrismaClientInitializationError: Error querying the database: 
FATAL: Tenant or user not found
```

**Cause** : La DATABASE_URL dans `backend/.env` n'est pas correcte ou le format utilisateur est incorrect.

---

## ✅ SOLUTION

### Option 1 : Utiliser le Format Direct (Port 5432)

Modifier `backend/.env` :

```env
DATABASE_URL="postgresql://postgres:Mali%40202520211215@db.tlgpcoeadjhitwirfgrb.supabase.co:5432/postgres"
```

### Option 2 : Utiliser le Format Pooling (Port 6543)

Modifier `backend/.env` :

```env
DATABASE_URL="postgresql://postgres.tlgpcoeadjhitwirfgrb:Mali%40202520211215@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15"
```

**⚠️ Important** : 
- Le `@` dans le mot de passe doit être encodé en `%40`
- Mot de passe : `Mali@202520211215` → `Mali%40202520211215`

---

## 🚀 ÉTAPES POUR LANCER LES TESTS

### 1. Corriger la DATABASE_URL

```bash
cd backend
# Éditer .env et corriger DATABASE_URL
```

### 2. Vérifier la Connexion

```bash
cd backend
npm run db:migrate
```

Si ça fonctionne, vous verrez :
```
✔ Applied migration `...`
```

### 3. Démarrer le Backend

```bash
cd backend
npm run dev
```

Attendre de voir :
```
✅ Database connected
🚀 Server running on port 3000
📡 WebSocket server ready
```

### 4. Démarrer le Frontend (Terminal séparé)

```bash
npm run dev
```

Attendre de voir :
```
VITE ready in XXX ms
➜ Local: http://localhost:5173/
```

### 5. Exécuter les Tests API

```powershell
powershell -ExecutionPolicy Bypass -File test-api.ps1
```

---

## 📋 TESTS À EFFECTUER

### ✅ Tests Backend (API)

1. **Health Check**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Authentification**
   - Register
   - Login
   - Get Me
   - Refresh Token

3. **Vidéos**
   - List
   - Create
   - Get by ID
   - Update
   - Like
   - Comment

4. **Produits**
   - List
   - Create
   - Get by ID
   - Update

5. **Commandes**
   - Create
   - List
   - Get by ID

6. **Notifications**
   - List
   - Mark as read

7. **Saves**
   - Toggle like
   - Toggle save
   - Toggle follow

### ✅ Tests Frontend

1. **Pages**
   - `/` - Accueil
   - `/videos` - Vidéos
   - `/marketplace` - Marketplace
   - `/product/:id` - Produit
   - `/profile` - Profil

2. **Fonctionnalités**
   - Inscription
   - Connexion
   - Navigation
   - Upload vidéo
   - Achat produit

### ✅ Tests Synchronisation

1. **CORS**
   - Vérifier headers CORS
   - Vérifier credentials

2. **API Client**
   - Vérifier `expressClient.js`
   - Vérifier intercepteurs
   - Vérifier refresh token

3. **WebSocket**
   - Connexion
   - Événements temps réel

---

## 📊 RÉSULTATS ATTENDUS

### Backend ✅
- [ ] Serveur démarre sur port 3000
- [ ] Base de données connectée
- [ ] Toutes les routes répondent
- [ ] WebSocket fonctionne

### Frontend ✅
- [ ] Serveur démarre sur port 5173
- [ ] Pages se chargent
- [ ] API calls fonctionnent
- [ ] Navigation fluide

### Synchronisation ✅
- [ ] CORS configuré
- [ ] Tokens gérés
- [ ] Erreurs gérées
- [ ] WebSocket connecté

---

## 🐛 DÉPANNAGE

### Backend ne démarre pas

1. Vérifier que le port 3000 est libre
2. Vérifier la DATABASE_URL
3. Vérifier les dépendances : `npm install`

### Frontend ne démarre pas

1. Vérifier que le port 5173 est libre
2. Vérifier `.env.local` existe
3. Vérifier les dépendances : `npm install`

### Erreur CORS

Vérifier `backend/.env` :
```env
CORS_ORIGIN=http://localhost:5173
```

### Erreur 401 (Unauthorized)

Vérifier que le token est bien envoyé dans les headers :
```javascript
Authorization: Bearer YOUR_TOKEN
```

---

## 📝 FICHIERS DE TEST CRÉÉS

1. ✅ `test-api.ps1` - Script PowerShell de test API
2. ✅ `test-complete.js` - Script Node.js de test complet
3. ✅ `RAPPORT_TEST_COMPLET.md` - Rapport détaillé
4. ✅ `GUIDE_TEST_COMPLET.md` - Ce guide

---

## 🎯 PROCHAINES ÉTAPES

1. ✅ Corriger DATABASE_URL
2. ✅ Démarrer backend
3. ✅ Démarrer frontend
4. ✅ Exécuter tests API
5. ✅ Tester frontend manuellement
6. ✅ Vérifier synchronisation
7. ✅ Documenter résultats

---

**Une fois la DATABASE_URL corrigée, relancer les tests !** 🚀

