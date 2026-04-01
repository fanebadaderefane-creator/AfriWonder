# Audit Alignment Status — 2026-04-01

This file tracks concrete repository alignment against the client audit.

## Done today (real changes applied)

- Root markdown cleanup performed:
  - All root `*.md` files except `README.md` and `CHANGELOG.md` were moved to `docs/`.
  - Root now keeps only: `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`.
- Added root governance entry points:
  - `CONTRIBUTING.md` -> points to `docs/CONTRIBUTING.md`
  - `SECURITY.md` -> points to `docs/SECURITY.md`
- `.env.example` requirements satisfied:
  - Root `.env.example` exists.
  - `backend/.env.example` exists.
  - `README.md` updated to stop suggesting manual creation when examples are present.
- Duplicate entities naming normalized:
  - `entités/` removed.
  - JSON entity files moved to `entities/`.
- Deployment source-of-truth:
  - Canonical `docs/DEPLOYMENT.md` present in `docs/`.
  - Removed duplicate deployment docs (`docs/DEPLOIEMENT*.md`).
- Ordered execution started from audit "Jour 1":
  - Branch `cleanup/repo-restructure` created.
  - `detect-secrets` installed locally.
- Flutter folder naming aligned with audit:
  - `mobile_flutter/` renamed to `flutter_app/`.
  - Internal references updated in docs.
- Legacy strategy folders removed from root:
  - `mobile-afriwonder/` removed.
  - `android/` removed.
  - `ios/` removed.
- Backend strategy consolidated:
  - `experimental-backend-go/` removed from working tree (single active backend remains `backend/`).
- Legacy RN-specific automation/config removed:
  - Deleted `scripts/release-android-bundle.cjs`.
  - Removed Capacitor release/open scripts from root `package.json`.
  - Removed obsolete RN-focused Cursor rule (`.cursor/rules/pwa-rewritten-in-react-native.mdc`).
- Legacy RN gap report removed:
  - Deleted `docs/PWA_VS_RN_GAP_REPORT.md` to avoid conflicting mobile strategy docs.
- CI/CD hardening added:
  - Added `.github/workflows/release.yml` to publish GitHub Releases on SemVer tags (`v*.*.*`).
  - Added `.github/workflows/detect-secrets.yml` to enforce `.secrets.baseline` checks on push/PR.
- Legacy references cleanup in docs:
  - Updated remaining references to React Native/Capacitor/Golang target stack in key documents to align with `PWA + Flutter + Node.js`.
- External security runbook added:
  - Added `docs/SECURITY_SECRET_ROTATION_RUNBOOK.md` to execute key rotation and GitHub Secret Scanning closure with proof.

## Partially done / constrained today

- Secret baseline generation:
  - `.secrets.baseline` generated with the exact audit command `detect-secrets scan > .secrets.baseline`.
  - A lightweight git history keyword scan was executed; results include many token/auth references in code, requiring manual triage for real exposed secrets.

## Remaining to reach full audit target

- Optional hardening steps from audit:
  - Rotate any exposed keys if found by secret triage.
  - Enable/verify GitHub Secret Scanning + Push Protection at repository settings level.

## Integrity note

This status intentionally reflects what was actually changed in the repository today.
No item above is marked as done unless the change exists in the filesystem.
