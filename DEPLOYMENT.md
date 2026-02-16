# Configuration déploiement AfriWonder

## URL API configurée dans le projet

L'URL utilisée dans la CI et le Dockerfile est : **`https://api.afriwonder.com`**

- Si tu as un domaine personnalisé `api.afriwonder.com` pointant vers Railway → utilise `https://api.afriwonder.com/api`
- Sinon, utilise l'URL Railway : `https://TON-SERVICE.up.railway.app/api` (à récupérer dans Railway → Settings → Networking)

---

## Frontend (Vercel)

### Variables d'environnement obligatoires

| Variable | Valeur | Description |
|----------|--------|-------------|
| `VITE_API_URL` | `https://api.afriwonder.com/api` | URL de l'API backend. **Sans cette variable, le frontend appelle localhost → Network Error** |

**Où configurer :** Vercel → afri-wonder → Settings → Environment Variables

**Important :** Après avoir ajouté/modifié une variable, **redéployer** le projet (Deployments → Redeploy).

---

## Backend (Railway)

### Variables d'environnement obligatoires

| Variable | Valeur | Description |
|----------|--------|-------------|
| `CORS_ORIGIN` | `https://afri-wonder.vercel.app,https://afri-wonder-*.vercel.app` | Origines autorisées (frontend Vercel). Railway accepte le wildcard `*` pour les previews. |

**Alternative si wildcard ne marche pas :**
```
https://afri-wonder.vercel.app,https://afri-wonder-e1p3fs2mw-fbf-global.vercel.app
```
(Ajouter chaque domaine Vercel utilisé)

---

## Vérification rapide

1. **Backend accessible ?** Ouvrir `https://TON-BACKEND-RAILWAY.railway.app/health` → doit retourner `{"status":"ok"}`
2. **Frontend configuré ?** Vérifier que `VITE_API_URL` est défini sur Vercel
3. **CORS OK ?** Si le backend répond mais le front affiche "Network Error", vérifier `CORS_ORIGIN` sur Railway
