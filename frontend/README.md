# AfriWonder — Application mobile (Expo / React Native)

Client **Expo Router** (Android, iOS).  
**Standards d’ingénierie pour la durabilité** (document vivant v1.0) : [`../docs/ENGINEERING_STANDARDS.md`](../docs/ENGINEERING_STANDARDS.md) · index [`../docs/DURABILITY_STANDARDS.md`](../docs/DURABILITY_STANDARDS.md) · couverture [`../docs/COVERAGE.md`](../docs/COVERAGE.md) · **dépendances justifiées** [`../docs/DEPENDENCIES.md`](../docs/DEPENDENCIES.md).

---

## Vérification locale (gate « même commit / même qualité qu’en CI »)

```bash
npm run verify
# alias explicite :
npm run standards:mobile
```

Exécute : **ESLint** (règle `max-lines` 300, warning — ch.1.2), **TypeScript** `tsc --noEmit` (ch.1 + CI), **Vitest + couverture** ≥ **70 %** sur le périmètre `coverage.include` de `vitest.config.ts` (ch.2.2).  
Même combinaison via la racine : `npm run standards:expo` / `npm run standards:mobile`.

---

## Cartographie manuel → implémentation mobile (résumé exécutable)

| Chapitre | Exigence | Où c’est appliqué / noté |
|----------|----------|-------------------------|
| **1.1** | Couches UI / API / config | Données et appels : `src/api/`, `src/config/` ; UI dans `app/`, logique partagée dans `src/`. |
| **1.1** | Config externalisée | `EXPO_PUBLIC_*`, `app.config` / `eas.json`, `src/config/api.ts`, `backendBase` (voir règle mobile Android URL). |
| **1.1** | Dépendances documentées | [`../docs/DEPENDENCIES.md`](../docs/DEPENDENCIES.md) + justification en PR pour toute lib ajoutée. |
| **1.2** | Linter, noms, pas de gros fichiers | `eslint.config.js` (`max-lines` 300 en warning) ; `expo lint` dans `verify`. |
| **2.2** | Couverture ≥ 70 % | `vitest.config.ts` → `coverage.thresholds` 70 + `include` ciblé. |
| **2.2** | Tests sur chaque PR | CI : job `test-mobile-expo` (`npm run test:coverage` + chrono, voir [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml)). |
| **2.4** | Suite unitaire moins de 5 min (cible) | Même job : avertissement GitHub si la durée dépasse 300 s. |
| **3** | Sécurité dépendances | `npm audit --audit-level=high` sur `frontend/` dans le job mobile. |
| **3.3** | Versioning sémantique | `app.json` → `version` / `versionCode` (Android) ; incrément EAS `production` (`eas.json` `autoIncrement`). Changelog = process release (équipe). |
| **3.2** | Release progressive | Gérer côté **EAS** (canaux / staged rollout) + métriques Sentry : hors dépôt, documenté en process ops. |
| **4.1** | Taille PR ≤ 400 lignes | Gate repo : job `pr-line-budget` dans le même workflow CI. |
| **5** | Sentry (erreurs) | `src/lib/sentryMobile.ts`, `@sentry/react-native` ; Crashlytics Firebase = option complémentaire non requise si Sentry actif. |
| **5–6** | Budgets perf mobile | ch.6.1 / ch.9.3 : **cold start** &lt; 2 s, **APK** &lt; 50 Mo, listes performantes : `AGENTS.md` + `flash-list` / `expo-image` + mesures EAS. |
| **6** | Données et pagination | Côté app : requêtes via React Query (pas de N+1 côté UI) ; listes longues : FlashList. |
| **7** | Secrets | Pas de clés en dur : `expo-secure-store`, env, EAS Secrets. |
| **7.2** | RGPD | Parcours compte / export / suppression portés sur l’API (écrans `settings/` + backend). |
| **9.3** | Afrique & Mali | **Android 10+** : `app.json` → `expo-build-properties` `minSdkVersion` **29** ; i18n `src/i18n/translations.ts` (fr, FCFA, +223) ; tests bas de gamme = process manuel. |
| **9.3** | Hors-ligne partiel | `expo-sqlite`, cache React Query, dégradation NetInfo. |
| **10** | Feedback in-app | Signalements : `ReportModal` / `CommentReportModal` (feed, commentaires, messages, etc.) ; FAQ `app/faq.tsx`. |

Rituels (stand-up, dette, pentest) : ch.1.3, 7.3, 9.1, 10, checklist trimestrielle = **process équipe** — non codables dans l’app seule.

---

## Alignement express (ch.9.3 & ch.6.1)

| Exigence | Implémentation |
|----------|----------------|
| Android 10+ | `minSdkVersion` **29** dans `app.json` |
| Observabilité | Sentry + `sentryMobile.ts` |
| APK / perf | Budget **inférieur à 50 Mo** ; optimiser assets et surveiller le binaire EAS |
| E2E / smoke | `e2e/`, `maestro/*.yaml` (parcours critiques hors CI complets si non branchés) |

---

## Démarrage

```bash
npm install
npx expo start
```

Éditer `app/` (Expo Router). Documentation Expo : <https://docs.expo.dev/router/introduction/>.

## Variables d’environnement

Fichier exemple : `.env.example` (à la racine de `frontend/` s’il existe) ; production : **EAS Secrets** + `eas.json` pour les `EXPO_PUBLIC_*` non sensibles.
