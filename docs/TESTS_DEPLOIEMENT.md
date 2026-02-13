# Guide des tests — AfriWonder (lancement 26 février)

Ce document liste tous les tests à exécuter avant le déploiement pour dormir tranquille.

## Prérequis

- **Base de test** : `.env.test` dans `backend/` avec `DATABASE_URL` pointant vers une base dédiée (ex. `africonnect_test` ou `afriwonder_test`)
- **PostgreSQL** : en cours d'exécution (local ou Supabase)
- **Node.js** : v18+

---

## 1. Tests Backend (Jest)

```bash
cd backend

# Appliquer les migrations sur la base de test
npm run test:db:prepare

# Tests smoke (parcours critique — ~45 s)
npm run test:smoke

# Tests complets avec couverture
npm run test:coverage
```

**Tests smoke** : Health, Register, Login, Me, Videos, Cart, Orders config, Products, Webhook validation.

**Tests qui passent actuellement** :
- `smoke.critical-path.test.ts` ✅
- `payment-webhook-security.test.ts` ✅
- `httpMetrics.service.test.ts` ✅

**Tests à stabiliser** : `order.service.test.ts`, `cdc-live.test.ts` (conflits FK / isolation).

---

## 2. Tests Frontend (Vitest)

```bash
# À la racine du projet
npm run test:coverage
```

**Mock ajouté** : `window.matchMedia` pour next-themes et PWAInstallBanner (jsdom ne le fournit pas).

---

## 3. Tests E2E (Playwright)

```bash
# Installer les navigateurs (une fois)
npx playwright install

# Lancer les tests E2E
npm run test:e2e

# Avec interface visible
npm run test:e2e:headed
```

**Prérequis** : Backend et frontend doivent tourner (ou utiliser une URL de staging).

---

## 4. Autres vérifications

### Vérifications de readiness

```bash
# Vérifier la configuration pour 1M utilisateurs
npm run verify-readiness-1m

# Vérifier la synchronisation API frontend/backend
npm run verify-api-sync

# Vérifier les pages Phase 1
npm run verify-phase1-pages
```

### Audit de sécurité

```bash
npm run security-audit
```

### Load test (k6)

```bash
cd backend
npm run load-test
```

---

## 5. Suite CI complète

```bash
# Backend + Frontend + E2E (comme en CI)
npm run test:ci
```

Ou manuellement :

```bash
npm run test:smoke --prefix backend
npm run test --prefix .
npm run test:e2e
```

---

## Checklist avant déploiement

- [ ] `npm run test:smoke --prefix backend` passe
- [ ] `npm run test --prefix .` passe (frontend)
- [ ] `npm run verify-phase1-pages` passe
- [ ] `npm run verify-api-sync` passe
- [ ] `npm run security-audit` sans erreur critique
- [ ] Tests E2E sur environnement de staging
- [ ] Clés et secrets configurés (JWT, DB, paiements, etc.)
- [ ] Docker build OK : `docker compose -f docker-compose.prod.yml build`

---

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run test:smoke --prefix backend` | Smoke backend (~45 s) |
| `npm run test:coverage --prefix backend` | Backend avec couverture |
| `npm run test:coverage` | Frontend avec couverture |
| `npm run test:e2e` | Tests E2E Playwright |
| `npm run verify-readiness-1m` | Vérif config 1M users |
| `npm run verify-phase1-pages` | Vérif pages Phase 1 |
| `npm run security-audit` | Audit sécurité |
