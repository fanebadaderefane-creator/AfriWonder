# Tests automatisés — Ne plus tout tester à la main

## Une commande avant chaque déploiement (smoke)

Depuis la **racine** du projet :

```bash
npm run test:all
```

- Lance le **parcours critique** backend (~30 s) : health, register, login, /me, videos, cart, orders config, products, webhook.
- Puis les tests **frontend** (Vitest).
- Si tout est vert → tu peux déployer sans refaire les tests manuels de base.

---

## Depuis le dossier backend

| Commande | Usage | Durée |
|----------|--------|--------|
| `npm run test:smoke` | Parcours critique uniquement (10 tests) | ~30 s |
| `npm run test` | Tous les tests backend | ~2–5 min |
| `npm run test:coverage` | Tous les tests + rapport de couverture | ~3–6 min |

**Prérequis** : base de test configurée une fois.

```bash
cd backend
# Une fois : créer la DB de test et appliquer les migrations
npm run test:db
# Ensuite
npm run test:smoke
```

---

## Ce qui est couvert par les tests (plus besoin de le faire à la main)

**1. SOCIAL & CONTENU** — Feed vidéos, live + gifts, stories/saves, communautés, messagerie, playlists  
→ `videos.test.ts`, `live.test.ts`, `saves.test.ts`, `communities.test.ts`, `messages.test.ts`, `comments.test.ts`

**2. E-COMMERCE** — Marketplace, services locaux, réservations, panier, wishlist, seller dashboard, reviews  
→ `products.test.ts`, `cart.test.ts`, `orders.test.ts`, `reviews.test.ts`, `seller.test.ts`, `services.test.ts`, `providers.test.ts`, `bookings.test.ts`, `marketplace.test.ts`

**3. ÉDUCATION** — Cours, certifications, enrollments, instructeurs  
→ `courses.test.ts`, `certificates.test.ts`

**4. EMPLOI** — Job board, candidatures, post jobs  
→ `jobs.test.ts`

**5. FINANCE** — Wallet, crowdfunding, microcrédit, transactions  
→ `payments.test.ts`, `crowdfunding.test.ts`, `microcredit.test.ts`

**6. CIVIC / SOCIÉTÉ** — Pétitions, news, events  
→ `civic.test.ts`, `news.test.ts`, `events.test.ts`

**7. GAMIFICATION** — Badges, points, challenges, leaderboard  
→ `challenges.test.ts`, `leaderboard.test.ts`

**8. TECH** — Admin dashboard, platform, health, auth, sécurité  
→ `admin.test.ts`, `platform.test.ts`, `health.test.ts`, `auth.test.ts`, `security.test.ts`, `users.test.ts`

**Smoke (parcours critique)** — `smoke.critical-path.test.ts` : health → auth → videos → cart → orders config → products → webhook.

---

## Stratégie : quand lancer quoi

| Moment | Commande | Pourquoi |
|--------|----------|----------|
| Avant chaque déploiement | `npm run test:all` (ou `npm run test:smoke` dans backend) | Vérifier que le cœur de l’app fonctionne sans tout tester à la main. |
| Après une grosse feature | `cd backend && npm run test` | S’assurer qu’aucun test existant ne casse. |
| Avant une release | `cd backend && npm run test:coverage` puis `npm run test:coverage` (frontend) | Voir la couverture et les régressions. |
| En dev (optionnel) | `cd backend && npm run test:watch` | Lancer les tests en continu pendant que tu codes. |

---

## Résumé

- **Tu ne dois plus tout tester manuellement** : le smoke + la suite backend couvrent auth, vidéos, panier, commandes, paiements, admin, santé, sécurité, etc.
- **Une commande** : `npm run test:all` (depuis la racine) = smoke backend + tests frontend.
- **Détail des tests backend** : voir `backend/__tests__/README_QA_TESTS.md`.
