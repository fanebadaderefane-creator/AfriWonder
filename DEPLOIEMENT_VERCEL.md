# Guide de déploiement AfriWonder — Vercel + Railway

> **Si tu es bloqué** : ouvre **ETAPES_DEPLOIEMENT.md** pour les étapes détaillées. Prends une capture et envoie-la.
>
> **Fichiers** : `vercel.json`, `.vercelignore`, `backend/railway.json`, `ETAPES_DEPLOIEMENT.md`

## Architecture recommandée

| Service | Plateforme | Rôle |
|---------|-----------|------|
| **Frontend** (React/Vite) | **Vercel** | Interface utilisateur, PWA |
| **Backend** (Express/Prisma) | **Railway** | API, base de données |
| **Base de données** | **Railway PostgreSQL** ou **Neon** | Données |

---

## Étape 1 : Préparer le backend (Railway)

### 1.1 Créer un compte Railway
- Va sur [railway.app](https://railway.app)
- Connecte-toi avec GitHub

### 1.2 Créer un projet
1. **New Project** → **Deploy from GitHub repo**
2. Sélectionne ton repo AfriWonder
3. Railway détecte le monorepo → choisis **backend** comme root directory

### 1.3 Configurer la base de données
1. Dans le projet Railway : **+ New** → **Database** → **PostgreSQL**
2. Railway crée une base et fournit `DATABASE_URL`
3. Copie l’URL (elle sera injectée automatiquement)

### 1.4 Variables d’environnement backend
Dans **Variables** du service backend, ajoute :

```
# Générés par Railway
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Obligatoires
JWT_SECRET=ta-cle-secrete-min-32-caracteres-aleatoires
JWT_REFRESH_SECRET=autre-cle-secrete-min-32-caracteres
NODE_ENV=production
PORT=3000

# CORS (URL du frontend Vercel - à mettre à jour après Étape 2)
CORS_ORIGIN=https://ton-projet.vercel.app

# Phase 1 marketplace (sans paiement)
MARKETPLACE_PHASE1_NO_PAYMENT=true
```

### 1.5 Commandes de build Railway
- **Build Command** : `npm run build`
- **Start Command** : `npm run start`
- **Root Directory** : `backend`

### 1.6 Déployer
Railway déploie automatiquement. Récupère l’URL du backend (ex. `https://afriwonder-backend.up.railway.app`).

---

## Étape 2 : Déployer le frontend (Vercel)

### 2.1 Créer un compte Vercel
- Va sur [vercel.com](https://vercel.com)
- Connecte-toi avec GitHub

### 2.2 Importer le projet
1. **Add New** → **Project**
2. Importe le repo AfriWonder
3. Vercel détecte Vite automatiquement

### 2.3 Vérifier la configuration
- **Framework Preset** : Vite
- **Root Directory** : `.` (racine)
- **Build Command** : `npm run build`
- **Output Directory** : `dist`

### 2.4 Variables d’environnement frontend
Dans **Settings** → **Environment Variables** :

| Variable | Valeur | Environnement |
|----------|--------|---------------|
| `VITE_API_URL` | `https://ton-backend.railway.app/api` | Production, Preview |
| `VITE_APP_URL` | `https://ton-projet.vercel.app` | Production |
| `VITE_MARKETPLACE_PHASE1_NO_PAYMENT` | `true` | Production |

⚠️ Remplace `ton-backend.railway.app` par l’URL réelle de ton backend Railway.

### 2.5 Déployer
Clique sur **Deploy**. Vercel build et déploie.

### 2.6 Mettre à jour le backend
Retourne sur Railway et mets à jour :
```
CORS_ORIGIN=https://ton-projet.vercel.app
```
(ou ton domaine personnalisé si tu en configures un)

---

## Étape 3 : Migrations base de données

### 3.1 Exécuter les migrations
Sur ta machine locale, avec `DATABASE_URL` de production :

```bash
cd backend
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Ou via Railway : **Settings** → **Deploy** → ajoute un script post-deploy si nécessaire.

---

## Étape 4 : Déploiement automatique (CI/CD)

Une fois connecté à GitHub :
- **Vercel** : chaque push sur `main` déclenche un nouveau déploiement frontend
- **Railway** : idem pour le backend

Tu n’as plus besoin de redéployer à la main : un simple `git push` suffit.

---

## Checklist avant lancement

- [ ] Backend déployé sur Railway et accessible
- [ ] Frontend déployé sur Vercel
- [ ] `VITE_API_URL` pointe vers l’API
- [ ] `CORS_ORIGIN` contient l’URL du frontend
- [ ] Migrations Prisma exécutées
- [ ] JWT secrets définis (32+ caractères)
- [ ] Test : inscription, connexion, flux vidéos

---

## Variables optionnelles (à ajouter plus tard)

| Variable | Usage |
|----------|-------|
| `VITE_SENTRY_DSN` | Erreurs Sentry |
| `VITE_VAPID_PUBLIC_KEY` | Push notifications |
| `VITE_WS_URL` | WebSocket (messages temps réel) |
| `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA |

---

## Résumé des URLs

Après déploiement :
- **Frontend** : `https://afriwonder.vercel.app` (ou ton domaine)
- **Backend API** : `https://afriwonder-api.railway.app/api`

Les utilisateurs accèdent au frontend. Les mises à jour sont automatiques à chaque rechargement de page.
