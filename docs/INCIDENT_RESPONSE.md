# Runbook — incidents AfriWonder (phase 12)

Document **court** pour la reprise après incident. Adapter les URLs et contacts à votre organisation.

## 1. Base de données indisponible ou migrations en échec

1. Vérifier `DATABASE_URL` (Render / hébergeur) et les logs Postgres.
2. Statut lecture seule : activer la page de maintenance si disponible (`platform` / config).
3. Restauration : utiliser le backup fournisseur (Supabase / RDS / Render) — **tester une restauration au moins une fois par trimestre**.

## 2. API / backend down

1. Health : `GET /api/health` (JSON avec statut DB / uptime selon version).
2. Redémarrer le service (Render / Docker) ; vérifier variables JWT, Redis optionnel, CORS.
3. Rollback image / déploiement précédent si régression confirmée (< 5 min objectif).

## 3. PWA / Vercel

1. Vérifier le dernier déploiement et les logs build.
2. Rollback Vercel vers un déploiement stable.
3. Si incident CDN/assets : vider cache navigateur / vérifier `vite build` local.

## 4. Live / Agora

1. Vérifier clés Agora, enregistrement cloud, bucket R2/S3 (`replay_url`).
2. Si Agora indisponible : afficher message utilisateur ; désactiver temporairement le bouton « Démarrer un live » via feature flag si implémenté.

## 5. Paiements (Orange Money, Wave, Stripe…)

1. Ne pas réessayer en boucle aveuglément : risque de double débit côté PSP.
2. Consulter les webhooks et idempotency keys côté `backend`.
3. Message utilisateur : « Paiement en cours de confirmation » + support.

## 6. Secrets exposés

1. Révoquer immédiatement les clés (JWT, API, Agora, Stripe).
2. Suivre `docs/SECURITY_SECRET_ROTATION_RUNBOOK.md` si présent.
3. Forcer logout global / rotation refresh tokens si compromission session.

## 7. Après résolution

1. Noter la cause racine et la durée d’indisponibilité dans `AUDIT_JOURNAL.md` (racine).
2. Ajouter un test ou une alerte pour éviter la récidive si pertinent.
