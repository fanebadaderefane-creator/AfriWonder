# Performance, SEO, accessibilité & PWA — AfriWonder

Ce document résume ce qui est **en place dans le code** et ce qui reste **à valider en production** (mesures réelles).

## Déjà implémenté (code)

| Domaine | Détail |
|--------|--------|
| **Bundle** | Pages chargées à la demande (`import.meta.glob` dans `src/pages.config.glob.js`), chunks vendors dans `vite.config.js`. |
| **SEO SPA** | `NavigationTracker` + `documentSeo.js` : meta, canonical, JSON-LD `@graph` Organization + WebSite + **SearchAction**. |
| **Pages riches** | `ArticleDetails`, `Product` (JSON-LD), **News** (ItemList), **FAQ** (FAQPage). |
| **Sitemap** | Généré automatiquement avant chaque build : `npm run sitemap` ou via `npm run build` → `scripts/generate-sitemap.cjs` → `public/sitemap.xml`. Variable `SITE_URL` pour un autre domaine. |
| **robots.txt** | `public/robots.txt` (référence au sitemap). |
| **Alias SEO** | `/blog`, `/articles` → `/News` ; `/dashboard` → `/Profile` (connecté) ou `/Landing` (invité) ; `/features` → `/Discover`. Routes **News**, **ArticleDetails**, **Discover** accessibles sans compte pour le référencement / partage. |
| **API « meilleur compromis » (backend)** | Lecture publique : `GET /api/news` (liste, breaking, trending, détail `optionalAuth`, commentaires), `GET /api/videos` (`optionalAuth`), `GET /api/products`, `GET /api/users` (`optionalAuth`), `GET /api/feed` (`optionalAuth`). Écriture / préférences / premium : **auth requise**. |
| **Front invité** | `api.entities.User` → `GET /users` (Discover onglet Créateurs). Fil « Pour vous » (News) : **connexion requise** (toast + reset auto si déconnexion). |
| **PWA** | `vite-plugin-pwa` + `src/sw-custom.js`, manifest dans `vite.config.js`. |
| **HTML shell** | `index.html` : meta, JSON-LD `@graph` (Organization, WebSite+SearchAction, WebApplication), CSS critique + `img { max-width:100% }`. |
| **Images** | `OptimizedImage` : lazy-load par défaut, `decoding="async"`, hint `format=webp` seulement sur chemins API / CDN connus. |
| **Boutons** | `Button` : `title` → `aria-label` ; taille `icon` sans nom → `aria-label="Action"`. |
| **Champs** | `Input` / `Textarea` : prop `label` + `htmlFor`. `SelectTrigger` : `id`, `aria-label`, `aria-labelledby`. |
| **Chunks** | `vite.config.js` : `agora-vendor`, `three-vendor`, `pdf-export-vendor`. |

## À valider sur l’URL déployée (PSI / Lighthouse)

- **Performance ≥ 90** et **CWV** (FCP, LCP, CLS) : dépendent du **réseau**, **TTFB**, **CDN**, **poids des médias** réels, pas seulement du front.
- **Accessibilité ≥ 90** : passer Lighthouse / axe sur les écrans critiques après corrections ciblées (contraste, focus, formulaires restants).
- **Search Console** : envoi du sitemap, inspection d’URL, rendu Google.

## Audits automatisés (Lighthouse CI)

1. Build + preview local :
   ```bash
   npm run build
   npm run preview
   ```
2. Autre terminal :
   ```bash
   npm run lhci
   ```
   Desktop : `LHCI_DESKTOP=1 npm run lhci` (Unix) ou `$env:LHCI_DESKTOP="1"; npm run lhci` (PowerShell).  
   Sitespeed.io : `npm run sitespeed:local` (après preview).
3. URL de prod :
   ```bash
   set LHCI_BUILD_URL=https://afriwonder.com
   npm run lhci
   ```
   (PowerShell : `$env:LHCI_BUILD_URL="https://afriwonder.com"; npm run lhci`)

Les seuils dans `lighthouserc.cjs` sont volontairement **en avertissement** ; augmentez `minScore` vers **0.9** quand les scores PSI le confirment.

## Pistes de suite (hors ce dépôt ou itérations)

- Convertir / servir les médias en **WebP/AVIF** côté stockage ou CDN.
- **srcset** / tailles responsives pour les images LCP.
- **SSR / prerender** pour des URLs marketing si besoin d’indexation sans exécution JS.
- Passer tous les formulaires en **`label` + `Input`** (ou `aria-label` explicite).
