# Lancer le CI/CD AfriWonder (frontend + backend)

## Comment déclencher le CI/CD

Le workflow **CI/CD AfriWonder** vérifie frontend et backend. Vous pouvez le lancer de 3 façons :

### 1. Automatique (à chaque push / PR)

- **Push** sur les branches `main` ou `develop` → le CI se lance tout seul.
- **Pull Request** vers `main` ou `develop` → le CI se lance.

```bash
git add .
git commit -m "fix: correction XYZ"
git push origin main
```

Puis aller sur : **GitHub → AfriWonder → Actions** pour voir le run.

### 2. Manuel (bouton « Run workflow »)

1. Ouvrir **GitHub** → dépôt **AfriWonder** → onglet **Actions**.
2. Dans la liste à gauche, cliquer sur **CI/CD AfriWonder**.
3. À droite, cliquer sur **Run workflow** (liste déroulante).
4. Choisir la branche (ex. `main`) puis **Run workflow**.

Le workflow est exécuté une fois sans faire de push.

### 3. Par tag (déploiement)

Un push de tag `v*.*.*` déclenche aussi le workflow de **Deploy** (après succès du CI si configuré ainsi).

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Ce que fait le CI/CD

| Job | Rôle |
|-----|------|
| **test-backend** | PostgreSQL 15, `npm ci`, création DB `afriwonder_test`, migrations, `npm run test:coverage` (Jest), audit npm |
| **test-frontend** | `npm ci`, `npm run lint`, `npm run test:coverage` (Vitest), `npm run build` (Vite), audit npm |
| **security-audit** | `node scripts/security-audit.js` (racine) |
| **security-scan** | Snyk (si `SNYK_TOKEN` dans les secrets) |
| **test-e2e** | Démarre backend + frontend, tests Playwright (nécessite que test-backend et test-frontend aient réussi) |

Si **CI/CD AfriWonder** est vert, frontend et backend sont OK pour ce commit.

---

## Si le CI échoue

1. **Ouvrir le run** : Actions → cliquer sur le run en échec (croix rouge).
2. **Voir quel job a échoué** : cliquer sur le job (ex. `test-backend` ou `test-frontend`).
3. **Lire les logs** : déplier les steps (ex. « Run tests ») pour voir l’erreur.

### Tester en local (même enchaînement que le CI)

**Backend (avec PostgreSQL local ou Supabase test) :**

```bash
cd backend
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/afriwonder_test"
npm run test:create-db
npm run db:generate
npm run test:db
npm run test:db:prepare
npm run test:coverage
```

**Frontend :**

```bash
npm ci
npm run lint
npm run test:coverage
npm run build
```

**E2E (optionnel, backend + frontend doivent tourner) :**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
npm run dev

# Terminal 3
npm run test:e2e
```

---

## Déploiement après le CI

Le workflow **Deploy AfriWonder** peut se lancer après un CI réussi sur `main` (voir `.github/workflows/deploy.yml`). Il build les images Docker et déploie si les secrets (SSH, etc.) sont configurés.

Pour lancer uniquement le déploiement à la main : Actions → **Deploy AfriWonder** → **Run workflow** → choisir l’environnement (staging / production).
