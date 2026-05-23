# Étapes de déploiement — Si tu es bloqué, envoie une capture

> **Déploiement cible du backend : Render** (`render.yaml`, `Dockerfile.backend`, hook GitHub `deploy-render.yml`).

> **Envoie une capture d'écran** de l'endroit où tu bloques + indique le numéro d'étape (ex. A4, B2).

---

# PARTIE A : BACKEND (Render)

## A1. Compte Render
1. Va sur **https://render.com**
2. **Get Started** → connexion (GitHub recommandé)
3. Autorise l’accès au dépôt si demandé

---

## A2. Créer le Web Service (Blueprint ou manuel)

**Option Blueprint (recommandé)**  
1. **New** → **Blueprint** → connecter le repo **AfriWonder**  
2. Render lit **`render.yaml`** (Dockerfile `Dockerfile.backend` à la racine)

**Option manuelle**  
1. **New** → **Web Service** → repo **AfriWonder**  
2. **Runtime** : Docker  
3. **Dockerfile path** : `Dockerfile.backend` (à la racine du repo)  
4. **Root directory** : laisser **vide** (le Dockerfile fait `COPY backend/...`)

---

## A3. Base PostgreSQL

- **Recommandé** : PostgreSQL managé **Supabase** (ou Neon, etc.) — tu copies la **`DATABASE_URL`** dans Render.  
- **Alternative** : **New** → **PostgreSQL** sur Render, puis copier l’**Internal Database URL** dans les variables du Web Service sous le nom **`DATABASE_URL`**.

⚠️ Le backend et Prisma attendent toujours la variable **`DATABASE_URL`** (même nom qu’en local dans `backend/.env`).

---

## A4. Variables d’environnement (Render → ton service → **Environment**)

Voir aussi **`backend/RENDER_ENV_CHECKLIST.md`** et **`backend/.env.example`**.

Minimum pour démarrer :

```
DATABASE_URL=postgresql://...   # ta chaîne Postgres (Supabase pooler ou Render Postgres)
JWT_SECRET=...                  # 32+ caractères aléatoires
JWT_REFRESH_SECRET=...          # autre secret long
NODE_ENV=production
CORS_ORIGIN=https://placeholder.vercel.app
```

- **Ne pas** définir **`PORT`** : Render l’injecte (souvent `10000`).  
- Après le déploiement Vercel, mets **`CORS_ORIGIN`** sur l’URL réelle du front (étape B6).

---

## A5. URL du backend

1. Render → service → **Settings** → **Custom Domain** ou URL par défaut `https://<service>.onrender.com`  
2. **Copie l’URL publique** (ex. `https://afriwonder.onrender.com`) pour l’étape B4

---

## A6. Migrations Prisma (local ou CI)

Avec la même **`DATABASE_URL`** que sur Render :

```bash
cd backend
npx prisma migrate deploy
```

---

# PARTIE B : FRONTEND (Vercel)

## B1. Compte Vercel
1. **https://vercel.com**
2. **Sign Up** → **Continue with GitHub**

---

## B2. Importer le projet
1. **Add New** → **Project**
2. Choisis **AfriWonder**
3. **Import**

---

## B3. Config build
- **Framework** : Vite
- **Root Directory** : vide (racine)
- **Build** : `npm run build`
- **Output** : `dist`

---

## B4. Variables d’environnement

En production, le proxy **`vercel.json`** envoie `/api/*` vers le backend Render — souvent **aucune** `VITE_API_URL` n’est nécessaire. Si tu configures le front en « API directe » :

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://TON-BACKEND.onrender.com/api` (URL étape A5 + `/api`) |
| `VITE_APP_URL` | `https://ton-projet.vercel.app` |
| `VITE_MARKETPLACE_PHASE1_NO_PAYMENT` | `true` |

---

## B5. Déployer
1. **Deploy**
2. Attends 2–3 min
3. Note l’URL (ex. `https://afriwonder-xxx.vercel.app`)

---

## B6. Mise à jour CORS

1. **Render** → Web Service backend → **Environment**
2. **`CORS_ORIGIN`** = URL Vercel (ex. `https://afriwonder-xxx.vercel.app`) — plusieurs origines possibles séparées par des **virgules**
3. Render redéploie automatiquement

---

# Vérification

Ouvre l’URL Vercel → inscris-toi → vérifie que ça marche.  
API : `https://TON-FRONT.vercel.app/api/health` doit répondre si le proxy est configuré comme dans `vercel.json`.

---

# Si tu es bloqué

**Capture d’écran** + **numéro d’étape** (A1, A4, B2…) + **message d’erreur** (si visible).

---

# Dépannage Render (build Docker)

## Erreur : `lstat .../backend: no such file or directory` (Build Failed)
- **Cause** : **Root Directory** du service pointe vers `backend` alors que le Dockerfile à la racine attend le repo complet.
- **Solution** : **Settings** → **Root Directory** → **vide** (racine du repo).  
- Le fichier **`Dockerfile.backend`** fait `COPY backend/...` depuis la racine.
