# Déploiement AfriWonder — Vercel + Render

Configuration actuelle pour que les utilisateurs trouvent **afriwonder.com** et puissent télécharger l’app (PWA).

---

## Comment vérifier AVANT de configurer afriwonder.com

Avant d’ajouter le domaine dans Vercel et de toucher au DNS, vous pouvez vérifier que tout est prêt. **Une fois afriwonder.com configuré, ce sera exactement la même app** que celle servie aujourd’hui sur `afri-wonder.vercel.app` (même build, même proxy API).

### 1. Lancer le script de vérification

À la racine du projet :

```bash
npm run verify-production
```

Le script vérifie :

- que le **backend Render** répond (`/health`) ;
- que le **frontend Vercel** charge (page d’accueil) ;
- que le **proxy API** fonctionne (requête vers `https://afri-wonder.vercel.app/api/health` passe par Vercel vers Render) ;
- que le **manifest PWA** est accessible (nécessaire pour « Installer l’app » / téléchargement).

Si tout est vert, vous pouvez configurer afriwonder.com en confiance.

### 2. Vérification manuelle (navigateur)

1. Ouvrir **https://afri-wonder.vercel.app** : la page s’affiche, vous pouvez naviguer.
2. Se connecter / s’inscrire : les appels API passent par le proxy (`/api`), donc le backend Render est bien utilisé.
3. Sur mobile (ou Chrome desktop) : menu « … » → **Installer l’application** / **Ajouter à l’écran d’accueil** : le manifest est pris en compte.

Si ces trois points fonctionnent, ils fonctionneront aussi sur **https://afriwonder.com** après configuration du domaine (même code, même déploiement Vercel).

### 3. Pourquoi c’est suffisant

- Vercel sert **le même projet** pour tous les domaines attachés au projet. Ajouter `afriwonder.com` ne change pas le build ni le proxy.
- Le backend (Render) accepte déjà les requêtes dont l’origine est `afriwonder.com` (CORS et protection CSRF déjà mis à jour).
- Les meta (og, twitter) pointent déjà vers `https://afriwonder.com` dans le code ; une fois le domaine actif, le partage et le référencement utiliseront la bonne URL.

---

## URLs actuelles

| Rôle      | URL actuelle                    | Domaine souhaité   |
|----------|----------------------------------|--------------------|
| Frontend | https://afri-wonder.vercel.app   | **https://afriwonder.com** |
| Backend  | https://afriwonder.onrender.com  | (pas de domaine custom nécessaire) |

## 1. Frontend (Vercel)

- **Projet** : déployé sur Vercel avec `vercel.json`.
- **Proxy API** : les requêtes vers `/api/*` sont redirigées vers `https://afriwonder.onrender.com/api/*`.
- En production, **ne pas** définir `VITE_API_URL` dans les variables d’environnement Vercel pour garder le proxy (évite CORS et expose une seule origine).

### Ajouter le domaine afriwonder.com (pour le référencement et le téléchargement)

1. Dans le dashboard Vercel : **Settings** → **Domains**.
2. Ajouter **afriwonder.com** et **www.afriwonder.com**.
3. Suivre les instructions DNS :
   - **A** : `76.76.21.21` (Vercel)
   - ou **CNAME** : `cname.vercel-dns.com` (pour `www` ou sous-domaine)

Une fois le DNS propagé, les utilisateurs qui cherchent « afriwonder.com » arriveront sur la même app que sur `afri-wonder.vercel.app`. La PWA (téléchargement / « Ajouter à l’écran d’accueil ») fonctionnera sur les deux.

## 2. Backend (Render)

- **Service** : Web Service sur Render, URL publique `https://afriwonder.onrender.com`.
- **Variables d’environnement** à configurer dans Render (à partir de `backend/.env` en local) :
  - `DATABASE_URL` (Supabase ou autre PostgreSQL)
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`
  - Optionnel : `CORS_ORIGIN` si vous avez d’autres origines (sinon le code autorise déjà `afri-wonder.vercel.app`, `afriwonder.com`, `www.afriwonder.com`).

Le CORS du backend autorise déjà :
- `https://afri-wonder.vercel.app`
- `https://afriwonder.vercel.app`
- `https://afriwonder.com`
- `https://www.afriwonder.com`
- tout `*.vercel.app`

## 3. Fichiers modifiés pour afriwonder.com

- **index.html** : meta Open Graph et Twitter pointent vers `https://afriwonder.com/` (SEO et partage).
- **backend (app.ts + index.ts)** : origines CORS mises à jour pour `afriwonder.com` et `www.afriwonder.com`.
- **.env.example** (front + backend) : commentaires mis à jour avec les URLs Vercel et Render.

## 4. Résumé pour « trouver et télécharger »

1. **Référencement** : une fois afriwonder.com configuré sur Vercel et le DNS en place, les moteurs de recherche indexeront `https://afriwonder.com`. Les meta (og, twitter) pointent déjà vers ce domaine.
2. **Téléchargement PWA** : sur `https://afriwonder.com` (ou `https://afri-wonder.vercel.app`), les utilisateurs peuvent utiliser « Ajouter à l’écran d’accueil » / « Installer l’app » (manifest et service worker sont déjà en place).
3. **Backend** : les appels passent par le proxy Vercel `/api` → Render, donc aucune configuration CORS supplémentaire n’est nécessaire côté utilisateur.

## 5. Vérification rapide

- Ouvrir https://afri-wonder.vercel.app (ou https://afriwonder.com après configuration du domaine).
- Vérifier que l’API répond : par exemple ouvrir `/api/health` via la même origine (ou l’URL Render directement).
- Sur mobile, vérifier l’option « Ajouter à l’écran d’accueil » / « Installer AfriWonder ».
