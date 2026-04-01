# 🚀 Guide Configuration Supabase - Base de Données Cloud

## ✅ Pourquoi Supabase ?

- ✅ **Gratuit** jusqu'à 500 MB (parfait pour démarrer)
- ✅ **PostgreSQL géré** (pas de maintenance)
- ✅ **Sauvegardes automatiques**
- ✅ **Interface simple** (dashboard web)
- ✅ **Scalable** (passez au plan payant quand nécessaire)
- ✅ **Sécurisé** (SSL, firewall intégré)

---

## 📋 Étapes de Configuration

### 1. Créer un Compte Supabase

1. Aller sur **https://supabase.com**
2. Cliquer sur **"Start your project"**
3. Se connecter avec **GitHub** (recommandé) ou email
4. Créer une **nouvelle organisation** (si première fois)

### 2. Créer un Projet

1. Dans le dashboard, cliquer sur **"New Project"**
2. Remplir les informations :
   - **Name** : `africonnect` (ou votre nom)
   - **Database Password** : Créer un mot de passe fort (⚠️ **SAVEZ-LE**)
   - **Region** : Choisir la région la plus proche (ex: `West US`, `Europe West`)
   - **Pricing Plan** : **Free** (pour démarrer)

3. Cliquer sur **"Create new project"**
4. ⏳ Attendre 2-3 minutes (création de la base de données)

### 3. Obtenir la Connection String

Une fois le projet créé :

1. Aller dans **Settings** → **Database**
2. Scroller jusqu'à **"Connection string"**
3. Cliquer sur **"URI"** (ou "Connection pooling")
4. Copier la chaîne de connexion (format : `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`)

**Exemple** :
```
postgresql://postgres.xxxxxxxxxxxxx:VOTRE_MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

⚠️ **Important** : Remplacez `[YOUR-PASSWORD]` par le mot de passe que vous avez créé à l'étape 2.

### 4. Configurer le Backend

#### 4.1. Créer le fichier `.env` dans `backend/`

```bash
cd backend
```

Créer le fichier `.env` :

```env
# Database (Supabase)
DATABASE_URL="postgresql://postgres.xxxxxxxxxxxxx:VOTRE_MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15"

# JWT Secret (générer un secret aléatoire)
JWT_SECRET="votre_secret_jwt_tres_long_et_aleatoire_ici_minimum_32_caracteres"

# Server
PORT=3000
NODE_ENV=development

# CORS (pour le frontend)
CORS_ORIGIN=http://localhost:5173

# Services Externes (à configurer plus tard)
SENDGRID_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
ORANGE_MONEY_CLIENT_ID=
ORANGE_MONEY_CLIENT_SECRET=
STRIPE_SECRET_KEY=
```

#### 4.2. Générer JWT_SECRET

```bash
# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Ou utiliser un générateur en ligne : https://generate-secret.vercel.app/32
```

#### 4.3. Installer les Dépendances

```bash
cd backend
npm install
```

#### 4.4. Générer Prisma Client

```bash
npm run db:generate
```

#### 4.5. Créer les Tables (Migration)

```bash
npm run db:migrate
```

Quand Prisma demande un nom de migration, tapez :
```
init
```

#### 4.6. Vérifier dans Supabase

1. Aller dans **Table Editor** dans le dashboard Supabase
2. Vous devriez voir toutes les tables créées :
   - `User`
   - `Video`
   - `Like`
   - `Comment`
   - `Follow`
   - `Product`
   - `Order`
   - etc.

✅ **Base de données configurée !**

---

## 🧪 Tester la Connexion

### Option 1 : Via Prisma Studio

```bash
cd backend
npm run db:studio
```

Cela ouvre une interface web pour visualiser et éditer la base de données.

### Option 2 : Via le Backend

```bash
cd backend
npm run dev
```

Si vous voyez :
```
✅ Database connected
🚀 Server running on port 3000
```

✅ **Tout fonctionne !**

---

## 🔒 Sécurité

### Variables d'Environnement

⚠️ **NE JAMAIS** commiter le fichier `.env` :
- ✅ Déjà dans `.gitignore`
- ✅ Utiliser `.env.example` comme template

### Connection Pooling

Supabase recommande d'utiliser **Connection Pooling** pour les applications :
- URL avec `pooler.supabase.com` (déjà dans l'exemple)
- Port `6543` au lieu de `5432`

### Firewall

1. Aller dans **Settings** → **Database** → **Connection pooling**
2. Configurer les **IPs autorisées** si nécessaire
3. Pour développement local, laisser ouvert

---

## 📊 Monitoring

### Dashboard Supabase

- **Table Editor** : Voir/modifier les données
- **SQL Editor** : Exécuter des requêtes SQL
- **Database** → **Usage** : Voir l'utilisation (storage, bandwidth)
- **Logs** : Voir les logs de la base de données

### Limites Plan Gratuit

- ✅ **500 MB** de stockage
- ✅ **2 GB** de bandwidth/mois
- ✅ **500 MB** de base de données
- ✅ **2 projets** maximum

**Suffisant pour démarrer !** 🚀

---

## 🚀 Prochaines Étapes

Une fois Supabase configuré :

1. ✅ **Tester l'API** : `npm run dev` dans `backend/`
2. ✅ **Créer un utilisateur** : Via l'API `/api/auth/register`
3. ✅ **Vérifier dans Supabase** : Table Editor → `User`
4. ✅ **Continuer la migration** : Implémenter les services restants

---

## ❓ Problèmes Courants

### Erreur : "Connection refused"

- Vérifier que le mot de passe dans `DATABASE_URL` est correct
- Vérifier que le projet Supabase est actif (pas en pause)

### Erreur : "Database does not exist"

- Utiliser `postgres` comme nom de base (défaut Supabase)
- Vérifier la région dans l'URL

### Erreur : "Too many connections"

- Utiliser Connection Pooling (port `6543`)
- Vérifier que vous fermez les connexions Prisma correctement

---

## 📝 Résumé

✅ **Supabase** = Base de données PostgreSQL dans le cloud
✅ **Gratuit** jusqu'à 500 MB
✅ **Configuration** = Copier `DATABASE_URL` dans `.env`
✅ **Migration** = `npm run db:migrate`
✅ **Prêt** = Backend connecté à Supabase !

**C'est la meilleure option pour démarrer rapidement et évoluer !** 🎉

