# Rapport final AfriWonder (généré automatiquement)

- **Horodatage (UTC)** : 2026-04-14T19:24:29.107Z
- **Révision git** : db6dcba

## Sources dans le dépôt

- Suivi phases 0–24 : `docs/PHASES_0_24_CONTRACT_TRACKER.md`
- Contrat de preuve livraison : `docs/CLIENT_DELIVERY_CONTRACT.md`
- Inventaire fonctionnel : `INVENTAIRE_AUDIT.md`
- Alignement audit : `docs/AUDIT_ALIGNMENT_STATUS_2026-04-01.md`

## Commandes de preuve (à exécuter avant signature client)

```bash
npm run verify:delivery
npm run test:smoke --prefix backend
# optionnel : charge (staging recommandé)
# k6 run tests/load/afriwonder-load-test.js
```

## npm audit (artefacts JSON)

- Racine : voir fichier → `reports\security-audit-root.json`
- Backend : voir fichier → `reports\security-audit-backend.json`

## Limites

- Ce script ne remplace pas les tests E2E Playwright, les builds EAS, ni la validation production.
- Les scores Lighthouse dépendent de `npm run build` + `npm run preview` + `npm run lhci` (voir `lighthouserc.cjs`).
