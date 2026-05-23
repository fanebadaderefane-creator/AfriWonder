# ✅ Configuration Supabase - Backend AfriConnect

## 📋 Informations Supabase

- **URL** : https://tlgpcoeadjhitwirfgrb.supabase.co
- **Project Ref** : tlgpcoeadjhitwirfgrb
- **API Key** : sb_publishable_6fK4ds91_MCfP60plDLO5A_K5EItLCw
- **Mot de passe** : Mali@202520211215

## 🔧 Configuration

### 1. Obtenir la DATABASE_URL depuis Supabase

1. Aller sur **https://supabase.com/dashboard**
2. Sélectionner votre projet
3. Aller dans **Settings** → **Database**
4. Scroller jusqu'à **"Connection string"**
5. Cliquer sur **"URI"** (ou "Connection pooling")
6. Copier la chaîne de connexion

**Format attendu** :
```
postgresql://postgres:[YOUR-PASSWORD]@db.tlgpcoeadjhitwirfgrb.supabase.co:5432/postgres
```

**Important** : Remplacer `[YOUR-PASSWORD]` par `Mali@202520211215`

⚠️ **Note** : Le caractère `@` dans le mot de passe doit être encodé en `%40` dans l'URL.

### 2. Mettre à jour le fichier `.env`

1. Ouvrir `backend/.env`
2. Mettre à jour la ligne `DATABASE_URL` avec l'URL copiée depuis Supabase
3. Remplacer `[YOUR-PASSWORD]` par `Mali%40202520211215` (le @ est encodé en %40)

**Exemple** :
```env
DATABASE_URL="postgresql://postgres:Mali%40202520211215@db.tlgpcoeadjhitwirfgrb.supabase.co:5432/postgres"
```

### 3. Tester la Connexion

```bash
cd backend
npm run db:migrate
```

Si vous voyez :
```
✔ Applied migration `20240101000000_init`
```

✅ **La connexion fonctionne !**

## 🚀 Prochaines Étapes

Une fois la connexion établie :

1. ✅ **Générer Prisma Client** : `npm run db:generate` (déjà fait)
2. ✅ **Créer les tables** : `npm run db:migrate`
3. ✅ **Démarrer le serveur** : `npm run dev`

## ❓ Problèmes Courants

### Erreur : "Can't reach database server"

**Solutions** :
1. Vérifier que le projet Supabase est actif (pas en pause)
2. Vérifier que le mot de passe est correct
3. Utiliser l'URL depuis le dashboard Supabase (copier-coller exact)
4. Essayer le format Connection Pooling (port 6543)

### Erreur : "Authentication failed"

**Solution** : Vérifier que le mot de passe dans `DATABASE_URL` est correct (avec `%40` pour `@`)

### Erreur : "Database does not exist"

**Solution** : Utiliser `postgres` comme nom de base (défaut Supabase)

---

## ✅ État Actuel

- ✅ Fichier `.env` créé
- ✅ Prisma Client généré
- ⏳ Migration en attente (nécessite DATABASE_URL correcte depuis Supabase)

**Action requise** : Obtenir la `DATABASE_URL` depuis le dashboard Supabase et mettre à jour `backend/.env`



