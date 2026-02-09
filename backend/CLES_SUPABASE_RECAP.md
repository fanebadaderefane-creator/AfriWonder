# 🔑 Récapitulatif Complet - Clés Supabase AfriConnect

## 📋 Informations Supabase Identifiées

### ✅ Identifiants du Projet

| Variable | Valeur |
|----------|--------|
| **URL Supabase** | `https://tlgpcoeadjhitwirfgrb.supabase.co` |
| **Project Ref** | `tlgpcoeadjhitwirfgrb` |
| **API Key (Anon)** | `sb_publishable_6fK4ds91_MCfP60plDLO5A_K5EItLCw` |
| **Mot de passe Database** | `Mali@202520211215` |

### 🔗 URLs de Connexion Database

#### Format Direct (Port 5432 - Développement)
```
postgresql://postgres:Mali%40202520211215@db.tlgpcoeadjhitwirfgrb.supabase.co:5432/postgres
```

#### Format Connection Pooling (Port 6543 - Production)
```
postgresql://postgres.tlgpcoeadjhitwirfgrb:Mali%40202520211215@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15
```

**⚠️ Important** : Le caractère `@` dans le mot de passe doit être encodé en `%40` dans l'URL.

## 🚀 Création du Fichier .env

### Méthode 1 : Script Automatique (Recommandé)

```bash
cd backend
npm run setup:env
```

Ce script créera automatiquement le fichier `.env` avec toutes les clés Supabase.

### Méthode 2 : Copie Manuelle

Copier le contenu de `ENV_SUPABASE_CONFIGURER.txt` dans un nouveau fichier `.env` :

```bash
cd backend
cp ENV_SUPABASE_CONFIGURER.txt .env
```

## 📝 Variables d'Environnement Configurées

### ✅ Variables Essentielles (Déjà Configurées)

```env
# Database
DATABASE_URL="postgresql://postgres:Mali%40202520211215@db.tlgpcoeadjhitwirfgrb.supabase.co:5432/postgres"

# Supabase API
SUPABASE_URL=https://tlgpcoeadjhitwirfgrb.supabase.co
SUPABASE_ANON_KEY=sb_publishable_6fK4ds91_MCfP60plDLO5A_K5EItLCw

# JWT
JWT_SECRET="BaIr/jOjyZGmQaN3PoxBl8VBH/mDRN4mgoP+++xA4Ko="
JWT_REFRESH_SECRET="BaIr/jOjyZGmQaN3PoxBl8VBH/mDRN4mgoP+++xA4Ko=REFRESH"

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### ⏳ Variables Optionnelles (À Configurer Plus Tard)

- `SENDGRID_API_KEY` - Pour l'envoi d'emails
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth Google
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` - OAuth Facebook
- `STRIPE_SECRET_KEY` - Paiements Stripe
- `ORANGE_MONEY_API_KEY` - Orange Money
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - Stockage fichiers
- `FCM_SERVER_KEY` - Notifications push

## 🔐 Sécurité

### ✅ Fichier .env Protégé

Le fichier `.env` est automatiquement ignoré par Git (déjà dans `.gitignore`).

**⚠️ Ne jamais commiter le fichier `.env` avec les clés !**

### 🔒 Clés Sensibles

- **Mot de passe Database** : `Mali@202520211215`
- **JWT Secrets** : Générés aléatoirement (à régénérer pour la production)
- **API Key** : Clé publique (Anon Key) - peut être exposée côté client

## 📊 Structure du Backend

```
backend/
├── .env                    ⚠️ À créer (utiliser npm run setup:env)
├── create-env.js           ✅ Script pour créer .env automatiquement
├── ENV_SUPABASE_CONFIGURER.txt  ✅ Template avec toutes les clés
├── MIGRATION_SUPABASE_COMPLETE.md  ✅ Guide de migration
├── CLES_SUPABASE_RECAP.md  ✅ Ce document
├── src/
│   ├── index.ts           ✅ Serveur Express + WebSocket
│   ├── config/
│   │   └── database.ts    ✅ Prisma Client
│   ├── routes/            ✅ Routes API
│   ├── services/          ✅ Services métier
│   └── middleware/        ✅ Auth + Error handling
└── prisma/
    └── schema.prisma      ✅ Schéma base de données
```

## 🚀 Étapes de Migration

### 1. Créer le Fichier .env

```bash
cd backend
npm run setup:env
```

### 2. Installer les Dépendances

```bash
npm install
```

### 3. Générer Prisma Client

```bash
npm run db:generate
```

### 4. Créer les Tables (Migration)

```bash
npm run db:migrate
# Nom de migration : "init"
```

**Alternative** : Si Prisma échoue, exécuter `migration.sql` directement dans Supabase SQL Editor.

### 5. Vérifier la Connexion

```bash
npm run dev
```

Vous devriez voir :
```
✅ Database connected
🚀 Server running on port 3000
```

## 🔍 Vérification dans Supabase

### Dashboard Supabase

1. Aller sur https://supabase.com/dashboard
2. Sélectionner le projet `tlgpcoeadjhitwirfgrb`
3. Vérifier les sections :
   - **Table Editor** - Voir les tables créées
   - **SQL Editor** - Exécuter des requêtes
   - **Settings → Database** - Voir la connection string
   - **Settings → API** - Voir les clés API

### Tables Attendues

Après migration, vous devriez avoir :
- ✅ `User`
- ✅ `Video`
- ✅ `Like`
- ✅ `Comment`
- ✅ `Follow`
- ✅ `Save`
- ✅ `ViewHistory`
- ✅ `Product`
- ✅ `Order`
- ✅ `OrderItem`
- ✅ `Notification`

## 🐛 Dépannage

### Erreur : "Can't reach database server"

**Solutions** :
1. Vérifier que le projet Supabase est actif (pas en pause)
2. Vérifier le mot de passe dans `DATABASE_URL` (avec `%40` pour `@`)
3. Essayer le format Connection Pooling (port 6543)
4. Vérifier l'URL depuis le dashboard Supabase

### Erreur : "Authentication failed"

**Solution** : Vérifier que le mot de passe dans `DATABASE_URL` est correct :
- Mot de passe : `Mali@202520211215`
- Dans l'URL : `Mali%40202520211215` (le `@` devient `%40`)

### Erreur : "Database does not exist"

**Solution** : Utiliser `postgres` comme nom de base (défaut Supabase)

## 📚 Documentation Complémentaire

- `MIGRATION_SUPABASE_COMPLETE.md` - Guide complet de migration
- `CONFIGURATION_SUPABASE.md` - Configuration détaillée
- `INSTRUCTIONS_SIMPLES.md` - Instructions simplifiées
- `migration.sql` - Script SQL pour migration directe

## ✅ Checklist de Migration

- [ ] Fichier `.env` créé (`npm run setup:env`)
- [ ] Dépendances installées (`npm install`)
- [ ] Prisma Client généré (`npm run db:generate`)
- [ ] Tables créées (`npm run db:migrate` ou SQL direct)
- [ ] Connexion testée (`npm run dev`)
- [ ] Tables vérifiées dans Supabase Dashboard
- [ ] API testée (health check : `GET /health`)

---

**🎉 Toutes les clés Supabase sont identifiées et documentées !**

**Prochaine étape** : Exécuter `npm run setup:env` pour créer le fichier `.env` et démarrer la migration.

