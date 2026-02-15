# Étapes de déploiement — Si tu es bloqué, envoie une capture

> **Envoie une capture d'écran** de l'endroit où tu bloques + indique le numéro d'étape (ex. A4, B2).

---

# PARTIE A : BACKEND (Railway)

## A1. Compte Railway
1. Va sur **https://railway.app**
2. **Login** → **Login with GitHub**
3. Autorise l'accès

---

## A2. Nouveau projet
1. **New Project**
2. **Deploy from GitHub repo**
3. Si le repo n'apparaît pas : **Configure GitHub App** → autorise Railway
4. Sélectionne **AfriWonder**
5. **Deploy Now**

---

## A3. Base PostgreSQL
1. Dans le projet : **+ New**
2. **Database** → **PostgreSQL**
3. La base est créée automatiquement
4. Railway injecte `DATABASE_URL` dans ton backend

---

## A4. Configurer le service Backend
1. Clique sur le service (ton repo AfriWonder)
2. **Settings** (icône engrenage)
3. **Root Directory** : `backend`
4. **Build Command** : `npm run build`
5. **Start Command** : `npm run start`

---

## A5. Variables d'environnement
1. Onglet **Variables** du service backend
2. **+ New Variable** ou **Raw Editor**
3. Ajoute :

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=ta-cle-secrete-32-caracteres-minimum
JWT_REFRESH_SECRET=autre-cle-32-caracteres-minimum
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://placeholder.vercel.app
MARKETPLACE_PHASE1_NO_PAYMENT=true
```

⚠️ Remplace les secrets par de vraies clés (32+ caractères). `CORS_ORIGIN` sera mis à jour après Vercel.

---

## A6. URL du backend
1. Service backend → **Settings** → **Networking**
2. **Generate Domain**
3. **Copie l'URL** (ex. `https://afriwonder-xxxx.up.railway.app`)
4. Garde-la pour l'étape B4

---

## A7. Migrations Prisma
Dans un terminal sur ton PC :

```bash
cd backend
npx prisma migrate deploy
```

Tu dois avoir `DATABASE_URL` : Railway → Postgres → Variables → copie la valeur.

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

## B4. Variables d'environnement
Avant **Deploy**, ajoute :

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://xxx.up.railway.app/api` (ta URL de l'étape A6 + `/api`) |
| `VITE_APP_URL` | `https://ton-projet.vercel.app` |
| `VITE_MARKETPLACE_PHASE1_NO_PAYMENT` | `true` |

⚠️ Remplace `TON-URL-RAILWAY` par l'URL de l'étape A6 (sans `/api` — on l'ajoute dans la valeur).

---

## B5. Déployer
1. **Deploy**
2. Attends 2–3 min
3. Note l'URL (ex. `https://afriwonder-xxx.vercel.app`)

---

## B6. Mise à jour CORS
1. Retourne sur **Railway** → backend → **Variables**
2. Modifie `CORS_ORIGIN` = URL Vercel (ex. `https://afriwonder-xxx.vercel.app`)
3. Railway redéploie

---

# Vérification
Ouvre l'URL Vercel → inscris-toi → vérifie que ça marche.

---

# Si tu es bloqué
**Capture d'écran** + **numéro d'étape** (A1, A4, B2…) + **message d'erreur** (si visible).
