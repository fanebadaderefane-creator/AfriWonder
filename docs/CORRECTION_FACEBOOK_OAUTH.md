# 🔧 Correction Facebook OAuth - Guide Complet

## ⚠️ Problèmes Identifiés

Vous êtes à **80% bien configuré**, mais il y a **3 points critiques** à corriger :

1. ❌ **URL incorrecte** : `http://localhost:3000/auth/facebook/callback` (sans `/api`)
2. ❌ **Faute de frappe** dans le domaine ngrok
3. ❌ **Slash final** dans "Domaines autorisés"

---

## ✅ Solution Complète

### 📋 Configuration Actuelle (Backend)

**Port du backend** : `3000` (d'après `backend/.env`)

**URI correcte dans `.env`** :
```env
FACEBOOK_REDIRECT_URI="https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback"
```

**Chemin du callback** : `/api/auth/facebook/callback` ✅

---

## 🔧 Corrections à Faire dans Facebook Developer Console

### 1️⃣ Vérifier l'URL ngrok Actuelle

**Important** : Si vous avez redémarré ngrok, l'URL a changé !

1. **Vérifiez** que ngrok tourne toujours :
   ```powershell
   # Dans le terminal où ngrok tourne
   # Vous devriez voir quelque chose comme :
   # Forwarding  https://xxxx.ngrok-free.dev -> http://localhost:3000
   ```

2. **Copiez l'URL exacte** depuis ngrok (exemple) :
   ```
   https://univitrescent-kathleen-encephalitic.ngrok-free.dev
   ```
   ⚠️ **Vérifiez** qu'il n'y a pas de faute de frappe (comme "univrtcscent" au lieu de "univitrescent")

---

### 2️⃣ Corriger "URI de redirection OAuth valides"

**Où aller** : Facebook Developer Console → "Connexion Facebook" → "Paramètres"

**Action** :

1. **Supprimez** toutes les URI incorrectes :
   - ❌ `http://localhost:3000/auth/facebook/callback` (sans `/api`)
   - ❌ Toute autre URI incorrecte

2. **Ajoutez UNIQUEMENT** cette URI (backend uniquement) :
   ```
   https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback
   ```
   
   ⚠️ **Note** : Facebook autorise automatiquement `http://localhost` en mode développement. Vous n'avez **PAS besoin** d'ajouter `http://localhost:3000/api/auth/facebook/callback` dans la liste.

   ⚠️ **Points critiques** :
   - ✅ `/api/auth/facebook/callback` (avec `/api`)
   - ✅ Port `3000` (votre backend)
   - ✅ Pas de slash final après `callback`
   - ✅ Même URL exacte que dans `backend/.env`

3. **Vérifiez** qu'il n'y a pas de faute de frappe dans le domaine ngrok

---

### 3️⃣ Corriger "Domaines autorisés pour le SDK Javascript"

**Où aller** : Même page "Paramètres"

**Action** :

1. **Supprimez** tous les domaines avec slash final :
   - ❌ `https://univrtcscent-kathleen-encephalitic.ngrok-free.dev/` (avec `/`)
   - ❌ Toute autre URL avec `https://` ou slash

2. **Ajoutez UNIQUEMENT** ces domaines (sans `https://`, sans slash) :
   ```
   localhost
   univitrescent-kathleen-encephalitic.ngrok-free.dev
   ```

   ⚠️ **Format correct** :
   - ✅ Sans `https://`
   - ✅ Sans `http://`
   - ✅ Sans slash final `/`
   - ✅ Juste le domaine : `univitrescent-kathleen-encephalitic.ngrok-free.dev`

---

### 4️⃣ Vérifier le Mode Strict

**Paramètre** : "Utiliser le mode strict pour les URI de redirection"

**Recommandation** :
- ✅ **Gardez-le activé** ("Oui") si vous voulez une sécurité maximale
- ⚠️ **Mais** : L'URL doit être **PARFAITEMENT identique** dans le code et Facebook

---

## ✅ Checklist de Vérification

Avant de sauvegarder, vérifiez :

### Dans Facebook Developer Console

- [ ] **URI de redirection OAuth valides** :
  - [ ] `https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback`
  - [ ] `http://localhost:3000/api/auth/facebook/callback`
  - [ ] ❌ **AUCUNE** autre URI (surtout pas `localhost:3000/auth/facebook/callback` sans `/api`)

- [ ] **Domaines autorisés pour le SDK Javascript** :
  - [ ] `localhost`
  - [ ] `univitrescent-kathleen-encephalitic.ngrok-free.dev`
  - [ ] ❌ **AUCUN** slash final
  - [ ] ❌ **AUCUN** `https://` ou `http://`

- [ ] **Vérification du domaine ngrok** :
  - [ ] Pas de faute de frappe (vérifiez "univitrescent" - avec un "i")
  - [ ] Correspond exactement à l'URL dans ngrok

### Dans Backend

- [ ] **`backend/.env`** :
  ```env
  FACEBOOK_REDIRECT_URI="https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback"
  PORT=3000
  ```

- [ ] **Correspondance exacte** :
  - [ ] Même protocole (`https://` pour ngrok, `http://` pour localhost)
  - [ ] Même domaine
  - [ ] Même chemin `/api/auth/facebook/callback`
  - [ ] Même port `3000` pour localhost

---

## 🎯 Configuration Recommandée (Finale)

### Facebook Developer Console

**URI de redirection OAuth valides** :
```
https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback
```

⚠️ **Note** : `http://localhost:3000/api/auth/facebook/callback` est automatiquement autorisé par Facebook en mode développement.

**Domaines autorisés pour le SDK Javascript** :
```
localhost
univitrescent-kathleen-encephalitic.ngrok-free.dev
```

### Backend `.env`

```env
PORT=3000
FACEBOOK_REDIRECT_URI="https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback"
```

---

## 📝 Ordre des Actions

1. **Vérifier** l'URL ngrok actuelle (si ngrok a été redémarré)
2. **Corriger** les URI dans Facebook Developer Console
3. **Corriger** les domaines autorisés (sans slash, sans https://)
4. **Vérifier** que `backend/.env` correspond exactement
5. **Sauvegarder** dans Facebook Developer Console
6. **Redémarrer** le backend
7. **Tester** l'authentification Facebook

---

## ⚠️ Points Critiques à Retenir

1. **Facebook redirige vers le BACKEND, jamais le frontend**
   - ✅ Backend : `http://localhost:3000/api/auth/facebook/callback`
   - ❌ Frontend : `http://localhost:5173/auth/facebook/callback`

2. **Le chemin DOIT inclure `/api`**
   - ✅ Correct : `/api/auth/facebook/callback`
   - ❌ Incorrect : `/auth/facebook/callback`

3. **Mode strict = URL parfaite**
   - Toute différence (même un caractère) bloque
   - Vérifiez caractère par caractère

4. **Domaines autorisés = format simple**
   - ✅ `localhost`
   - ✅ `univitrescent-kathleen-encephalitic.ngrok-free.dev`
   - ❌ Pas de `https://`
   - ❌ Pas de slash final

---

## 🆘 Si l'Erreur Persiste

1. **Vérifiez** que ngrok utilise toujours la même URL
2. **Comparez** caractère par caractère l'URL dans `.env` et Facebook
3. **Vérifiez** dans la console du navigateur (F12) quelle URL est envoyée
4. **Assurez-vous** que toutes les modifications ont été sauvegardées
5. **Attendez** 2-3 minutes après sauvegarde pour la propagation

---

## 📌 Note sur ngrok

Si vous redémarrez ngrok, l'URL change. Dans ce cas :

1. Copiez la nouvelle URL ngrok
2. Mettez à jour `backend/.env` avec la nouvelle URL
3. Mettez à jour Facebook Developer Console avec la nouvelle URL
4. Sauvegardez
5. Redémarrez le backend

