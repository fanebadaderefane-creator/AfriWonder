# Vérification des fichiers .env — AfriWonder

> Ce document récapitule quelles variables sont **configurées** vs **manquantes**, sans afficher les valeurs.  
> Dernière vérification : février 2026.

## Backend (`backend/.env`)

### Obligatoires (check-prod-env)
| Variable        | Statut     |
|----------------|------------|
| NODE_ENV       | Configuré  |
| DATABASE_URL   | Configuré  |
| JWT_SECRET     | Configuré  |
| CORS_ORIGIN    | Configuré  |
| REDIS_URL      | Configuré  |

### Recommandées
| Variable                  | Statut     | Note |
|---------------------------|------------|------|
| SENTRY_DSN                | Configuré  |      |
| HEALTH_API_KEY            | Configuré  |      |
| R2_* (Endpoint, Keys, Bucket) | Configuré  |      |
| STRIPE_*                  | Non utilisé| Désactivé (pas dispo Mali) |
| ORANGE_MONEY_WEBHOOK_SECRET | À ajouter | Obligatoire en prod si Orange Money utilisé |
| MOOV_MONEY_WEBHOOK_SECRET | Optionnel | Si Moov utilisé |

### Optionnel / partiel
| Variable              | Statut    | Action |
|-----------------------|-----------|--------|
| SMTP_PASS (Gmail)     | Vide      | Renseigner un App Password Gmail pour envoi d’emails |
| ORANGE_MONEY_CLIENT_ID / _SECRET / API_KEY | Vides | À remplir quand contrat Orange Money signé |

---

## Frontend (`.env.local`)

| Variable               | Statut    |
|------------------------|-----------|
| VITE_API_URL           | Configuré (localhost en dev) |
| VITE_WS_URL            | Configuré |
| VITE_SUPER_ADMIN_EMAIL | Configuré |
| VITE_SENTRY_DSN        | Configuré |

Pour la **production** : créer `.env.production` avec `VITE_API_URL` et `VITE_WS_URL` pointant vers votre API (https / wss).

---

## Tests (`backend/.env.test`)

- DATABASE_URL (base de test), JWT_*, R2_* : configurés pour les tests.
- Vérifier que la base `africonnect_test` existe sur Supabase (ou équivalent).

---

## Commandes de vérification

```bash
# Backend : vérifier que les obligatoires sont bien lus
cd backend && npm run check:prod-env

# Pré-lancement complet (build + env + fichiers critiques)
npm run pre-launch-check
```

---

## Sécurité

- Ne jamais commiter `.env` ou `.env.local` (déjà dans `.gitignore`).
- En production : utiliser des secrets (variables d’environnement du serveur ou gestionnaire de secrets), pas de fichier `.env` versionné.
- Si des clés ont été exposées (copier-coller, log, partage), les **révoquer et en générer de nouvelles** (Stripe, SendGrid, Google, Facebook, FCM, R2, JWT).
