# ✅ Migration SQL - Instructions Rapides

## 🎯 Problème Résolu
Le pooler Supabase est lent pour les migrations Prisma. Solution : exécuter le SQL directement dans Supabase.

## 📋 Étapes

### 1. Ouvrir Supabase SQL Editor
1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet : `tlgpcoeadjhitwirfgrb`
3. Cliquer sur **SQL Editor** dans le menu de gauche

### 2. Exécuter le Script
1. Ouvrir le fichier `backend/migration.sql`
2. **Copier tout le contenu** du fichier
3. **Coller** dans l'éditeur SQL de Supabase
4. Cliquer sur **RUN** (ou `Ctrl+Enter`)

### 3. Vérifier que les Tables sont Créées
1. Dans Supabase, aller dans **Table Editor**
2. Vous devriez voir toutes les tables :
   - User
   - Video
   - Like
   - Comment
   - Follow
   - Save
   - Product
   - Order
   - OrderItem
   - Notification
   - ViewHistory

### 4. Marquer la Migration comme Appliquée dans Prisma
Après avoir exécuté le SQL dans Supabase, exécutez :

```bash
cd backend
npx prisma migrate resolve --applied init
```

Puis créez le fichier de migration :

```bash
npx prisma migrate dev --name init --create-only
```

## ✅ Résultat Attendu

Si tout fonctionne, vous verrez :
- ✅ Toutes les tables créées dans Supabase
- ✅ Prisma Client synchronisé avec la base de données
- ✅ Backend prêt à démarrer

## 🚀 Démarrer le Backend

```bash
cd backend
npm run dev
```

Vous devriez voir :
```
✅ Database connected
🚀 Server running on port 3000
```














