# AfriWonder — Checklist avant Play Store

**Directive lancement (QA / sign-off) :** [`OPERATIONAL_DIRECTIVE_LAUNCH.md`](./OPERATIONAL_DIRECTIVE_LAUNCH.md) · **Inventaire des écrans à couvrir :** [`OPERATIONAL_DIRECTIVE_FEATURE_INVENTORY.md`](./OPERATIONAL_DIRECTIVE_FEATURE_INVENTORY.md)

Ordre d'exécution recommandé. Coche **dans l'ordre**. Ne saute aucune étape "bloquant".

---

## 🟢 PHASE A — Déjà fait par l'audit automatisé

- [x] Backend TypeScript `tsc --noEmit` → 0 erreur
- [x] Mobile TypeScript `tsc --noEmit` → 0 erreur
- [x] Mobile ESLint → 0 erreur (21 warnings P2)
- [x] 0 violation React Hooks
- [x] Backend smoke tests `npm run test:smoke` → 10/10 passés
- [x] Écran suppression de compte in-app → ajouté (`/settings/delete-account`)
- [x] Pages HTML publiques Privacy / Terms / Account deletion → ajoutées (`backend/src/routes/publicPages.routes.ts`)
- [x] Permissions Android Play Store-safe (AD_ID bloqué, BIOMETRIC retiré)
- [x] IAP coins via Google Play Billing (pas via Stripe)
- [x] Sentry frontend + backend branché
- [x] Rate limiting + helmet + CORS + bcrypt + JWT obligatoire en prod
- [x] CI gate `typecheck-and-lint` bloquant

Tout ceci est documenté dans :
- `docs/QA_FINAL_REPORT.md`
- `docs/PLAY_STORE_READINESS.md`
- `docs/AUDIT_QA_LAUNCH_READY.md`

---

## 🔴 PHASE B — Actions humaines obligatoires (dans l'ordre)

### B.1 — Compte Google Play (parallèle, à attendre)
- [ ] Valider l'identité dans Play Console (documents envoyés, attendre Google)
- [ ] Valider le numéro de téléphone dans Play Console
- [ ] Ouvrir le bouton **Créer une application** (actif uniquement quand tout est validé)

### B.2 — Backend prod déployé
- [ ] Déployer le backend sur Render / Fly / VPS
- [ ] Configurer les secrets via le dashboard Render :
  ```bash
  # Variables OBLIGATOIRES
  NODE_ENV=production
  DATABASE_URL=postgresql://...  (Supabase, Neon, ou autre)
  JWT_SECRET=$(openssl rand -hex 64)
  JWT_REFRESH_SECRET=$(openssl rand -hex 64)  # DIFFÉRENT du précédent
  CORS_ORIGIN=https://afriwonder.com,https://afriwonder-api.onrender.com
  REDIS_URL=redis://...  (Upstash, Redis Cloud, ou autre)
  SENTRY_DSN=https://...@sentry.io/...
  ```
- [ ] Variables **recommandées** pour activer les modules :
  ```bash
  # Paiements
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ORANGE_MONEY_MERCHANT_ID=...
  ORANGE_MONEY_API_KEY=...
  ORANGE_MONEY_WEBHOOK_SECRET=...
  WAVE_API_KEY=...
  WAVE_BUSINESS_ID=...
  # Stockage médias
  R2_ENDPOINT=https://...
  R2_ACCESS_KEY_ID=...
  R2_SECRET_ACCESS_KEY=...
  R2_BUCKET_NAME=afriwonder
  # Live Agora
  AGORA_APP_ID=...
  AGORA_APP_CERTIFICATE=...
  # Push
  FCM_PROJECT_ID=...
  FCM_PRIVATE_KEY=...
  FCM_CLIENT_EMAIL=...
  # Pages publiques
  PUBLIC_BACKEND_URL=https://afriwonder-api.onrender.com
  PUBLIC_SUPPORT_EMAIL=support@afriwonder.com
  PUBLIC_PRIVACY_EMAIL=privacy@afriwonder.com
  PUBLIC_COMPANY_NAME=AfriWonder
  PUBLIC_COMPANY_ADDRESS=Bamako, Mali
  ```
- [ ] Lancer migration DB : `npm run db:migrate:deploy`
- [ ] Lancer seed initial : `npm run db:seed`
- [ ] Lancer seed Mali : `npx tsx prisma/seed-mali.ts`
- [ ] Vérifier les secrets prod : `npm run check:prod-env`
- [ ] Vérifier health : `curl https://afriwonder-api.onrender.com/health` → `200 OK`
- [ ] Vérifier pages publiques :
  - `curl -I https://afriwonder-api.onrender.com/privacy` → `200` + `Content-Type: text/html`
  - `curl -I https://afriwonder-api.onrender.com/terms` → `200`
  - `curl -I https://afriwonder-api.onrender.com/account/delete` → `200`

### B.3 — Configurer les webhooks côté provider
- [ ] **Stripe Dashboard** → Developers → Webhooks → Add endpoint :
  - URL : `https://afriwonder-api.onrender.com/api/payments/stripe/webhook`
  - Events : `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
  - Copier le signing secret → `STRIPE_WEBHOOK_SECRET` dans Render
- [ ] **Orange Money portail marchand** → configurer notify_url :
  - `https://afriwonder-api.onrender.com/api/payments/orange-money/webhook`
- [ ] **Wave** : configurer callback URL selon doc Wave
- [ ] **Google Play Billing** : les webhooks IAP se configurent côté EAS après publication

### B.4 — Configurer les secrets EAS (mobile)
```bash
cd frontend
eas secret:create --scope project --name EXPO_PUBLIC_BACKEND_URL --value "https://afriwonder-api.onrender.com"
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://...@sentry.io/..."
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value "..."
# Si Apple :
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value "..."
```
Liste complète via :
```bash
eas secret:list --scope project
```

### B.5 — Build preview (APK interne) et test device
- [ ] `cd frontend && eas build --platform android --profile preview`
- [ ] Télécharger l'APK (lien donné par EAS à la fin du build)
- [ ] Installer sur **3 téléphones Android différents** (Samsung A03, Tecno Spark, Itel — gamme Mali typique)
- [ ] Lancer chaque parcours de la section 8.1 du `QA_FINAL_REPORT.md` :
  - [ ] Inscription téléphone OTP (Mali)
  - [ ] Inscription email
  - [ ] Connexion email + phone + OAuth Google
  - [ ] Mot de passe oublié
  - [ ] Onboarding intérêts
  - [ ] Feed scroll 50+ posts (vérifier FPS)
  - [ ] Créer post photo + vidéo + story
  - [ ] Commenter, liker, partager
  - [ ] Envoyer message texte + image + audio
  - [ ] Live streaming : démarrer, recevoir cadeau
  - [ ] Wallet : recharger (Orange Money sandbox)
  - [ ] Wallet : transférer à un autre user AfriWonder
  - [ ] Acheter coins (Google Play Billing sandbox)
  - [ ] Parcours marketplace : produit → panier → checkout → commande
  - [ ] Crowdfunding : parcourir, contribuer
  - [ ] Services locaux : food + doctor + ride (avec seed Mali en place)
  - [ ] Settings : changer thème, langue, notifications → redémarrer app → persistance OK
  - [ ] Supprimer mon compte → confirmer → annuler → vérifier statut
  - [ ] Se déconnecter → reconnecter sans perte de données

### B.6 — Mesures de performance (Chrome DevTools + Android Studio)
- [ ] Cold start < 3 s → mesurer avec Android Studio Profiler
- [ ] Feed initial < 2 s → mesurer en Chrome throttling "Slow 3G"
- [ ] Navigation écran → écran < 300 ms → React Native Perf Monitor
- [ ] FPS feed > 50 → Perf Monitor
- [ ] Taille APK < 50 MB → vérifier dans EAS build
- [ ] Crash-free > 99,5 % sur 24 h de test → dashboard Sentry
- [ ] API p95 < 500 ms → Prometheus `/metrics` ou Sentry Performance

### B.7 — Test en conditions réelles Mali
- [ ] Test sur vraie 3G / Edge (pas simulé) si possible — ou throttling "Slow 3G" Chrome
- [ ] Mode avion → retour en ligne : re-sync propre, pas de doublons
- [ ] Batterie faible (<20 %) → app continue sans crash background
- [ ] Multi-comptes sur même device (alternance)

### B.8 — Assets Play Store
- [ ] Icône 512×512 (PNG, alpha)
- [ ] Feature graphic 1024×500
- [ ] 4 à 8 captures d'écran (1080×1920 recommandé)
- [ ] (Optionnel) Vidéo YouTube non répertoriée, 30 s à 2 min

### B.9 — Remplir la fiche Play Console
Copier/coller depuis `docs/PLAY_STORE_LISTING.md` :
- [ ] Nom + catégorie + tags
- [ ] Description courte + longue (FR)
- [ ] URLs publiques (Privacy, Deletion, Support email)
- [ ] Upload icône + feature graphic + captures
- [ ] Data Safety form (section 6 du listing)
- [ ] Content rating IARC (section 7)
- [ ] Target audience : 13+
- [ ] Ads : Non
- [ ] Financial features : Yes (paiements + microcrédit)
- [ ] Health features : Yes (téléconsultation)
- [ ] COVID-19 : No
- [ ] Government app : No
- [ ] Pays de distribution : ML + SN + CI + BF + GN
- [ ] Changelog version 1.0.0 (copier depuis listing §11)

### B.10 — Internal testing Play Console
- [ ] `eas build --platform android --profile production` → AAB prêt
- [ ] Upload l'AAB dans Play Console → Testing → Internal testing → Create release
- [ ] Ajouter ton email en testeur interne
- [ ] Envoyer le lien à 5-10 beta-testeurs (idéalement au Mali)
- [ ] Attendre 48 h → surveiller Sentry + crashs
- [ ] 0 P0 / P1 ouvert → tu peux promouvoir

### B.11 — Promotion Production
- [ ] Play Console → Production → **Promote from Internal testing**
- [ ] Remplir le nouveau changelog si différent
- [ ] Confirmer le rollout : commencer à **20 % des utilisateurs**, puis 50 %, puis 100 %
- [ ] Surveiller Sentry + reviews Play Store les 48 premières heures

---

## 🚨 Kill-switch d'urgence (à n'utiliser QUE si bug critique en prod)

Si après le lancement un module fait crasher la prod, tu peux le désactiver **sans re-builder** :

```bash
# Exemple : désactiver le hub services si bug
cd frontend
eas secret:create --scope project --name EXPO_PUBLIC_ENABLE_SERVICES_HUB --value 0
eas update --branch production --message "Hotfix: disable services hub — investigation in progress"
```

Les utilisateurs reçoivent la mise à jour OTA en quelques minutes et voient l'écran "Bientôt" au lieu du crash.

Flags disponibles (depuis `frontend/src/config/featureFlags.ts`) :
- `EXPO_PUBLIC_ENABLE_MARKETPLACE`
- `EXPO_PUBLIC_ENABLE_CROWDFUNDING_CONTRIBUTE`
- `EXPO_PUBLIC_ENABLE_COURSES`
- `EXPO_PUBLIC_ENABLE_NEWS`
- `EXPO_PUBLIC_ENABLE_SERVICES_HUB`
- `EXPO_PUBLIC_ENABLE_STRIPE`
- `EXPO_PUBLIC_ENABLE_WALLET_P2P`
- `EXPO_PUBLIC_ENABLE_NATIVE_CALLS`

---

## 📊 Résumé de l'état final

| Catégorie | Statut | Actions restantes |
|---|---|---|
| Code frontend/backend | ✅ GO | 0 — tout prêt |
| Suppression de compte (app + web) | ✅ GO | 0 — routes servies |
| Permissions Android | ✅ GO | 0 — nettoyées |
| Sécurité (auth, rate limit, E2EE) | ✅ GO | 0 — en place |
| Monitoring (Sentry, Prometheus) | ✅ GO | 0 — branché |
| Tests backend critiques | ✅ GO | 10/10 passés |
| Compte Google Play validé | ⏳ | Attendre Google (2-7 jours) |
| Backend prod déployé | ❌ | Toi — B.2 |
| Webhooks providers configurés | ❌ | Toi — B.3 |
| Secrets EAS configurés | ❌ | Toi — B.4 |
| Tests device réel | ❌ | Toi — B.5 (3 devices × 24 parcours) |
| Mesures performance device | ❌ | Toi — B.6 |
| Test conditions Mali 3G | ❌ | Toi — B.7 |
| Assets Play Store | ❌ | Toi — B.8 (icône, feature graphic, captures) |
| Remplir fiche Play Console | ❌ | Toi — B.9 (copy prête dans `PLAY_STORE_LISTING.md`) |
| Test interne 48h | ❌ | Toi — B.10 |
| Promotion production | ❌ | Toi — B.11 (après beta OK) |

**Total actions humaines restantes : 11 étapes bloquantes**, toutes documentées avec commandes exactes.

**Durée estimée** si tu enchaînes : **2-3 jours ouvrés**, hors délai de validation Google (2-7 jours en parallèle).
