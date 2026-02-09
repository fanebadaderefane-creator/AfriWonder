# 🔧 SOLUTION RAPIDE - Exécuter ces commandes

## Problèmes résolus
1. ✅ Script setup-legal-system.js corrigé (ES modules)
2. ⚠️ Migration Prisma à corriger

## 📝 COMMANDES À EXÉCUTER MAINTENANT

Dans votre terminal PowerShell, depuis `backend/` :

### Option 1 : Push direct (RECOMMANDÉ pour développement)

```powershell
# 1. Push le schema à la base de données
npx prisma db push --accept-data-loss

# 2. Générer le client Prisma
npx prisma generate

# 3. Configurer le système légal
node scripts/setup-legal-system.js

# 4. Démarrer le backend
npm run dev
```

### Option 2 : Si Option 1 échoue encore

```powershell
# 1. Réinitialiser complètement (⚠️ PERD LES DONNÉES)
npx prisma migrate reset --force

# 2. Créer une nouvelle migration propre
npx prisma migrate dev --name init_with_legal_system

# 3. Configurer le système légal
node scripts/setup-legal-system.js

# 4. Démarrer
npm run dev
```

## ✅ Vérification

Après exécution, vous devriez voir :
- ✅ Tables créées dans la base
- ✅ Documents légaux créés
- ✅ Informations légales configurées
- ✅ Politiques de rétention initialisées

## 🚀 Ensuite

1. Démarrez le frontend : `npm run dev` (depuis la racine)
2. Testez : `http://localhost:5173`
3. La bannière cookies devrait apparaître !

## ❓ En cas de problème

Si vous voyez encore des erreurs de migration, ouvrez le fichier :
`MIGRATION_FIX.md` pour des solutions avancées.
