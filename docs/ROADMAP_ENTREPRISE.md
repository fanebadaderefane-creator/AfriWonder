# Roadmap Entreprise — AfriConnect

Ce document aligne l’audit « 100% entreprise » avec l’existant du projet et définit les blocs à ajouter (Compliance, Anti-fraude, Scalabilité, Financial Core, Identity, Data, Incident) pour un niveau **infrastructure + régulation + finance**.

---

## Résumé exécutif

| Bloc | État actuel | Priorité |
|------|-------------|----------|
| 1. Compliance & Régulation | **Renforcé** : KYC obligatoire (payment, ride, appointment, insurance), audit_events, rétention | Critique |
| 2. Anti-fraude global | **Renforcé** : risk engine central, blacklist (user/device/IP), intégré paiement + billet + ride | Critique |
| 3. Scalabilité réelle | Monolite, Redis partiel | Haute |
| 4. Core Financial Ledger | **Existant** + idempotency sur paiements/billets | Renforcer unicité |
| 5. Identity unifié | **Renforcé** : account_suspended, kill switch par module | Haute |
| 6. Data & Analytics | Quasi absent | Moyenne |
| 7. Incident & Crisis | **Renforcé** : kill switch ride/food/health/insurance/events, feature flags | Haute |
| AML | **Ajouté** : seuil (AML_THRESHOLD_XOF), TransactionFlag, liste admin | — |

### Implémenté (enterprise 100 — backend)

- **Migration** `20260220000000_enterprise_100` : User (account_suspended, suspended_at, suspended_reason), blacklist_entries, audit_events, feature_flags, transaction_flags.
- **Auth** : rejet 403 si `account_suspended`; chargement du champ en session.
- **Idempotency** : middleware strict (paiement OM) et optionnel (book ticket) ; `saveIdempotencyResponse` ; table `idempotency_keys`.
- **Risk engine** : `riskEngine.service.ts` — `evaluate(context)` agrège blacklist + fraud check paiement ; utilisé sur payment init, ticket book, ride create.
- **Blacklist** : `blacklist.service.ts` (user/device/ip) ; admin POST `/api/admin/blacklist`.
- **KYC obligatoire** : `kycRequired.service.ts` — `requireKycFor(userId, action)` ; appliqué sur payment, ride, appointment, insurance claim.
- **Audit trail** : `auditTrail.service.ts` — `logAuditEvent` / `auditFromRequest` ; appelé sur payment_init, ticket_book.
- **Kill switch étendu** : `platformControl.service` — ride_enabled, food_enabled, health_enabled, insurance_enabled, events_enabled ; vérifié dans chaque module ; admin PATCH kill-switch accepte ces clés.
- **Feature flags** : `featureFlag.service.ts` ; admin GET/PATCH `/api/admin/feature-flags` (liste + activation par clé).
- **AML** : `aml.service.ts` — seuil `AML_THRESHOLD_XOF` (défaut 1M), `checkAndFlagIfNeeded`, `listPendingFlags` ; admin GET `/api/admin/aml/flags`.
- **Admin** : PATCH `/api/admin/users/:id/suspend` (suspended, reason), POST `/api/admin/blacklist`, GET `/api/admin/aml/flags`, GET/PATCH feature-flags.

---

## 1. Compliance & Régulation (critique)

### Existant

- **KYC / Vérification**  
  - `UserVerification`, workflow soumission → approbation/rejet par admin.  
  - `verification.service.ts` : submit, list, approve/reject.  
  - Pas encore de liaison obligatoire « paiement / assurance / santé / transport » → KYC requis.

- **Audit trail**  
  - `AdminLog` (adminAudit.service) : actions admin (kill_switch, user_role, etc.).  
  - `AdminAuditLog` (security.service) : logs d’audit sécurité.  
  - Pas d’audit trail **complet** sur chaque mouvement financier / changement de statut métier.

- **Rétention données**  
  - `dataRetention.job.ts` + `DataRetentionPolicy` : politiques par type (security_logs 1 an, admin_audit 5 ans, consent 3 ans, etc.).  
  - Nettoyage périodique (cron).

- **Consentement / Légal**  
  - `LegalDocument`, `UserLegalAcceptance`, `ConsentLog`, `GuestCookieConsent`, `DataExportRequest`, `AccountDeletionRequest` (schema + vraisemblablement routes).

### Manquant / à faire

- **KYC obligatoire**  
  - Règles métier : bloquer ou limiter paiement, souscription assurance, prise de RDV santé, création de course, selon niveau de vérification (none / pending / approved).  
  - Champs ou états « verification_level » / « kyc_required_for » dans config.

- **AML (anti-blanchiment)**  
  - Pas de seuils de déclaration, pas de reporting des transactions suspectes, pas d’intégration avec un fournisseur AML.  
  - À prévoir : seuils par type d’opération, flagging, export pour autorités.

- **Audit trail complet**  
  - Chaque mouvement d’argent (ledger, orders, event payments, ride, assurance, etc.) avec : qui, quoi, quand, référence, IP/metadata.  
  - Soit extension de l’existant (AdminLog / table dédiée), soit table `AuditEvent` générique avec type + payload.

- **Archivage légal**  
  - Politique d’archivage (export froid, durée légale) et preuve d’intégrité (hash, horodatage).  
  - À définir avec juridique (pays CEDEAO).

- **Conformité données personnelles**  
  - Renforcer export / suppression (GDPR-like) : parcours complets par module (orders, tickets, health, insurance, etc.).  
  - Documenter politique de confidentialité et durée de conservation par catégorie.

---

## 2. Système anti-fraude global (critique)

### Existant

- **Paiements**  
  - `fraudCheck.service.ts` : montant max, nombre d’échecs (1 h), vitesse (paiements réussis sur fenêtre 15 min).  
  - Utilisé côté paiement / commande.

- **Ticketing**  
  - QR signé (HMAC), anti-double scan, lock temporaire.  
  - Pas de fraud scoring central.

- **Assurance**  
  - `risk_score` et `validation_level` sur les claims (workflow staff).  
  - Pas de calcul automatique ni de règles AML/fraude partagées.

- **Sécurité / abus**  
  - Rate limiting (auth, payment, admin, etc.), anti-bot (middleware).  
  - `SuspiciousActivityAlert`, `SecurityLog` (schema).

### Manquant / à faire

- **Fraud scoring central**  
  - Un « risk engine » qui agrège : user (KYC, historique), device, IP, montant, type d’opération (paiement, claim, course, billet).  
  - Score 0–100 ou niveaux (low / medium / high) utilisé par tous les modules.

- **Risk engine réutilisable**  
  - Service unique `riskEngine.evaluate(context)` appelé avant : création de course, création de claim, paiement, achat de billet, etc.  
  - Règles configurables (seuils, patterns).

- **Pattern detection**  
  - Détection de patterns (même device, même IP, nombreux comptes, montants anormaux).  
  - Peut s’appuyer sur analytics (voir §6) + règles métier.

- **Blacklist**  
  - Table ou champs : blacklist par user_id, device_id, IP (ou plage), raison, durée.  
  - Vérification systématique avant toute action sensible.

- **Device fingerprinting**  
  - Collecte et stock d’un fingerprint (navigateur/app) pour lier les sessions et détecter multi-comptes / abus.  
  - Header dédié ou champ côté client + stockage et utilisation dans le risk engine.

- **IP anomaly**  
  - Détection de changement de pays / VPN / proxy (service externe ou heuristiques).  
  - Intégration dans le contexte du risk engine.

---

## 3. Architecture de scalabilité réelle

### Existant

- **Monolite**  
  - Un backend Node/Express, Prisma, une base PostgreSQL.  
  - Redis utilisé (cache, rate limit, sessions si configuré).  
  - Pas de découpage par domaine (events, ride, health, etc.) en services distincts.

- **Base & cache**  
  - PostgreSQL (Supabase).  
  - Redis pour limiter et éventuellement cache.  
  - Pas de file de messages, pas de CDN documenté pour les assets.

### Manquant / à faire

- **Microservices isolés**  
  - Découpage optionnel par domaine (payments, ticketing, ride, health, insurance) avec APIs internes.  
  - À envisager quand la charge et les équipes le justifient.

- **Message queue**  
  - Kafka / RabbitMQ / SQS pour : événements asynchrones (paiement confirmé, envoi email, notifications, jobs de réconciliation).  
  - Réduit le couplage et permet de scaler les workers.

- **Cache**  
  - Redis : cache métier (stock billets, taux, config) et invalidation claire.  
  - Stratégie cache-aside ou cache invalidation par événement.

- **CDN**  
  - Assets statiques et médias derrière CDN (images événements, vidéos, documents).  
  - Headers cache et versioning.

- **Load balancer & horizontal scaling**  
  - Plusieurs instances backend sans état (sessions en Redis).  
  - Health checks et répartition de charge (ALB, Nginx, etc.).

- **Observabilité**  
  - Métriques (Prometheus/StatsD) : latence, erreurs, débit par route.  
  - Tracing distribué (OpenTelemetry) pour suivre une requête de bout en bout.  
  - Logs structurés (déjà partiellement en place avec logger).

- **Circuit breakers**  
  - Pour appels externes (paiement, SMS, AML, etc.) : éviter la cascade de pannes.  
  - Lib (ex. opossum) ou pattern manuel.

---

## 4. Core Financial Ledger unique (fintech)

### Existant (solide)

- **Ledger double écriture**  
  - `ledger.service.ts` : `credit()`, `debit()`, `transfer()`.  
  - Chaque mouvement crée une `LedgerEntry` avec type, amount, reference_id, reference_type, **balance_before**, **balance_after**.  
  - Mise à jour des totaux wallet (available_balance, balance).  
  - Références : order, withdrawal, refund, tip, campaign, loan, escrow_hold/release, fee, etc.

- **Wallet**  
  - Wallet user (et vraisemblablement seller) avec available_balance, pending_balance, locked_balance.  
  - Pas de modification directe des soldes sans passer par le ledger.

- **Idempotency**  
  - Modèle `IdempotencyKey` (schema).  
  - Middleware idempotence **non branché** sur les POST sensibles (paiements, billets).  
  - À activer et imposer sur init paiement, confirmation, achat billet.

### Manquant / à faire

- **Un seul ledger pour toute la plateforme**  
  - Aujourd’hui : events, ride, food, insurance peuvent avoir des flux qui ne passent pas tous par `ledger.service` (ex. EventPayment, SellerWallet direct).  
  - Objectif : tout mouvement d’argent = 1 ou 2 lignes ledger (débit/crédit) avec reference_type + reference_id.  
  - Migration progressive : faire passer chaque module par le ledger (ou un service « payment orchestration » qui appelle le ledger).

- **Idempotency systématique**  
  - Middleware qui lit `Idempotency-Key`, consulte `IdempotencyKey`, renvoie la réponse en cache si clé valide, sinon exécute et enregistre.  
  - Appliquer sur : POST init paiement, callback webhook paiement, POST book ticket, POST create ride, etc.

- **Reconciliation & reporting**  
  - Jobs de réconciliation (ledger vs orders vs EventPayment vs provider).  
  - Exports pour comptabilité et régulateur (journaux, balances par jour).

---

## 5. Identity system unifié

### Existant

- **Rôles**  
  - User.role (user, admin, staff, partner, etc.).  
  - Admin RBAC granulaire : super_admin, admin, finance_admin, moderation_admin, support_admin, data_admin.  
  - `requireRole`, `requireStaff`, `requireAdmin` (app) + adminRbac (admin).

- **Vérification identité**  
  - UserVerification (KYC) avec workflow approbation.  
  - Pas de sous-comptes business ni de multi-tenant explicite.

### Manquant / à faire

- **Rôles granulaires par module**  
  - Ex. : driver, doctor, restaurant_owner, insurance_partner, property_agent.  
  - Contrôles d’accès par ressource (e.g. ce ride / ce RDV / ce claim).

- **Multi-tenant**  
  - Modèle « organisation » ou « tenant » (marque, partenaire) avec sous-ensembles d’utilisateurs et de données.  
  - Filtrage systématique par tenant_id où pertinent.

- **Sub-accounts business**  
  - Comptes « entreprise » avec plusieurs utilisateurs (admin, caissier, etc.) et règles spécifiques (validation des paiements, plafonds).

- **Partner onboarding**  
  - Parcours dédié : inscription partenaire, vérification, contrat, activation des modules (ride, food, assurance, etc.).

- **Account suspension engine**  
  - Suspension (soft/hard) par raison (fraude, abus, demande utilisateur, décision juridique).  
  - Blocage cohérent : login, paiements, création de course/RDV/claim, etc.  
  - Réactivation avec audit.

---

## 6. Data & Analytics layer

### Existant

- **Données métier**  
  - Beaucoup d’entités (orders, events, tickets, rides, health, insurance, property).  
  - Pas de couche analytics dédiée ni de data warehouse.

### Manquant / à faire

- **Data warehouse / DWH**  
  - Base ou schéma dédié (ex. Redshift, BigQuery, Snowflake, ou PostgreSQL dédié) alimenté par ETL.  
  - Données agrégées et historisées (ventes, utilisateurs, transactions).

- **ETL pipeline**  
  - Extraction depuis PostgreSQL (et logs) → transformation (nettoyage, agrégations) → chargement dans DWH.  
  - Exécution planifiée (quotidienne / temps réel selon besoin).

- **Business intelligence**  
  - Dashboards (revenus par module, cohortes, LTV, taux de conversion).  
  - Outils (Metabase, Superset, Looker) ou API d’agrégats exposée au front.

- **Cohort analysis & LTV**  
  - Définition de cohortes (date d’inscription, premier achat, module).  
  - Calcul LTV et rétention par cohorte.

- **Fraud analytics**  
  - Métriques et rapports dérivés du risk engine (taux de rejet, distribution des scores, faux positifs).  
  - Utilisation pour affiner les règles.

- **Revenue analytics par module**  
  - Revenus par type (marketplace, events, ride, food, assurance, health, property).  
  - Aligné avec le ledger et les références (reference_type).

---

## 7. Incident & crisis management

### Existant

- **Kill switch par module**  
  - `platformControl.service.ts` : marketplace_enabled, payments_enabled, videos_enabled, maintenance_mode, emergency_mode.  
  - Vérification dans les routes métier (`isMarketplaceEnabled()`, etc.).  
  - API admin GET/PATCH kill-switch (super_admin).  
  - Audit log sur changement.

- **Health**  
  - `/health`, `/health/ready`, `/health/region`.  
  - Pas de status page publique ni de playbook documenté.

### Manquant / à faire

- **Status page publique**  
  - Page (ou sous-domaine) « status.africonnect.com » avec état des services (API, paiements, événements, ride, etc.).  
  - Mise à jour manuelle ou automatique (health checks).  
  - Historique des incidents.

- **Incident playbook**  
  - Procédures documentées : qui fait quoi en cas de panne paiement, fraude massive, fuite de données, indisponibilité partielle.  
  - Escalade, communication client, rollback.

- **Rollback strategy**  
  - Déploiements versionnés (tags), rollback en un clic (ou script).  
  - Migrations réversibles ou à double phase (feature flag puis migration définitive).

- **Kill switch par module étendu**  
  - Étendre aux autres domaines : ride_enabled, food_enabled, health_enabled, insurance_enabled, events_enabled.  
  - Cohérence avec la config utilisée dans chaque route.

- **Feature flags**  
  - Table ou service (LaunchDarkly, Unleash, ou custom) pour activer/désactiver des fonctionnalités sans déploiement.  
  - Utilisation pour rollout progressif et rollback immédiat.

- **Hotfix pipeline**  
  - Branche ou processus dédié pour correctifs critiques (sécurité, perte d’argent) avec tests ciblés et déploiement rapide.

---

## 8. Les 4 blocs finaux « 100 % entreprise »

| Bloc | Contenu principal | Dépendances |
|------|-------------------|-------------|
| **Governance layer** | Politiques KYC/AML, rétention, consentement, audit trail complet, archivage, conformité RGPD-like | §1 Compliance |
| **Financial core layer** | Ledger unique, idempotency sur tous les flux sensibles, réconciliation, reporting régulateur | §4 Ledger |
| **Fraud & risk engine** | Scoring central, risk engine, blacklist, device fingerprint, pattern detection, intégration dans tous les modules | §2 Anti-fraude |
| **Enterprise infrastructure** | Scalabilité (queue, cache, CDN, scaling), observabilité (métriques, tracing), circuit breakers, status page, playbook, feature flags | §3, §7 |

---

## 9. Plan d’action par phase (recommandation)

### Phase 1 — Régulation & finance (3–6 mois)

- Rendre le **KYC bloquant** pour paiement / assurance / santé / ride (config + règles métier).  
- **Audit trail** : table générique ou extension pour tous les mouvements financiers et changements de statut sensibles.  
- **Idempotency** : brancher le middleware sur paiements et billets, utiliser `IdempotencyKey`.  
- **Unifier les flux** vers le **ledger** (events, ride, food, assurance) et documenter les reference_type.  
- **AML** : seuils de déclaration et processus de signalement (interne puis régulateur).  
- Documenter **politique de rétention** et **archivage légal**.

### Phase 2 — Anti-fraude (2–4 mois)

- **Risk engine** central : interface `evaluate(userId, action, context)` → score + décision (allow / review / block).  
- Intégrer **fraudCheck** existant + règles métier (claims, ride, tickets) dans ce engine.  
- **Blacklist** (user, device, IP) et consultation systématique avant actions sensibles.  
- **Device fingerprinting** (collecte + stock) et **IP anomaly** (optionnel).  
- **Pattern detection** basique (même device, multi-comptes) et alertes.

### Phase 3 — Identity & opérations (2–3 mois)

- **Account suspension** : statut + raison, blocage cohérent partout.  
- **Rôles granulaires** par module (driver, doctor, etc.) et contrôle d’accès par ressource.  
- **Partner onboarding** (parcours + vérification).  
- **Kill switch** étendu à tous les modules.  
- **Status page** publique et **incident playbook**.

### Phase 4 — Scalabilité & data (3–6 mois)

- **Message queue** pour événements asynchrones et workers.  
- **Cache** Redis structuré (invalidation, stratégie).  
- **Observabilité** : métriques, tracing, dashboards.  
- **Feature flags** et **rollback** documenté.  
- **ETL + DWH** (ou agrégats dédiés) et **analytics** (revenus, cohortes, LTV, fraude).  
- Optionnel : découpage en microservices pour les domaines les plus chargés.

---

## 10. Fichiers clés existants (référence)

| Domaine | Fichiers |
|--------|----------|
| Ledger | `src/services/ledger.service.ts` |
| Fraud (paiement) | `src/services/fraudCheck.service.ts` |
| KYC | `src/services/verification.service.ts` |
| Rétention | `src/jobs/dataRetention.job.ts` |
| Audit admin | `src/services/adminAudit.service.ts`, `src/services/security.service.ts` |
| Kill switch | `src/services/platformControl.service.ts`, `src/routes/admin.routes.ts` |
| RBAC | `src/middleware/requireRole.ts`, `src/middleware/adminRbac.ts` |
| Idempotency (schema) | `prisma/schema.prisma` (IdempotencyKey) |

---

*Document créé à partir de l’audit « 100 % entreprise » et de l’état du dépôt AfriConnect. À mettre à jour au fil des implémentations.*
