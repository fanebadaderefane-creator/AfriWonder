# Audit Expo React Native vs backend PWA (AfriWonder)

Document de synthèse : runtime, cartographie des appels API, parité feed, écrans encore partiellement mockés. Mis à jour lors de l’implémentation du plan d’audit (avril 2026). **Branchement avril 2026** : montures Express supplémentaires sous `/api/proxy/*` (payments, messages, crowdfunding, live, ads, creator-dashboard, withdrawals, posts, moderation) et bascule des écrans Expo listés dans la section 3 vers `apiClient` (plus d’appels fonctionnels à `/mobile/*` hors auth `mobileClient`).

## 1. Runtime cible (`npm run dev` / production)

| Composant | Rôle | Script / entrée |
|-----------|------|-----------------|
| **API principale** | Express + Prisma, port `3000` par défaut | [`backend/package.json`](backend/package.json) : `dev` → `tsx watch src/index.ts`, `start` → `dist/index.js` |
| **PWA** | Vite, proxy vers l’API | Racine [`package.json`](package.json) : `dev` lance `npm run dev --prefix backend` + Vite |
| **Expo** | App dans [`frontend/`](frontend/) | [`frontend/package.json`](frontend/package.json) : `expo start` |

**Conclusion** : la stack officielle de développement et de build backend est **Node uniquement** (`backend/src/app.ts`). Le fichier [`backend/server.py`](backend/server.py) expose de nombreuses routes historiques **`/api/mobile/*`** (style ancien proxy Python) ; il **n’est pas** lancé par `npm run dev` à la racine du monorepo. Tant qu’aucun reverse-proxy ou second processus n’expose ces routes sur la même origine que l’app Expo, les appels **`/api/mobile/*`** depuis `mobileApiClient` **ne sont pas** servis par le serveur Node standard.

## 2. Clients HTTP Expo

| Fichier | `baseURL` | Usage |
|---------|-----------|--------|
| [`frontend/src/api/client.ts`](frontend/src/api/client.ts) | `{backend}/api/proxy` | Vidéos, users, products, search, upload, **feed**, **notifications**, **payments**, **messages**, **crowdfunding**, **live**, **ads**, **creator-dashboard**, **withdrawals**, **posts**, **moderation** |
| [`frontend/src/api/mobileClient.ts`](frontend/src/api/mobileClient.ts) | `{backend}/api` | Auth `POST/GET /proxy/auth/*`, routes « racine » `/posts`, `/live`, `/moderation/...`, et tout préfixe **`/mobile/...`** → URL **`/api/mobile/...`** |

Les alias **`/api/proxy/*`** sont définis dans [`backend/src/app.ts`](backend/src/app.ts) (voir fichier : auth, upload, vidéos, users, products, search, **feed**, **notifications**, **payments**, **messages**, **crowdfunding**, **live**, **ads**, **creator-dashboard**, **withdrawals**, **posts**, **moderation**, puis catch-all `proxyRoutes`).

## 3. Cartographie `mobileApiClient` → backend Node (`backend/src`)

| Appel Expo (path relatif à `/api`) | URL complète | Statut Node Express |
|-----------------------------------|----------------|---------------------|
| `/proxy/auth/login`, `register`, `logout`, `me`, `refresh` | `/api/proxy/auth/*` | Monté (alias de `/api/auth`) |
| `/proxy/users?limit=50` | `/api/proxy/users` | Monté |
| `/posts` (GET/POST/DELETE) | `/api/posts` | Monté |
| `/live` (GET dans feed.tsx) | `/api/live` | Monté (vérifier sous-routes attendues) |
| `/moderation/report` (avec `useModerationEndpoint`) | `/api/moderation/report` | **Monté** — utiliser ce mode depuis les écrans vidéo (évite `/mobile/report`) |
| `/mobile/report` | `/api/mobile/report` | **Non monté** sur Node |
| `/mobile/wallet`, `wallet/topup`, `wallet/transfer` | `/api/mobile/wallet*` | **Non monté** — PWA : wallet via [`/api/payments/wallet`](backend/src/routes/payments.routes.ts) |
| `/mobile/conversations*` | `/api/mobile/conversations*` | **Non monté** — PWA : [`/api/messages`](backend/src/app.ts) |
| `/mobile/notifications`, `POST .../read-all` | `/api/mobile/notifications*` | **Remplacé côté Expo** par `apiClient` → `/api/proxy/notifications` (liste + `PUT /read-all`) |
| `/mobile/push-token` | `/api/mobile/push-token` | **Remplacé** par `POST /api/notifications/device-token` ([`notificationService.ts`](frontend/src/services/notificationService.ts)) |
| `/mobile/search` | `/api/mobile/search` | **Non monté** — alternative : `GET /api/proxy/search` (comme [`discover.tsx`](frontend/app/discover.tsx)) |
| `/mobile/crowdfunding` | `/api/mobile/crowdfunding` | **Non monté** — alternative : `/api/crowdfunding` |
| `/mobile/live/*` | `/api/mobile/live/*` | **Non monté** — alternative : `/api/live` |
| `/mobile/creator/*` | `/api/mobile/creator/*` | **Non monté** — alternatives : `/api/creator-dashboard`, `/api/withdrawals`, etc. (à rapprocher métier par métier) |
| `/mobile/ads/*` | `/api/mobile/ads/*` | **Non monté** — alternative : `/api/ads` |

## 4. Cartographie `apiClient` (proxy) — extraits

| Écran | Méthode + path | Backend |
|-------|----------------|---------|
| `(tabs)/index` | `GET /feed` (Pour toi), `GET /videos` (Abonnés), like, comment, view, share, follow | `feedRoutes`, `videoRoutes`, `userRoutes` via `/api/proxy/*` |
| `(tabs)/explore`, `profile`, `market`, `discover`, `create`, `product/[id]`, `messages/index` (users) | `GET/POST` videos, users, products, search | Monté sur `/api/proxy/*` |
| `notifications/index` | `GET /notifications`, `PUT /notifications/read-all` | Monté via **`/api/proxy/notifications`** |

## 5. Parité feed « Pour toi »

- **PWA** : [`api.feed.list`](src/api/expressClient.js) → `GET /api/feed` avec `items` (vidéos + pubs + top banners).
- **Expo (après alignement)** : onglet **Pour toi** → `GET /api/proxy/feed` (`apiClient.get('/feed')`), extraction des entrées `type === 'video'` pour le `FlatList` (pas de rendu in-feed ad côté RN pour l’instant).
- **Onglet Abonnés** : `GET /api/proxy/videos?page=&limit=` — aligné sur le comportement PWA « abonnements » qui utilise [`api.videos.list`](src/pages/Home.jsx) sans filtre API dédié « following only » dans cette version.

## 6. Écrans / zones encore mock ou à brancher (priorisation)

| Priorité | Zone | Détail |
|----------|------|--------|
| P0 | Tout ce qui reste en **`/api/mobile/*`** sans équivalent Node | Migrer vers `/api/*` ou `/api/proxy/*`, ou exposer un routeur Node sous `/api/mobile` |
| P1 | Wallet, messages, search mobile, live mobile, crowdfunding mobile, creator mobile | Remplacer par les routes documentées dans `backend/src/routes` + contrats PWA |
| P2 | `explore` / `wallet` fallbacks console « mock » | Garder repli UX mais viser moins de bruit une fois API stable |
| P2 | [`stories.tsx`](frontend/app/stories.tsx) | Données statiques ; brancher `/api/stories` si produit requis |
| P3 | Crowdfunding historique / dashboard | Données mock locales ; brancher `/api/crowdfunding` |
| P3 | Live replay / stream UI | Placeholders caméra ; API live Node à câbler |

## 7. Vérifications outillées

- Script [`scripts/verify-api-sync.js`](scripts/verify-api-sync.js) : contrôle des montures **`/api/proxy/feed`**, **`/api/proxy/notifications`**, et des alias listés ci-dessus dans `app.ts`.
- Après modifications : exécuter **`npm run verify:delivery`** à la racine du repo.
