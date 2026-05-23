# 🔐 Playbook de rotation des secrets production — 22 avril 2026

**Contexte** : les secrets de l'ancien `backend/ENV_SUPABASE_CONFIGURER.txt` ont été exposés dans l'historique Git (mot de passe Supabase `Mali@202520211215`, `JWT_SECRET` en clair). Même après suppression du fichier, tout clone/fork du dépôt les contient encore. Rotation obligatoire avant mise en prod.

**Durée** : ~20 min si les accès dashboards sont prêts.

**Secrets générés** : voir `scripts/SECRETS_PROD_2026-04-22.env` (local, non committé).

---

## Étape 1 — Rotation mot de passe Supabase (5 min)

1. Aller sur https://supabase.com/dashboard → projet AfriWonder → **Settings** → **Database**
2. Section "Database password" → bouton **Reset database password**
3. Copier le nouveau mot de passe (ne jamais le mettre dans Git)
4. Le nouveau `DATABASE_URL` est affiché directement dans le dashboard → **Connection string** → URI
5. Format attendu pour production (pooler recommandé) :
   ```
   postgresql://postgres.<ref>:<NEW_PASSWORD>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15
   ```
6. Remplacer `<NEW_PASSWORD>` par le mot de passe reçu (URL-encodé si caractères spéciaux)

## Étape 2 — Rotation clés Supabase Auth (2 min)

Si `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` étaient exposés :

1. Settings → **API** → onglet "Project API Keys"
2. Régénérer `anon` (si un doute) et **toujours** `service_role`
3. Noter les nouvelles valeurs

## Étape 3 — Rotation clés Stripe (2 min)

Si `STRIPE_SECRET_KEY` exposée :

1. https://dashboard.stripe.com → **Developers** → **API keys**
2. "Roll" la clé secrète compromise
3. Mettre à jour `STRIPE_SECRET_KEY` en prod
4. Le `STRIPE_WEBHOOK_SECRET` est lié à l'endpoint webhook : Developers → Webhooks → endpoint → "Signing secret" (inutile de le changer sauf fuite)

## Étape 4 — Pousser les nouveaux secrets dans Render (5 min)

Render ne supporte pas le bulk upload, mais tu peux copier-coller via le dashboard :

1. https://dashboard.render.com → service backend AfriWonder → **Environment**
2. Ouvrir `scripts/SECRETS_PROD_2026-04-22.env`
3. Pour chaque ligne non-commentée, cliquer "Add Environment Variable" et copier clé=valeur

**Variables MINIMALES à ajouter/mettre à jour** :
- `JWT_SECRET` (nouveau)
- `JWT_REFRESH_SECRET` (nouveau)
- `JWT_EXPIRES_IN=15m`
- `JWT_REFRESH_EXPIRES_IN=30d`
- `WALLET_PIN_SALT` (nouveau)
- `ORANGE_MONEY_WEBHOOK_SECRET` (nouveau — enregistrer aussi côté Orange Money)
- `MOOV_MONEY_WEBHOOK_SECRET` (nouveau — enregistrer aussi côté Moov)
- `PAYMENT_WEBHOOK_SECRET` (nouveau)
- `HEALTH_API_KEY` (nouveau)
- `CRON_SECRET` (nouveau)
- `LIVE_CLEANUP_SECRET` (nouveau)
- `DATABASE_URL` (nouveau, issu étape 1)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (rotation si doute)
- `NODE_ENV=production`
- `CORS_ORIGIN=https://afriwonder.com,https://www.afriwonder.com,https://afri-wonder.vercel.app`
- `CORS_ALLOW_VERCEL_PREVIEW=false`
- `ORANGE_MONEY_TRUST_WEBHOOK=0`
- `MOOV_MONEY_TRUST_WEBHOOK=0`
- `TELEMEDICINE_ENABLED=true`

## Étape 5 — Trigger redémarrage Render (1 min)

1. Après sauvegarde des envs, Render redémarre automatiquement
2. Vérifier que `GET https://afriwonder-api.onrender.com/health` renvoie 200
3. Vérifier que `GET https://afriwonder-api.onrender.com/api/health` renvoie `status: "ok"` avec `db: "ok"` et `redis: "ok"` (ou `"skipped"` si pas de Redis)

## Étape 6 — Invalidation sessions (automatique)

Tous les JWT émis avec l'ancien `JWT_SECRET` deviennent invalides au redémarrage → tous les utilisateurs connectés doivent se reconnecter. C'est le comportement attendu et souhaitable.

## Étape 7 — Purge optionnelle de l'historique Git (bonus)

L'ancien `ENV_SUPABASE_CONFIGURER.txt` reste dans l'historique. Pour le purger :

```bash
# ATTENTION : réécrit l'historique, nécessite force-push et coordination équipe
git filter-repo --path backend/ENV_SUPABASE_CONFIGURER.txt --invert-paths
git push --force origin main
```

Alternative plus sûre : activer le **secret scanning** GitHub dans Settings → Security, et ne pas purger. Les anciens secrets sont désormais rotés, donc inutilisables.

---

## ✅ Vérification post-rotation

```bash
# Smoke test backend (depuis une machine avec accès DB prod)
DATABASE_URL="<nouveau>" JWT_SECRET="<nouveau>" \
JWT_REFRESH_SECRET="<nouveau>" \
  npm run test:smoke --prefix backend

# Smoke test API publique
curl https://afriwonder-api.onrender.com/health
curl -H "x-health-key: <HEALTH_API_KEY>" https://afriwonder-api.onrender.com/health/errors
```

Si les 3 commandes renvoient 200/OK → **rotation validée**.
