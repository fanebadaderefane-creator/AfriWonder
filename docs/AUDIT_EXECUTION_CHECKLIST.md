# Checklist d’exécution audit (hors « commit seul »)

Ce document liste **ce qu’il faut faire** une fois le code en place : comptes, prod, équipe, mesures.  
Références : `docs/AUDIT_ALIGNMENT_STATUS_2026-04-01.md`, `docs/DEPLOYMENT.md`, `docs/ENV_REFERENCE.md`, `docs/SECURITY_SECRET_ROTATION_RUNBOOK.md`, `doppler.yaml`.

**Utilisation :** cocher les cases, noter **date** et **responsable** à côté des blocs sensibles (sécurité / prod).

---

## Phase A — Rôles et accès

- [ ] Désigner un **owner sécurité** (GitHub, secrets, rotation).
- [ ] Désigner un **owner infra** (Render, Vercel, DNS, Doppler).
- [ ] Lister qui a accès **admin** Render / Vercel / Supabase (ou DB) / Stripe & agrégateurs paiement.

---

## Phase B — GitHub (organisation ou dépôt)

- [ ] Activer **Secret scanning** (et résoudre les alertes ou documenter les faux positifs).
- [ ] Activer **Push protection** pour les secrets.
- [ ] Vérifier **Dependabot** / mises à jour de sécurité (voir runbook).
- [ ] Branche `main` : **PR obligatoires** + checks CI requis avant merge.
- [ ] Triage **historique Git** / `detect-secrets` : secrets réels → rotation (procédure ci-dessous).

**Procédure détaillée :** `docs/SECURITY_SECRET_ROTATION_RUNBOOK.md`.

---

## Phase C — Doppler (secrets centralisés)

- [ ] Créer ou compléter les configs **`dev` / `stg` / `prd`** alignées sur `doppler.yaml`.
- [ ] Lier le projet Doppler au dépôt (intégration GitHub si utilisée).
- [ ] Vérifier que **Render** et **Vercel** reçoivent les mêmes noms de variables que dans `docs/ENV_REFERENCE.md` (pas de divergence silencieuse).

---

## Phase D — Production (déploiement et santé)

- [ ] Vérifier le déploiement : `npm run verify-production` (voir `docs/DEPLOYMENT.md`).
- [ ] Confirmer **backend** `/health` et **proxy** `/api/health` depuis l’URL front réelle.
- [ ] Domaine custom (ex. `afriwonder.com`) : DNS + Vercel si prévu (`docs/DEPLOYMENT.md`).
- [ ] **Lighthouse / PSI** sur l’**URL de prod** (pas seulement CI locale) ; archiver scores ou lien rapport.
- [ ] **SLA / latence API** : définir une sonde (Uptime, Render metrics, ou outil externe) et une cible interne.
- [ ] **Charge** (ex. objectif audit type 1000 req/s) : planifier un test sur **staging** puis fenêtre contrôlée sur prod si applicable.

---

## Phase E — Paiements et webhooks (exécution réelle)

- [ ] **Orange Money / Wave / autres** : comptes **sandbox** ou marchands, credentials dans Render (pas dans le repo).
- [ ] Parcours **bout en bout** : init → callback/webhook → statut commande / wallet (checklist métier).
- [ ] Vérifier les URLs **webhook** accessibles publiquement et les secrets de signature côté hébergeur.

---

## Phase F — Qualité logicielle (effort continu)

- [ ] Objectif **couverture** front / back (ex. 70 % / 80 %) : mesurer (`npm test`, couverture backend) et planifier les tests manquants prioritaires.
- [ ] **Flutter** : `flutter analyze`, `flutter test`, build release ; **QA** sur appareil bas de gamme si cible Afrique.
- [ ] **Stores** : comptes développeur, fiches app, soumissions (Apple / Google) — processus hors code.

---

## Phase G — Produit et business (hors dépôt)

- [ ] **Figma** : fichier équipe, droits, design system partagé (`docs/DESIGN_SYSTEM_FIGMA_CHECKLIST.md` si besoin).
- [ ] **Bêta** (ex. 500 utilisateurs) : critères d’inclusion, support, feedback.
- [ ] **Marketing** multi-pays : canaux, conformité locale, tracking (PostHog etc. déjà côté code — à **valider** en prod).
- [ ] **Levée / finance** : documents et exécution hors périmètre technique du repo.

---

## Fermeture d’un point « audit exécuté »

Pour qu’un item soit considéré **fermé** côté organisation :

1. Action faite (case cochée).
2. **Preuve** courte : capture, lien rapport, ou ticket avec date.
3. **Owner** nommé pour la prochaine revue (trimestrielle recommandée pour secrets et prod).

---

## Rappel

Le dépôt fournit le **code** et la **documentation** ; cette checklist couvre l’**exécution** que seuls comptes, infra et équipe peuvent mener à bien.
