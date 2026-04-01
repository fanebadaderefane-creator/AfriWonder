# Alignement — Audit définitif AfriWonder v4 (30 mars 2026)

Référence : document **« Audit définitif AfriWonder v4 »** (analyse App.jsx, vite, SW, package.json, feed, messagerie, etc.).

Ce fichier sert de **table de correspondance** entre les exigences de l’audit et l’état du dépôt. Les statuts sont : **Fait** | **Partiel** | **À faire** | **Divergence produit** (choix volontaire différent de l’audit).

---

## Synthèse exécutive

| Domaine | État global | Commentaire court |
|--------|-------------|---------------------|
| PWA / build / deps | Partiel | `lodash`/`moment`/`three` retirés ; bundle encore volumineux ; objectif &lt;500 KB gzip reste à mesurer et à poursuivre. |
| App bootstrap | Partiel | Thème maison, `CORE_ROUTE_PRELOADS` à 3, splash logo, ErrorBoundary ; préchargements à rationaliser. |
| Feed vidéo | Divergence + partiel | L’audit propose 3 couches (skeleton → thumb → vidéo) ; le produit a privilégié **frame réelle du décodeur** sans faux calque (voir règles Cursor). Préchargement N+1/N+2 en place. |
| Messagerie | Partiel | Socket global, compression images, CDC hub ; ticks / présence / DOMPurify partout à compléter. |
| Offline / SW | Partiel | SW versionnée, OAuth exclu, LRU vidéo / images, fallback ; fusion offline déjà engagée. |
| Sécurité | Partiel | Cookies httpOnly + Bearer côté API ; DOMPurify à étendre ; rate limit côté backend à valider en prod. |
| Paiements / marketplace | À faire | Agrégateurs Mobile Money + panier optimiste (priorité métier). |

---

## Grille par sections de l’audit (code source)

### App.jsx (problèmes listés dans le PDF)

| Recommandation audit | Statut | Notes |
|---------------------|--------|--------|
| Remplacer `next-themes` | **Fait** | `AfriWonderThemeProvider` (`src/lib/afriwonder-theme.jsx`). |
| Réduire routes préchargées | **Partiel** | `CORE_ROUTE_PRELOADS = ['Discover', 'Profile', 'Inbox']` (3). Vérifier qu’il n’y a pas d’autre préchargement massif ailleurs. |
| Ne pas re-lire les tokens à chaque navigation | **À faire** | `AuthContext` / stockage : l’audit vise moins d’appels async ; à profiler. |
| Éviter les lectures plateforme inutiles à chaque navigation | **Fait** | Suppression de l’ancienne logique native et maintien d’un flux PWA web-only. |
| ErrorBoundary global | **Partiel** | `ErrorBoundary` présent ; vérifier couverture racine + message type audit. |
| Bannières offline / lent | **À faire** | Lazy mount si `!navigator.onLine` (ou équivalent). |

### vite.config.js

| Recommandation | Statut | Notes |
|----------------|--------|--------|
| Bundle &lt; 500 KB gzip | **À faire** | Mesurer avec `vite-bundle-visualizer` / CI ; réduire chunks. |
| `emptyOutDir: true` | **Fait** | Config actuelle (alignée audit). |
| `chunkSizeWarningLimit` ~200 | **Partiel** | Vérifier valeur actuelle et chunks réels. |
| Recharts / lourds en lazy | **À faire** | Manuel chunks + imports dynamiques sur pages admin/analytics. |
| Icônes `any` vs `maskable` | **Partiel** | `purpose: 'any'` et `maskable` séparés ; affiner assets si besoin. |

### sw-custom.js

| Recommandation | Statut | Notes |
|----------------|--------|--------|
| LRU / limite cache vidéo | **Partiel** | Pression stockage + évictions ; objectif 500 MB à valider. |
| Images : pas de revalidate systématique | **Partiel** | Stratégie cache-first ; TTL 24h si pas déjà fait partout. |
| Fallback HTML + Réessayer | **Fait** | Prévu dans les évolutions SW. |
| Exclure `/~oauth` | **Fait** | À maintenir lors des changements SW. |
| `SW_VERSION` injectée | **Fait** | `__AFRW_SW_VERSION__` + build. |

### package.json

| Recommandation | Statut | Notes |
|----------------|--------|--------|
| Supprimer three / moment / lodash | **Fait** (three/moment/lodash) | `lodash-es` + `date-fns` ; pas de `three`/`moment` dans deps actuelles. |
| react-quill / jspdf / html2canvas lazy | **À faire** | Toujours en deps ; charger uniquement sur routes concernées. |
| Sentry lazy après 1er paint | **À faire** | `main.jsx` : import dynamique possible. |

### Feed vidéo (§7 + checklist 6–12)

| Recommandation | Statut | Notes |
|----------------|--------|--------|
| Zéro noir (3 couches) | **Divergence produit** | Règle projet : **vraie frame vidéo**, pas shimmer/thumb CDN masquant le décodeur (feed compact). |
| scroll-snap, 100dvh | **Fait** | `Home.jsx` / `FeedVideoSlide` (respecter `video-feed-rendering-firefox.mdc`). |
| Préchargement N+1 / N+2 | **Fait** | `shouldPreload` + warm assets. |
| Pool vidéo | **Partiel** | Feed web : `videoPoolRef={null}` ; pool là où implémenté. |
| HLS natif iOS avant hls.js | **Fait** | `VideoCard` (zone audit / iOS). |

### Messagerie (§8)

| Recommandation | Statut | Notes |
|----------------|--------|--------|
| Socket global | **Fait** | `MessageSocketProvider` + hooks. |
| CDC → hub / modales | **Partiel** | `MessagingCdcHub` + lazy panels ; consolidation « 4 écrans » à finaliser. |
| Compression images | **Fait** | Chat + GroupChat (`compressImageFileForChat`). |
| Typing / présence | **Partiel** | À brancher partout + UI. |

### Appels & Live (§9)

| Recommandation | Statut | Notes |
|----------------|--------|--------|
| Agora lazy | **Partiel** | Chunk dédié ; vérifier qu’aucun import statique au boot. |
| hls.js si pas HLS natif | **Fait** | Aligné audit. |
| Reconnexion réseau | **Partiel** | `useAgora` reconnexion ; à tester end-to-end. |

### Marketplace & paiements (§10)

| Recommandation | Statut | Notes |
|----------------|--------|--------|
| Mobile Money / agrégateurs | **À faire** | Stripe seul ne couvre pas les usages ouest-africains. |
| Panier optimiste | **À faire** | State local puis sync API. |

### Notifications push (§11)

| Recommandation | Statut | Notes |
|----------------|--------|--------|
| Permission pas au démarrage | **Partiel** | `requestPermission` différé côté services ; vérifier tous les chemins. |
| `setAppBadge` | **Partiel** | SW / handlers si dispo. |
| Tags par catégorie | **À faire** | message / like / order / live. |

### Offline (§12)

| Recommandation | Statut | Notes |
|----------------|--------|--------|
| Un seul OfflineManager | **Partiel** | `offlineManager.service.js` + idb ; migration complète localforage → idb. |
| localforage supprimé | **Fait** | Plus dans `package.json` racine. |

### Sécurité (§13)

| Recommandation | Statut | Notes |
|----------------|--------|--------|
| httpOnly cookies | **Partiel** | Backend + client : cookies + Bearer ; finir login/register sans dépendre du localStorage seul si objectif strict. |
| DOMPurify partout | **À faire** | Passer sur messages, bios, titres, etc. |

### Performance (checklist 41–50)

| # | Point | Statut |
|---|--------|--------|
| 41 | react-window feed / inbox / marketplace / search | **À faire** | Lib présente ; usage à généraliser. |
| 42 | React.memo ciblé | **Partiel** | Au cas par cas. |
| 43 | CDN Afrique | **À faire** | Infra / config. |
| 44–45 | Lazy Agora / Sentry | **Partiel** | **À faire** |
| 46 | emptyOutDir | **Fait** | |
| 47 | HLS natif iOS | **Fait** | |
| 48–50 | Lighthouse, 3G, 10 appareils | **À faire** | Process QA |

---

## Checklist « 50 points » (PDF pages 16–17) — rapide

Les points **1–5** (splash, bundle, deps, lazy, preloads) : **partiellement** couverts (splash + preloads 3 + deps allégées ; bundle cible non atteinte).

Les points **6–12** feed : **partiel + divergence** sur le pattern « 3 couches » (voir ci-dessus).

**13–19** messagerie : **partiel** (socket + compression + structure CDC).

**20–26** PWA mobile : **partiel** (safe areas / nav à auditer).

**27–30** notifications : **partiel**.

**31–35** offline : **partiel**.

**36–40** sécurité : **partiel** (cookies + CORS + SW oauth ; DOMPurify / rate à compléter).

**41–50** perf / tests : **majoritairement à faire**.

---

## Prochaines étapes recommandées (ordre impact / risque)

1. **Mesure bundle** : `rollup-plugin-visualizer` ou équivalent, objectif chunks &lt; 500 KB gzip pour le chemin critique.
2. **Lazy lourds** : `jspdf`, `html2canvas`, `react-quill`, `recharts`, Sentry (lazy), vérifier Agora.
3. **DOMPurify** : audit des rendus utilisateur.
4. **Panier optimiste + Mobile Money** (métier Afrique).
5. **react-window** : Inbox, listes longues, marketplace.
6. **QA** : Lighthouse mobile, 3G throttle, appareils réels.

---

*Document généré pour aligner le dépôt et l’audit v4 ; à mettre à jour au fil des sprints.*
