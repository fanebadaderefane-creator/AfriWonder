# AfriWonder 🌍

**La première super-app vidéo africaine** — Connectant créateurs, commerçants et communauté.

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://postgresql.org/)
[![License](https://img.shields.io/badge/License-Propriétaire-orange.svg)](./LICENSE)

---

## 📋 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Fonctionnalités](#-fonctionnalités)
- [Stack technique](#-stack-technique)
- [Prérequis](#-prérequis)
- [Installation complète](#-installation-complète)
- [Configuration](#-configuration)
- [Lancement](#-lancement)
- [Tests](#-tests)
- [Structure du projet](#-structure-du-projet)
- [Collaboration Git](#-collaboration-git)
- [Dépannage](#-dépannage)
- [Documentation](#-documentation)
- [Contact](#-contact)

---

## 🎯 Vue d'ensemble

AfriWonder est une **super-app** développée pour le marché africain, combinant :

- **Vidéo sociale** (style TikTok) avec feed, live streaming, stories
- **Marketplace e-commerce** avec paiements mobiles (Orange Money, Wave, MTN, Stripe)
- **Services** (réservation, transport, livraison alimentaire)
- **Finance** (microcrédit, crowdfunding)
- **Éducation, emploi, civic** (pétitions, campagnes)

Le projet est **monorepo** : frontend (React/Vite) à la racine, backend (Express/Prisma) dans `backend/`.

---

## 🚀 Fonctionnalités

| Module | Description |
|--------|-------------|
| 📹 **Vidéo** | Feed, upload, likes, commentaires, playlists, challenges |
| 📺 **Live** | Streaming avec dons, cadeaux, abonnements créateurs |
| 🛒 **Marketplace** | Produits, panier, checkout, vendeurs, paiements |
| 💼 **Services** | Réservation, prestataires, disponibilités |
| 🚗 **Transport** | Courses, chauffeurs |
| 🍔 **Food** | Restaurants, menus, livraison |
| 🏥 **Télémedecine** | Rendez-vous, pharmacie |
| 🏘️ **Immobilier** | Propriétés, annonces |
| 🎫 **Billettirie** | Événements, billets |
| 💳 **Finance** | Wallet, microcrédit, crowdfunding |
| 📰 **Contenu** | Actualités, cours, emplois, civic |
| 🎮 **Gamification** | Badges, points, leaderboard |

---

## 🛠️ Stack technique

### Frontend
- **React 18** + **Vite 6**
- **React Router** v6
- **TanStack Query** (cache & API)
- **Tailwind CSS** + **Radix UI**
- **Framer Motion**
- **Socket.io-client** (temps réel)

### Backend
- **Node.js 20+** + **Express**
- **Prisma** (ORM)
- **PostgreSQL**
- **Socket.io** (WebSockets)
- **JWT** (authentification)

### Outils
- **Vitest** (tests frontend)
- **Jest** (tests backend)
- **ESLint** + **Prettier**
- **Playwright** (E2E)

---

## 📦 Prérequis

Avant de commencer, assure-toi d'avoir :

| Outil | Version | Vérification |
|-------|---------|--------------|
| **Node.js** | 20+ | `node -v` |
| **npm** | 10+ | `npm -v` |
| **Git** | 2.x | `git --version` |
| **PostgreSQL** | 15+ | `psql --version` |
| **Redis** (optionnel) | 6+ | `redis-cli ping` |

### Installation PostgreSQL (si nécessaire)

- **Windows** : [PostgreSQL Download](https://www.postgresql.org/download/windows/)
- **macOS** : `brew install postgresql@15`
- **Linux** : `sudo apt install postgresql postgresql-contrib` (Ubuntu/Debian)

### Alternative : Supabase (PostgreSQL hébergé)

Tu peux utiliser [Supabase](https://supabase.com) pour une base PostgreSQL gratuite :

1. Créer un projet Supabase
2. Récupérer l’URL de connexion dans **Settings → Database**
3. Utiliser cette URL pour `DATABASE_URL`

---

## 📥 Installation complète

### 1. Cloner le repository

```bash
git clone https://github.com/VOTRE_ORG/AfriWonder.git
cd AfriWonder
```

> Remplace `VOTRE_ORG` par l’URL réelle du dépôt GitHub.

### 2. Installer le frontend (racine)

```bash
npm install
```

### 3. Installer le backend

```bash
cd backend
npm install
cd ..
```

### 4. Créer la base PostgreSQL

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base
CREATE DATABASE afriwonder;
CREATE USER afriwonder_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE afriwonder TO afriwonder_user;
\q
```

Ou avec Supabase : la base est déjà créée.

### 5. Configurer les variables d'environnement

Voir la section [Configuration](#-configuration) ci-dessous.

### 6. Migrer la base de données

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
# Ou en dev : npx prisma migrate dev
cd ..
```

### 7. (Optionnel) Seed des données de test

```bash
cd backend
npx prisma db seed
cd ..
```

---

## ⚙️ Configuration

### Variables d'environnement

Le projet utilise **deux fichiers** `.env` : un pour le frontend, un pour le backend.

#### A. Frontend (racine du projet)

Créer `.env.local` à la racine :

```bash
cp .env.example .env.local
```

Éditer `.env.local` et remplir au minimum :

```env
# API Backend (obligatoire)
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000

# Base44 (optionnel en dev)
VITE_BASE44_APP_ID=your_app_id_here
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app

# Optionnel
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# WebRTC Calls (recommande en production mobile)
VITE_TURN_URL=turns://turn.afriwonder.com:5349?transport=tcp
VITE_TURN_USERNAME=afriwonder
VITE_TURN_CREDENTIAL=motdepassefort
```

#### B. Backend (`backend/`)

Créer `backend/.env` :

```bash
cp backend/.env.example backend/.env
```

Éditer `backend/.env` avec les valeurs **minimales** pour le développement :

```env
# ========== OBLIGATOIRE ==========
DATABASE_URL=postgresql://afriwonder_user:votre_mot_de_passe@localhost:5432/afriwonder
JWT_SECRET=changez-moi-minimum-32-caracteres-secrets-pour-jwt
JWT_REFRESH_SECRET=changez-moi-autre-secret-32-caracteres-refresh

# ========== SERVEUR ==========
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:5173

# ========== OAuth (optionnel) ==========
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/auth/facebook/callback

# ========== Redis (optionnel, pour cache & rate limit) ==========
REDIS_URL=redis://localhost:6379

# ========== Paiements (optionnel en dev) ==========
STRIPE_SECRET_KEY=
ORANGE_MONEY_MERCHANT_ID=
ORANGE_MONEY_API_KEY=
```

> Les secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`) doivent être **uniques** et **longs** (32+ caractères).

Référence complète : [docs/ENV_REFERENCE.md](./docs/ENV_REFERENCE.md)

---

## 🚀 Lancement

### Développement local

Ouvrir **deux terminaux** :

#### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

Le backend écoute sur `http://localhost:3000`.

#### Terminal 2 — Frontend

```bash
npm run dev
```

L’application est accessible sur `http://localhost:5173`.

### Build production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend (dans un autre terminal)
npm run build
npm run preview
```

---

## 🧪 Tests

```bash
# Tests frontend (Vitest)
npm test

# Tests backend (Jest)
npm run test:backend

# Tous les tests
npm run test:all

# Couverture
npm run test:coverage        # frontend
npm run test:backend:full    # backend

# E2E (Playwright)
npm run test:e2e
```

---

## 📁 Structure du projet

```
AfriWonder/
├── src/                      # Frontend React
│   ├── api/                  # Clients API
│   ├── components/           # Composants réutilisables
│   │   ├── ui/              # shadcn/ui
│   │   ├── video/           # Vidéo, live
│   │   ├── marketplace/     # E-commerce
│   │   └── common/          # Communs
│   ├── pages/               # Pages (routes)
│   ├── hooks/               # Hooks React
│   ├── lib/                 # Utilitaires, AuthContext, etc.
│   ├── contexts/            # Contextes React
│   ├── utils/               # Helpers
│   ├── App.jsx
│   ├── Layout.jsx
│   └── main.jsx
│
├── backend/                  # Backend Express
│   ├── prisma/
│   │   ├── schema.prisma    # Modèles DB
│   │   ├── migrations/      # Migrations SQL
│   │   └── seed.ts         # Données de test
│   ├── src/
│   │   ├── routes/         # Routes API
│   │   ├── services/       # Logique métier
│   │   ├── middleware/     # Auth, rate limit, etc.
│   │   ├── config/         # Configuration
│   │   ├── jobs/           # Tâches planifiées
│   │   ├── app.ts
│   │   └── index.ts
│   ├── .env
│   └── package.json
│
├── docs/                     # Documentation
├── .env.example              # Template frontend
├── package.json
├── vite.config.js
└── README.md
```

---

## 🤝 Collaboration Git

### Workflow recommandé

1. **Créer une branche** depuis `main` :

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/ma-fonctionnalite
   ```

2. **Développer** et commiter régulièrement :

   ```bash
   git add .
   git commit -m "feat: ajouter recherche produits"
   ```

3. **Pousser** la branche :

   ```bash
   git push -u origin feature/ma-fonctionnalite
   ```

4. **Ouvrir une Pull Request** sur GitHub :
   - Titre clair
   - Description des changements
   - Référence aux issues si pertinent

### Conventions de commit

| Préfixe | Usage |
|---------|-------|
| `feat:` | Nouvelle fonctionnalité |
| `fix:` | Correction de bug |
| `docs:` | Documentation |
| `style:` | Formatage (sans changement de logique) |
| `refactor:` | Refactoring |
| `test:` | Tests |
| `chore:` | Tâches diverses (deps, config) |

### Avant de push

```bash
npm run lint
npm test
npm run test:backend
```

---

## 🆘 Dépannage

### Erreur `DATABASE_URL` invalide

- Vérifier que PostgreSQL tourne : `pg_isready -h localhost`
- Vérifier l’URL dans `backend/.env` : `postgresql://user:pass@host:5432/db`

### Erreur Prisma "schema not found"

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

### Le frontend ne voit pas l’API

- Vérifier `VITE_API_URL` dans `.env.local` : `http://localhost:3000/api`
- Vérifier que le backend tourne sur le port 3000

### Login renvoie 500 (POST /api/auth/login)

En dev, le front (Vite sur 5173) envoie les requêtes `/api/*` au backend (proxy vers `localhost:3000`). Une erreur 500 signifie que le serveur Express a planté. Vérifier :

1. **Backend lancé** : `cd backend && npm run dev` (écoute sur le port 3000).
2. **Variables d'environnement** dans `backend/.env` :
   - `DATABASE_URL` : chaîne de connexion PostgreSQL (ex. Supabase).
   - `JWT_SECRET` et `JWT_REFRESH_SECRET` : secrets pour les tokens (voir `backend/ENV_TEMPLATE.txt`).
3. **Logs backend** : le message d'erreur exact s'affiche dans le terminal du backend (ex. « JWT_REFRESH_SECRET non configuré », erreur Prisma, etc.).

### Erreurs CSS dans la console (image-rendering, behavior, filter, etc.)

Les messages du type « Erreur d'analyse… » ou « Propriété inconnue » sur des lignes du document (localhost:5173) viennent souvent du **preflight Tailwind** ou d'**extensions navigateur**. Ils n'impactent en général pas le rendu. On peut les ignorer ou désactiver les extensions pour vérifier.

### Erreur CORS

- Vérifier `CORS_ORIGIN` dans `backend/.env` : `http://localhost:5173`

### Erreur Vite "doesn't provide an export named: 'default'" (lodash, eventemitter3, prop-types)

Recharts et ses dépendances sont en CommonJS. La config dans `vite.config.js` (alias lodash→lodash-es, `optimizeDeps.include`, `dedupe`) est **requise** — ne pas la supprimer. Si l'erreur revient :

```bash
# Supprimer le cache Vite puis redémarrer
rm -rf node_modules/.vite
npm run dev
```

### Redis manquant (optionnel)

Si Redis n’est pas installé, le backend peut fonctionner sans (rate limit en mémoire). Pour installer :

- **Windows** : [Redis for Windows](https://github.com/microsoftarchive/redis/releases) ou WSL
- **macOS** : `brew install redis`
- **Linux** : `sudo apt install redis-server`

### Port déjà utilisé

- Changer `PORT` dans `backend/.env` (ex. 3001)
- Changer `VITE_API_URL` et `VITE_WS_URL` dans `.env.local` en conséquence

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Architecture du projet |
| [CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Guide de contribution |
| [ENV_REFERENCE.md](./docs/ENV_REFERENCE.md) | Variables d'environnement |
| [API.md](./docs/API.md) | Endpoints API |
| [SECURITY.md](./docs/SECURITY.md) | Sécurité |
| [AGORA_SETUP.md](./docs/AGORA_SETUP.md) | Configuration live streaming |
| [WEBRTC_TURN_SETUP.md](./docs/WEBRTC_TURN_SETUP.md) | Configuration appels vocaux/video (TURN) |

---

## 📄 Licence

Propriétaire - AfriWonder © 2026

---

## 📧 Contact

- **Email** : support@afriwonder.app
- **Documentation** : dossier `docs/`

---

**Fabriqué avec ❤️ en Afrique 🌍**
