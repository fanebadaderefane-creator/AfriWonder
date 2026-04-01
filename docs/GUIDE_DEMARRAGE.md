# 🚀 Guide de Démarrage - AfriConnect

## 📋 Prérequis

- ✅ Node.js 20+ installé
- ✅ Backend configuré avec `.env` dans `backend/`
- ✅ Frontend configuré avec `.env.local` à la racine

## 🎯 Démarrage en 2 Étapes

### Étape 1 : Démarrer le Backend

**Ouvrir un terminal (Terminal 1) :**

```bash
cd backend
npm run dev
```

**✅ Vérifier que le backend démarre correctement :**

Vous devriez voir ces messages :
```
🚀 Server running on port 3000
📡 WebSocket server ready
🌍 Environment: development
✅ Database connected
```

**Si vous voyez ces messages → Le backend fonctionne ! ✅**

---

### Étape 2 : Démarrer le Frontend

**Ouvrir un NOUVEAU terminal (Terminal 2) :**

```bash
# Rester à la racine du projet (pas dans backend/)
npm run dev
```

**✅ Vérifier que le frontend démarre correctement :**

Vous devriez voir :
```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Si vous voyez cette URL → Le frontend fonctionne ! ✅**

---

## 🌐 Accéder à l'Application

1. **Ouvrir votre navigateur** (Chrome, Firefox, Edge)
2. **Aller à l'adresse** : `http://localhost:5173`
3. **L'application devrait s'afficher !**

---

## 🧪 Tests de Base

### Test 1 : Vérifier que le Backend répond

**Dans votre navigateur, ouvrir :**
```
http://localhost:3000/health
```

**Résultat attendu :**
```json
{"status":"ok","timestamp":"2026-02-03T..."}
```

✅ **Si vous voyez ce JSON → Le backend répond correctement !**

---

### Test 2 : Vérifier que le Frontend communique avec le Backend

1. **Ouvrir l'application** : `http://localhost:5173`
2. **Ouvrir la Console du navigateur** : Appuyer sur `F12`
3. **Aller dans l'onglet "Console"**
4. **Vérifier qu'il n'y a pas d'erreurs rouges**

✅ **Si pas d'erreurs → La communication fonctionne !**

---

### Test 3 : Tester l'Authentification

1. **Aller sur** : `http://localhost:5173`
2. **Créer un compte** (bouton "S'inscrire" ou "Register")
3. **Remplir le formulaire** :
   - Email : `test@example.com`
   - Mot de passe : `Test123!@#`
   - Nom d'utilisateur : `testuser`
4. **Cliquer sur "S'inscrire"**

✅ **Si vous êtes redirigé vers la page d'accueil → L'authentification fonctionne !**

---

## 🔍 Vérifications dans la Console

### Console Backend (Terminal 1)

Vous devriez voir des logs comme :
```
[INFO] { level: 'info', message: 'POST /api/auth/register', ... }
[INFO] { level: 'info', message: 'GET /api/videos', ... }
```

### Console Frontend (Terminal 2)

Vous devriez voir :
```
VITE v6.x.x  ready in xxx ms
[vite] connecting...
[vite] connected.
```

### Console Navigateur (F12)

**Onglet "Network" (Réseau) :**
- Les requêtes vers `http://localhost:3000/api/...` devraient être en **vert** (succès)
- Statut **200** ou **201** = ✅ Succès
- Statut **404** ou **500** = ❌ Erreur

---

## ❌ Problèmes Courants

### Problème 1 : "Cannot connect to localhost:3000"

**Solution :**
- Vérifier que le backend est démarré (Terminal 1)
- Vérifier que vous voyez `🚀 Server running on port 3000`

### Problème 2 : "Cannot connect to localhost:5173"

**Solution :**
- Vérifier que le frontend est démarré (Terminal 2)
- Vérifier que vous voyez `Local: http://localhost:5173/`

### Problème 3 : Erreurs CORS dans la console

**Solution :**
- Vérifier que `CORS_ORIGIN=http://localhost:5173` est dans `backend/.env`
- Redémarrer le backend après modification

### Problème 4 : "Database connection failed"

**Solution :**
- Vérifier que `DATABASE_URL` est correct dans `backend/.env`
- Vérifier que Supabase est accessible

### Problème 5 : L'application se charge puis disparaît

**Solution :**
- Vérifier que `.env.local` existe à la racine avec `VITE_API_URL=http://localhost:3000/api`
- Redémarrer le frontend après création/modification de `.env.local`

---

## 📝 Checklist de Démarrage

Avant de démarrer, vérifier :

- [ ] Backend `.env` configuré avec `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`
- [ ] Frontend `.env.local` configuré avec `VITE_API_URL=http://localhost:3000/api`
- [ ] Backend démarré sur le port 3000
- [ ] Frontend démarré sur le port 5173
- [ ] Navigateur ouvert sur `http://localhost:5173`

---

## 🎯 Commandes Rapides

### Démarrer tout (2 terminaux)

**Terminal 1 (Backend) :**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend) :**
```bash
npm run dev
```

### Arrêter les serveurs

Dans chaque terminal, appuyer sur : `Ctrl + C`

### Redémarrer après modification

1. Arrêter les serveurs (`Ctrl + C`)
2. Redémarrer dans le même ordre (Backend puis Frontend)

---

## ✅ Résumé

1. **Terminal 1** : `cd backend && npm run dev` → Backend sur port 3000
2. **Terminal 2** : `npm run dev` → Frontend sur port 5173
3. **Navigateur** : `http://localhost:5173` → Application

**C'est tout ! 🎉**

