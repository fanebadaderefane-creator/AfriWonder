# Exécution audit PDF — « AfriWonder Audit Complet » (01 avril 2026)

Document source : rapport confidentiel *AUDIT COMPLET · ARCHITECTURE · BUSINESS PLAN* (19 pages).  
Ce fichier relie **chaque grande exigence** du PDF à l’**état du dépôt** et aux **actions hors code** restantes.

**Légende :** ✅ fait dans le dépôt · 🟡 partiel / à valider en prod · 📋 manuel (GitHub, Doppler, juridique, finance) · ⏭ non applicable ou reporté MVP

---

## §2 Audit repository — points critiques

| Exigence PDF | Statut | Où / comment |
|--------------|--------|----------------|
| 70+ `.md` à la racine | ✅ | Racine : uniquement `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md` ; le reste sous `docs/`. |
| 5 stratégies mobiles | ✅ | Dossiers legacy RN/android/ios/mobile-afriwonder supprimés ; stratégie **PWA + `flutter_app/`** documentée. |
| Deux backends Node + Go | ✅ | Un seul backend actif `backend/` (Node). |
| `entities/` vs `entités/` | ✅ | `entités/` supprimé ; JSON sous `entities/`. |
| Pas de `.env.example` | ✅ | `.env.example` racine, `backend/.env.example`, `flutter_app/.env.example`, SDK. |
| Plusieurs guides déploiement | ✅ | Source de vérité : `docs/DEPLOYMENT.md`. |
| Secrets dans l’historique Git | 🟡 / 📋 | Procédure : `docs/SECURITY_SECRET_ROTATION_RUNBOOK.md`, workflow `detect-secrets.yml`, `.secrets.baseline`. Rotation / Secret scanning = action équipe. |

---

## §3 Plan no-code (Notion, Doppler, n8n, etc.)

| Exigence | Statut |
|----------|--------|
| Doppler, Notion, Clerk, Novu, etc. | 📋 Configuration comptes et intégrations ; `doppler.yaml` présent pour alignement noms de configs. |

---

## §4–5 Mobile PWA + Flutter & architecture backend

| Exigence | Statut | Référence |
|----------|--------|-----------|
| PWA + Flutter | ✅ | `docs/ARCHITECTURE.md`, `flutter_app/`, stack socket/API documentée. |
| Endpoints type audit (auth, videos, live, orders…) | 🟡 | À valider route par route sur ton déploiement ; beaucoup existent déjà sous `/api/`. |

---

## §6 Sécurité & données

| Exigence PDF | Statut | Référence code / doc |
|--------------|--------|----------------------|
| JWT fort, access court, refresh long | ✅ | `auth.service.ts` défaut `15m` / `30d` ; secrets 64+ caractères contrôlés. |
| Rate limit auth `/api/auth/*` | ✅ | `rateLimiting.ts` — `authLimiter` 5/min ; général 100/min par user JWT ou IP. |
| Zod sur POST/PUT | 🟡 | Schémas sur beaucoup de routes ; couverture continue. |
| Headers sécurité (HSTS, CSP…) | ✅ | `app.ts` + Helmet (voir statut alignement 2026-04-01). |
| RGPD / suppression compte | ✅ | Mentionné dans `docs/AUDIT_ALIGNMENT_STATUS_2026-04-01.md` (endpoints privacy). |
| Scan secrets / GitHub Secret Scanning | 📋 | `SECURITY.md`, workflows ; activation dans les paramètres GitHub. |

---

## §7 UI/UX & Lighthouse

| Exigence | Statut | Référence |
|----------|--------|-----------|
| Seuils Lighthouse / LHCI | 🟡 | `lighthouserc.cjs` — objectifs rehaussés ; mesurer sur **URL prod** réelle. |
| Mode offline, data saver, i18n, dark mode | 🟡 / ✅ | Partiellement couverts PWA ; effort produit continu (voir alignement). |

---

## §8–9 Business & roadmap

| Contenu | Statut |
|---------|--------|
| Business plan, projections, phases 1–4 | 📋 Hors dépôt / pilotage produit ; **roadmap texte** exposée côté API dans `auditRoadmap` (`GET /api/platform/config`) pour traçabilité. |

---

## §10 Instructions développeur (Jour 1 → Mois 3)

| Instruction | Statut | Note |
|-------------|--------|------|
| Branche cleanup | 🟡 | À renouveler si nouvelle vague de nettoyage ; historique déjà traité. |
| detect-secrets / baseline | ✅ | Workflow + baseline ; relancer localement si besoin. |
| Doppler / import `.env` | 📋 |
| Secret Scanning GitHub | 📋 |
| Révoquer tokens (OAuth, JWT, clés) | 📋 | Après fuite suspecte — runbook. |
| Déploiement backend Railway (PDF) | ⏭ | Dépôt cible **Render** documenté (`render.yaml`, `AUDIT_ALIGNMENT_STATUS`). |
| Sentry, PostHog, Resend, Figma | 🟡 / 📋 | Variables et hooks selon env ; pas tous forcément activés en prod. |
| Flutter feature-based | 🟡 | `flutter_app/` structuré ; parité continue. |

---

## Critères de succès « avant lancement » (PDF fin)

| Critère | Statut |
|---------|--------|
| Lighthouse perf > 90 mobile | 🟡 | Vérifier sur prod + CI. |
| API < 200 ms routes critiques | 🟡 | Mesurer (APM / sonde). |
| 0 secrets dans l’historique | 🟡 | Scan + rotation si doute. |
| Couverture tests front/back | 🟡 | `npm test` / couverture backend — objectifs 70 % / 80 %. |
| Flutter iOS 14+ / Android 9+ | 🟡 | Builds release + QA. |
| Offline, OM/Wave sandbox | 🟡 | Tests manuels / staging. |
| Revue sécurité | 📋 |

---

## Documents de suivi liés

- Alignement détaillé : `docs/AUDIT_ALIGNMENT_STATUS_2026-04-01.md`
- Checklist exécution (ops) : `docs/AUDIT_EXECUTION_CHECKLIST.md`
- Variables d’environnement : `docs/ENV_REFERENCE.md`
- Déploiement : `docs/DEPLOYMENT.md`

**Synthèse :** le PDF du **01/04/2026** décrit surtout un **état historique** du repo ; le dépôt actuel **implémente déjà** la majeure partie des exigences **techniques** listées. Restent les **actions organisationnelles** (secrets, prod mesurée, stores, business) et la **preuve** sur environnements réels.
