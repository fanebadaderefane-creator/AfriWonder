# 🔧 CORRECTION DATABASE_URL - SOLUTION FINALE

## ⚠️ PROBLÈME ACTUEL

L'erreur `FATAL: Tenant or user not found` indique que le format utilisateur dans la DATABASE_URL n'est pas correct.

## ✅ SOLUTION RECOMMANDÉE

### Étape 1 : Obtenir la Vraie Connection String depuis Supabase

1. **Aller sur** : https://supabase.com/dashboard
2. **Sélectionner le projet** : `tlgpcoeadjhitwirfgrb`
3. **Aller dans** : Settings → Database
4. **Scroller jusqu'à** : "Connection string"
5. **Sélectionner** : "Session mode" (pas Transaction mode)
6. **Cliquer sur** : "URI" ou "Copy"
7. **Copier** la chaîne complète

### Étape 2 : Mettre à Jour le Fichier .env

**Format Général Attendu** :
```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15"
```

**Avec vos identifiants** :
- Project Ref : `tlgpcoeadjhitwirfgrb`
- Password : `Mali@202520211215` (à encoder en `%40` pour le `@`)

### Étape 3 : Formats à Essayer

#### Option A : Format Pooling avec Utilisateur Complet
```env
DATABASE_URL="postgresql://postgres.tlgpcoeadjhitwirfgrb:Mali%40202520211215@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15"
```

#### Option B : Format Direct (si Option A ne fonctionne pas)
```env
DATABASE_URL="postgresql://postgres:Mali%40202520211215@db.tlgpcoeadjhitwirfgrb.supabase.co:5432/postgres"
```

#### Option C : Format depuis Dashboard Supabase (RECOMMANDÉ)
**Copier directement depuis Supabase Dashboard** et remplacer seulement `[YOUR-PASSWORD]` par `Mali%40202520211215`

---

## 🔍 VÉRIFICATIONS IMPORTANTES

### 1. Vérifier que le Projet Supabase est Actif

- Le projet ne doit pas être en pause
- Si en pause, cliquer sur "Resume" dans le dashboard

### 2. Vérifier les Identifiants

- Project Ref : `tlgpcoeadjhitwirfgrb` ✅
- Password : `Mali@202520211215` ✅
- URL : `https://tlgpcoeadjhitwirfgrb.supabase.co` ✅

### 3. Vérifier le Format de l'URL

L'URL doit être exactement comme dans le dashboard Supabase, avec seulement le mot de passe remplacé.

---

## 📝 COMMANDE POUR CORRIGER

```powershell
cd backend

# Lire la vraie connection string depuis Supabase Dashboard
# Puis remplacer dans .env :
# Remplacer DATABASE_URL par la chaîne copiée depuis Supabase
# Remplacer [YOUR-PASSWORD] par Mali%40202520211215
```

---

## ✅ TEST APRÈS CORRECTION

```bash
cd backend
npm run dev
```

**Résultat Attendu** :
```
✅ Database connected
🚀 Server running on port 3000
📡 WebSocket server ready
```

**Si erreur persiste** :
- Vérifier que le projet Supabase n'est pas en pause
- Vérifier que la connection string est exactement comme dans le dashboard
- Essayer les autres formats (Option A, B, C)

---

## 🎯 ACTION IMMÉDIATE

**PRIORITÉ** : Obtenir la connection string directement depuis le dashboard Supabase et l'utiliser telle quelle (en remplaçant seulement le mot de passe).

C'est la méthode la plus fiable car Supabase génère la bonne URL pour votre projet spécifique.

---

**Status** : ⏳ En attente de la connection string depuis Supabase Dashboard

