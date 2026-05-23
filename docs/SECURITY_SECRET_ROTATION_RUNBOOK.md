# Security Runbook — Secret Rotation (Git + GitHub)

Ce runbook ferme la partie "externe" de l'audit (rotation des clés et hygiène GitHub).

## 1) Triage immédiat

- Identifier les secrets potentiellement exposés (`detect-secrets`, historiques Git, alertes GitHub).
- Catégoriser chaque secret : `critical` (prod), `high` (staging), `low` (dev/demo).
- Ouvrir un ticket sécurité par secret avec propriétaire et délai.

## 2) Rotation opérationnelle (obligatoire)

Pour chaque secret confirmé:

1. Révoquer la clé actuelle côté fournisseur (Stripe, Cloudflare, DB, JWT, OAuth, etc.).
2. Générer une nouvelle clé.
3. Mettre à jour les variables GitHub (`Actions secrets` + `Environment secrets`).
4. Mettre à jour les environnements d'hébergement (Vercel, Render, serveur Docker, etc.).
5. Redéployer backend/frontend.
6. Vérifier les flux critiques (auth, paiement, upload, notifications).

## 3) GitHub hardening

- Activer Secret Scanning et Push Protection sur le dépôt.
- Activer Dependabot alerts + security updates.
- Protéger `main` (PR obligatoire, checks CI obligatoires).

## 4) Historique Git

Si un secret sensible est réellement commité dans l'historique:

1. Rotation immédiate (étape 2 d'abord).
2. Purge historique (BFG ou `git filter-repo`) sur branche dédiée.
3. Force-push contrôlé uniquement après validation équipe.
4. Re-clone des développeurs.

Note: la purge historique seule ne suffit jamais sans rotation.

## 5) Validation de fermeture audit

Un point "secrets externes" est considéré fermé seulement si:

- La clé exposée est révoquée.
- La nouvelle clé est déployée et testée.
- Les alertes GitHub associées sont résolues/fermées.
- La preuve (ticket + date + owner) est documentée.
