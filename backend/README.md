# 🚀 Backend API - AfriConnect

Backend personnalisé pour remplacer Base44.

## 📋 Prérequis

- Node.js 20+
- PostgreSQL 14+ (recommandé : **Supabase Cloud** ☁️)
- npm ou yarn

## 🚀 Installation

### 1. Configurer la Base de Données (Supabase - Recommandé)

📖 **Guide complet** : Voir `../GUIDE_SUPABASE.md` à la racine du projet

**Résumé** :
1. Créer un compte sur **https://supabase.com**
2. Créer un nouveau projet
3. Copier la `DATABASE_URL` depuis Settings → Database
4. Créer `backend/.env` avec :
   ```env
   DATABASE_URL="postgresql://postgres.xxxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
   JWT_SECRET="votre_secret_jwt_aleatoire_32_caracteres_minimum"
   PORT=3000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   ```

### 2. Installer et Configurer le Backend

```bash
# Installer les dépendances
npm install

# Générer le client Prisma
npm run db:generate

# Créer les tables dans Supabase (Migration)
npm run db:migrate
# Nom de migration : "init"

# Démarrer en développement
npm run dev
```

✅ Si vous voyez `✅ Database connected` → **Tout fonctionne !**

## 📁 Structure

```
backend/
├── src/
│   ├── index.ts           # Point d'entrée
│   ├── config/            # Configuration
│   ├── routes/            # Routes API
│   ├── services/          # Logique métier
│   ├── middleware/        # Middleware Express
│   └── utils/             # Utilitaires
├── prisma/
│   └── schema.prisma      # Schéma base de données
└── package.json
```

## 🔌 API Endpoints

### Authentification
- `POST /api/auth/register` - Créer un compte
- `POST /api/auth/login` - Se connecter
- `POST /api/auth/refresh` - Rafraîchir le token
- `GET /api/auth/me` - Obtenir l'utilisateur actuel

### Vidéos
- `GET /api/videos` - Liste des vidéos
- `GET /api/videos/:id` - Détails d'une vidéo
- `POST /api/videos` - Créer une vidéo
- `PUT /api/videos/:id` - Modifier une vidéo
- `DELETE /api/videos/:id` - Supprimer une vidéo
- `POST /api/videos/:id/like` - Liker une vidéo
- `POST /api/videos/:id/comment` - Commenter

## 🗄️ Base de Données

Utilise **Prisma** avec **PostgreSQL** (Supabase Cloud recommandé).

### Configuration Supabase

📖 **Guide détaillé** : Voir `../GUIDE_SUPABASE.md`

**Avantages** :
- ✅ Gratuit jusqu'à 500 MB
- ✅ PostgreSQL géré (pas de maintenance)
- ✅ Sauvegardes automatiques
- ✅ Interface web simple

### Migrations

```bash
# Créer une migration
npm run db:migrate

# Ouvrir Prisma Studio (interface web pour la DB)
npm run db:studio
```

## 🔐 Authentification

Utilise JWT (JSON Web Tokens).

Headers requis pour les routes protégées :
```
Authorization: Bearer <access_token>
```

## 📝 TODO

- [ ] Implémenter tous les services (users, products, orders, payments)
- [ ] Upload de fichiers (vidéos/images)
- [ ] WebSockets complets
- [ ] Migrer les 26 fonctions serverless
- [ ] Tests unitaires et d'intégration

## 🚀 Déploiement

```bash
# Build
npm run build

# Démarrer en production
npm start
```

