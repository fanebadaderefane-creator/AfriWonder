# AfriWonder — PRD et suivi d’implémentation

**Projet :** super-app africaine (vidéo courte, marketplace, services, fintech, messagerie, live).  
**Périmètre prioritaire :** application **Expo** (référence produit), backend **Express + Prisma**, PWA **Vite**, données d’audit exposées via **`GET /api/audit`** (FastAPI `backend/server.py` + `backend/product_audit.json`).

**Dernière mise à jour du document :** 12 avril 2026  
*(Référence initiale d’audit : janvier 2026.)*

---

## Problème / objectif

Aligner l’expérience mobile et les parcours critiques (admin, live, offline, monétisation, paiements) sur un backend déjà riche (routes métier, Prisma, paiements), en levant les écarts signalés par l’**audit produit** et en suivant les métriques du tableau de bord (`frontend/src/App.jsx`).

---

## Architecture (rappel)

| Couche | Stack |
|--------|--------|
| Backend principal | Express.js + TypeScript, Prisma, PostgreSQL, Socket.io, stockage (ex. R2) |
| API mobile complémentaire / proxy | FastAPI `backend/server.py` (Mongo ciblé messagerie mobile, proxy PWA, **audit JSON**) |
| Mobile | Expo, React Native, **expo-router** (`frontend/app/`), React Query, client API proxy |
| PWA audit | Vite + React (`frontend/src/App.jsx`) |

---

## Métriques clés (audit — avant / après)

| Indicateur | Avant (audit) | Après (cible documentée) |
|------------|----------------|---------------------------|
| Score global | 58/100 | **72**/100 |
| Production readiness | 42% | **65**% |
| Écrans mobile (déclarés) | 108 | **112** |
| Lignes de code mobile (ordre de grandeur) | ~25 312 | **~28 500** |
| Tests Vitest « critical-flows » | ~1 fichier isolé | **28+** scénarios de contrat (auth, feed, paiements, live, marketplace, messaging, etc.) |
| Routes backend | 115 | 115 |
| Services backend | 176 | 176 |
| Lignes schéma Prisma | 5771 | 5771 |

*Les valeurs « après » sont pilotées par `backend/product_audit.json` et affichées sur le dashboard après chargement de `/api/audit`.*

---

## Phase 1 — livrables P0 (implémentations suivies)

### 1. Console admin native mobile

- **Chemin repo :** `frontend/app/admin-dashboard.tsx`
- **Contenu attendu :** KPIs (utilisateurs, vidéos, revenus, lives, commandes, signalements), onglets (vue globale, utilisateurs, modération, finances, lives), actions de modération et vue finances.

### 2. Cadeaux virtuels pendant les lives

- **Chemin repo :** `frontend/app/live/gifts.tsx`
- **Contenu attendu :** catalogue de cadeaux, packs de pièces, envoi avec quantités, animations, appels API live (`/live/:id/gift`, wallet), commission plateforme documentée dans l’UI.

### 3. Téléchargement vidéo offline

- **Chemin repo :** `frontend/src/services/videoDownloadService.ts`  
- **Écrans :** `frontend/app/downloads.tsx`, intégration lecture `frontend/app/watch/[id].tsx`  
- **Contenu attendu :** file d’attente, quota (~2 Go), progression, métadonnées persistées, nettoyage LRU.

### 4. Live streaming (parcours mobile)

- **Chemin repo :** `frontend/app/live/stream.tsx`, stack `frontend/app/live/_layout.tsx` (`index`, `start`, `stream`, `[id]`, `replay`, `gifts`)  
- **Contenu attendu :** phases setup / live / fin, chat et likes via API, panneau cadeaux, stats de fin de session, lien replay.

### 5. Revenue sharing créateurs

- **Chemin repo :** `frontend/app/creator/revenue-share.tsx`, navigation `frontend/app/creator/_layout.tsx`  
- **Contenu attendu :** paliers, demande de monétisation (`POST /creator-dashboard/request-monetization`), retrait vers mobile money, cohérence avec `frontend/app/creator/earnings.tsx` / `withdraw.tsx`.

### 6. Paiements Orange Money (checkout mobile)

- **Chemin repo :** `frontend/app/checkout/orange-money.tsx`  
- **API réelle :** `POST /payments/orange-money/initiate` ; suivi via **`GET /payments/transactions`** (filtrage par référence / méthode), pas d’endpoint fictif `GET /payments/status/:id`.

### 7. Paiements Wave (checkout mobile)

- **Chemin repo :** `frontend/app/checkout/wave.tsx`  
- **API réelle :** **`POST /payments/wave`** avec `orderId`, `amount`, `returnUrl`, `currency` ; ouverture du lien `paymentUrl` ; polling **`GET /payments/transactions`** (méthode Wave).  
- *Le backend Wave n’expose pas de corps `phone` sur cette route : le numéro n’est pas requis côté API.*

### 8. Tests unitaires / contrats critiques

- **Chemin repo :** `frontend/src/__tests__/critical-flows.test.ts`  
- **Objectif :** mocks `apiClient`, appels alignés sur les routes réelles (auth, feed, paiements, live, marketplace, monétisation, messages, etc.).

---

## Backlog priorisé

### P0 — fait (phase 1 documentée)

- [x] Console admin mobile (écran dédié)
- [x] Cadeaux live + wallet live
- [x] Offline download + écran téléchargements
- [x] Live : chat / likes / cadeaux / replay (hors Agora prod complète)
- [x] Revenue share + retraits (parcours Expo)
- [x] Checkout Orange Money + Wave (contrats API ci-dessus)
- [x] Suite Vitest critical-flows
- [x] Données audit : `backend/product_audit.json` + `GET /api/audit`

### P1 — premier mois post-stabilisation

- [ ] `expo-camera` + **Agora** validés sur builds iOS/Android réels
- [ ] Abonnements premium / fan clubs (si non couverts par l’API existante)
- [ ] Publicité self-service PME (règles métier + modération)
- [ ] E2EE messagerie (chiffrement bout en bout audité)
- [ ] Certificate pinning / détection d’environnement compromis (selon menace)
- [ ] Mode data saver réseau faible
- [ ] Push backend : parcours complets + métriques de délivrabilité

### P2 — 3 à 6 mois

- [ ] Micro-crédit & services financiers avancés
- [ ] Mini-apps SDK + portail développeur
- [ ] AR / filtres vidéo, sous-titres, duets
- [ ] Carte services locaux enrichie
- [ ] Partenariats marques + expansion multi-pays (SN, CI, BF, GN, …)

---

## Projections revenus (ordre de grandeur — à calibrer par pays)

- Année 1 : ~50–150 M FCFA  
- Année 2 : ~500 M – 1,5 B FCFA  
- Année 3 : ~3–8 B FCFA  
- **Indicateur clé :** DAU × panier moyen × taux de commission / take rate

---

## Fichiers liés à l’audit produit

| Fichier | Rôle |
|---------|------|
| `backend/product_audit.json` | Source JSON du dashboard (scores, `implementations_done`, `features_audit`, …) |
| `backend/server.py` | Route `GET /api/audit` |
| `frontend/src/App.jsx` | UI du tableau de bord d’audit produit |
| `frontend/vite.config.mjs` | Proxy `/api` → backend FastAPI (port à aligner avec le processus local, souvent **8000**) |

---

*Ce PRD est la trace « produit / implémentation » pour l’équipe ; les chemins `/tmp/...` ou `/app/...` des brouillons externes ne s’appliquent pas au dépôt `AfriWonder` : utiliser les chemins `frontend/...` et `backend/...` ci-dessus.*
