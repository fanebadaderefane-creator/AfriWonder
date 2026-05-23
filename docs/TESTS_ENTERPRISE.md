# Tests Enterprise - AfriWonder

## Vue d'ensemble

| Type | Outil | Commande | Couverture |
|------|-------|----------|------------|
| Unit (backend) | Jest | `npm run test --prefix backend` | ads.service, feed |
| Unit (frontend) | Vitest | `npm run test` | Composants |
| Integration | Jest + Supertest | `npm run test --prefix backend` | ads.test, feed |
| E2E | Playwright | `npm run test:e2e` | feed-ads.spec |
| Performance | k6 | `k6 run backend/scripts/load-test.k6.js` | Feed, ads |
| Security | npm audit | `npm run security-audit` | Vulnérabilités |

## 1. Unit Tests

### Backend (Jest)
```bash
cd backend
npm run test:db:prepare
npm run test
# Ads: ads.service.test.ts, ads.test.ts
```

### Frontend (Vitest)
```bash
npm run test
npm run test:coverage
```

## 2. Integration Tests

- **ads.test.ts** : API /api/ads/*, /api/feed
- Requiert DB de test (PostgreSQL)
- `npm run test --prefix backend -- --testPathPattern=ads`

## 3. E2E (Playwright)

```bash
# Démarrer backend + frontend
# Terminal 1: cd backend && npm run dev
# Terminal 2: npm run dev

npm run test:e2e
# ou ciblé: npx playwright test feed-ads
```

**feed-ads.spec.ts** :
- GET /api/feed
- GET /api/ads/feed
- Home charge le feed
- POST /api/ads/impression, /api/ads/click

## 4. Performance (k6)

```bash
# Installer k6: https://k6.io/docs/get-started/installation/
API_URL=http://localhost:3000 k6 run backend/scripts/load-test.k6.js
API_URL=http://localhost:3000 k6 run scripts/load-test-feed.k6.js
```

Scénarios : smoke (10 VU), load (100 VU), stress (1000 VU)

## 5. Security

```bash
npm run security-audit
npm run security-audit-fix
npm audit
```

## 6. Vérifications connectivité

```bash
# Backend doit être démarré
npm run verify-ads-feed
npm run verify-api-sync
```

## 7. CI/CD (GitHub Actions)

- **test-backend** : Jest + coverage
- **test-frontend** : Vitest + build
- **test-e2e** : Playwright (backend + frontend démarrés)
- **security-audit** : npm audit
- **security-scan** : Snyk (si SNYK_TOKEN)

## 8. Chaos / Stress (à implémenter)

- Couper DB : `docker stop postgres`
- Stress : `k6 run --vus 5000 --duration 5m`
- Circuit breaker : à ajouter dans les clients HTTP
