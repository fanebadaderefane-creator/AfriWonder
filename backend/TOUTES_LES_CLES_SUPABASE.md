# 🔑 Toutes les Clés Supabase - AfriConnect Backend

## ✅ Informations Complètes Identifiées

### 📋 Identifiants Supabase

```
URL Supabase        : https://tlgpcoeadjhitwirfgrb.supabase.co
Project Ref         : tlgpcoeadjhitwirfgrb
API Key (Anon)      : sb_publishable_6fK4ds91_MCfP60plDLO5A_K5EItLCw
Mot de passe DB     : Mali@202520211215
```

### 🔗 URLs de Connexion Database

#### Format Direct (Port 5432)
```
postgresql://postgres:Mali%40202520211215@db.tlgpcoeadjhitwirfgrb.supabase.co:5432/postgres
```

#### Format Connection Pooling (Port 6543)
```
postgresql://postgres.tlgpcoeadjhitwirfgrb:Mali%40202520211215@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15
```

**⚠️ Important** : Le `@` dans le mot de passe est encodé en `%40` dans l'URL.

### 🔐 Secrets JWT

```
JWT_SECRET          : BaIr/jOjyZGmQaN3PoxBl8VBH/mDRN4mgoP+++xA4Ko=
JWT_REFRESH_SECRET  : BaIr/jOjyZGmQaN3PoxBl8VBH/mDRN4mgoP+++xA4Ko=REFRESH
JWT_EXPIRES_IN      : 7d
JWT_REFRESH_EXPIRES_IN : 30d
```

## 🚀 Création Rapide du Fichier .env

### Commande Unique

```bash
cd backend
npm run setup:env
```

Cette commande créera automatiquement le fichier `.env` avec toutes les clés Supabase configurées.

### Vérification

Après exécution, vérifier que le fichier `.env` existe :

```bash
ls -la backend/.env
```

## 📝 Contenu du Fichier .env

Le fichier `.env` créé contiendra :

```env
# Database
DATABASE_URL="postgresql://postgres:Mali%40202520211215@db.tlgpcoeadjhitwirfgrb.supabase.co:5432/postgres"

# Supabase API
SUPABASE_URL=https://tlgpcoeadjhitwirfgrb.supabase.co
SUPABASE_ANON_KEY=sb_publishable_6fK4ds91_MCfP60plDLO5A_K5EItLCw

# JWT
JWT_SECRET="BaIr/jOjyZGmQaN3PoxBl8VBH/mDRN4mgoP+++xA4Ko="
JWT_REFRESH_SECRET="BaIr/jOjyZGmQaN3PoxBl8VBH/mDRN4mgoP+++xA4Ko=REFRESH"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# ... autres variables optionnelles
```

## 📚 Fichiers de Documentation Créés

1. **`CLES_SUPABASE_RECAP.md`** - Récapitulatif complet avec toutes les clés
2. **`MIGRATION_SUPABASE_COMPLETE.md`** - Guide de migration étape par étape
3. **`create-env.js`** - Script pour créer automatiquement le `.env`
4. **`ENV_SUPABASE_CONFIGURER.txt`** - Template avec toutes les clés

## ✅ Checklist de Migration

- [x] Toutes les clés Supabase identifiées
- [x] Script de création `.env` créé
- [x] Documentation complète générée
- [ ] Fichier `.env` créé (`npm run setup:env`)
- [ ] Dépendances installées (`npm install`)
- [ ] Prisma Client généré (`npm run db:generate`)
- [ ] Tables créées (`npm run db:migrate`)
- [ ] Serveur démarré (`npm run dev`)

## 🎯 Prochaines Étapes

1. **Créer le fichier .env** :
   ```bash
   cd backend
   npm run setup:env
   ```

2. **Installer et configurer** :
   ```bash
   npm install
   npm run db:generate
   npm run db:migrate
   ```

3. **Démarrer le serveur** :
   ```bash
   npm run dev
   ```

4. **Vérifier la connexion** :
   - Ouvrir http://localhost:3000/health
   - Devrait retourner : `{"status":"ok","timestamp":"..."}`

## 🔒 Sécurité

- ✅ Fichier `.env` dans `.gitignore` (ne sera pas commité)
- ✅ Toutes les clés documentées dans ce fichier
- ⚠️ Ne jamais commiter le fichier `.env`
- ⚠️ Régénérer les JWT secrets pour la production

## 📞 Support

Pour toute question ou problème :
- Voir `CLES_SUPABASE_RECAP.md` pour le guide complet
- Voir `MIGRATION_SUPABASE_COMPLETE.md` pour la migration détaillée
- Voir `CONFIGURATION_SUPABASE.md` pour la configuration Supabase

---

**✅ Toutes les clés Supabase sont identifiées et prêtes à être utilisées !**

