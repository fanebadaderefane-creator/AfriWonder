# Implémentation Finance Fintech – AfriWonder

Ce document décrit ce qui a été mis en place pour transformer Wallet, Microcrédit et Crowdfunding en écosystème financier sécurisé, scalable et conforme (aligné sur le prompt niveau international).

---

## 1. WALLET – Version pro

### Structure financière

- **Wallet** (Prisma) : champs ajoutés
  - `wallet_type` : `user` | `campaign_escrow`
  - `available_balance`, `pending_balance`, `locked_balance`
  - `total_earnings`, `total_payouts`
  - `status` : `active` | `frozen` | `closed`
  - `campaign_id` (optionnel, pour wallet escrow campagne)

- **LedgerEntry** (nouvelle table)
  - Règle : **ne jamais modifier les soldes directement**.
  - Chaque mouvement = une écriture ledger avec `type` (credit/debit), `amount`, `balance_before`, `balance_after`, `reference_id`, `reference_type`, `description`.

- **WalletSecurity** (nouvelle table)
  - `pin_hash`, `withdrawal_daily_limit`, `two_fa_required_for_withdrawal`, `is_blocked`, etc.
  - Prévu pour 2FA retrait, PIN wallet, limite retrait quotidienne (à brancher côté API/middleware).

### Service Ledger (`backend/src/services/ledger.service.ts`)

- `getOrCreateUserWallet(userId, currency)` : wallet principal utilisateur.
- `credit(walletId, amount, opts)` / `debit(walletId, amount, opts)` : double écriture (LedgerEntry + mise à jour wallet).
- `transfer(fromWalletId, toWalletId, amount)` : transfert interne (2 débits + 2 crédits).
- `getOrCreateCampaignEscrowWallet(campaignId, creatorId, currency)` : wallet escrow par campagne.
- `getLedgerEntries(walletId, opts)` : historique des écritures.

### Paiements

- **Webhook unique** : `POST /api/payment/webhook`
  - Body attendu : `provider` (orange_money | mtn_money | wave | paystack | flutterwave), `orderId` ou `reference`, `status`, etc.
  - Délégation aux vérifications existantes (Orange, MTN, Wave, Paystack, Flutterwave) puis traitement du type de paiement (commande, tip, crowdfunding, microcrédit, etc.).
- Routes existantes conservées : Stripe, Orange Money, MTN, Wave, Flutterwave, Paystack, wallet, transactions.

### À faire côté produit

- 2FA pour retrait (vérification dans `WalletSecurity` + middleware).
- PIN wallet (hash dans `WalletSecurity`, vérification avant débit).
- Limite retrait quotidienne (vérifier `withdrawal_daily_limit` et `withdrawal_count_today`).
- Détection activité suspecte + blocage (champs déjà présents dans `WalletSecurity`).

---

## 2. MICROCRÉDIT – Version fintech

### Modèles

- **LoanRequest** (étendu)
  - `amount_requested`, `current_amount`, `repayment_period_months`
  - `business_plan`, `credit_score` (calculé **backend uniquement**), `risk_level`
  - `status` : `active` | `funded` | `completed` | `defaulted` | `cancelled`
  - `deadline`

- **LoanAgreement** (nouveau)
  - `loan_id`, `borrower_signature`, `lender_signature`, `contract_pdf_url`

- **LoanRepayment** (nouveau)
  - `loan_id`, `due_date`, `amount_due`, `amount_paid`, `status`, `penalty_amount`, `paid_at`

### Service Microcrédit

- `createRequest` utilise `amount_requested`, `current_amount`, `repayment_period_months`, `status: 'active'`.
- `confirmContribution` met à jour `current_amount` et passe le prêt en `funded` quand le total atteint `amount_requested`.

### À faire côté produit

- Calcul du **credit score en backend** (données utilisateur, historique, KYC) — ne jamais exposer la formule au front.
- Vérification **KYC obligatoire** avant création de demande (bloquer si `UserVerification` non approuvée).
- **Escrow** : fonds des prêteurs bloqués jusqu’à financement complet, puis déblocage vers l’emprunteur.
- **LoanRepayment** : génération des échéances à la mise en `funded`, remboursement (manuel ou automatique), pénalités retard.
- **LoanAgreement** : génération contrat PDF, signatures, stockage `contract_pdf_url`.
- Blocage utilisateur en cas de défaut (statut `defaulted` + règles métier / WalletSecurity).

---

## 3. CROWDFUNDING – Version pro

### Modèles

- **Campaign**
  - `kyc_verified`, `report_count`, `fraud_flag`
  - `milestones` (JSON) : jalons avec montants et statuts pour libération progressive.
  - `status` : `active` | `funded` | `failed` | `completed` | `suspended`

- **Contribution**
  - `status` : `pending` | `completed` | `refunded`
  - `escrow_released_at`

### Escrow

- À la **création** d’une campagne : création d’un **wallet escrow** (type `campaign_escrow`, `campaign_id` = campagne).
- À la **confirmation** d’un paiement : l’argent est **crédité sur le wallet escrow** (plus de crédit direct au créateur).
- Quand **objectif atteint** : `releaseEscrowToCreator(campaignId)` :
  - Débit escrow, crédit créateur (après commission), crédit plateforme (commission 5–8%).
  - Statut campagne → `funded`.
- Si **échec** (date dépassée et objectif non atteint) : `refundCampaignIfFailed(campaignId)` :
  - Remboursement de chaque contribution depuis l’escrow vers le wallet utilisateur.
  - Contribution → `refunded`, campagne → `failed`.

### À faire côté produit

- **Milestones** : libération des fonds par paliers (utiliser `campaign.milestones` + logique de release partielle).
- **KYC créateur** : exiger `kyc_verified` (ou équivalent) avant publication / collecte.
- Modération + `report_count` / `fraud_flag` et règles (alertes, suspension).

---

## 4. Conformité & légal

- **KYC** : modèle `UserVerification` existant (document, selfie, statut). À utiliser pour microcrédit et crowdfunding (créateur / emprunteur).
- **Audit** : chaque mouvement financier est tracé dans **LedgerEntry** (référence, type, montant, soldes avant/après).
- Limites par niveau de vérification et RGPD : à implémenter en règles métier et politiques de rétention.

---

## 5. Migration base de données

- Migration Prisma : `backend/prisma/migrations/20260207120000_fintech_wallet_ledger_escrow_loans/migration.sql`
- À exécuter : `npx prisma migrate deploy` (ou `prisma migrate dev` en dev).
- Contenu principal :
  - Colonnes Wallet pro + LedgerEntry + WalletSecurity
  - Colonnes Campaign (kyc_verified, report_count, fraud_flag, milestones) et Contribution (status, escrow_released_at)
  - Colonnes LoanRequest (amount_requested, current_amount, repayment_period_months, business_plan, credit_score, risk_level, deadline)
  - Tables LoanAgreement, LoanRepayment
  - Contraintes et index

---

## 6. Checklist 100%

| Élément | Statut |
|--------|--------|
| Ledger double entry | ✅ `LedgerEntry` + `ledger.service` (credit/debit/transfer) |
| Webhooks paiement | ✅ `POST /api/payment/webhook` + routes Orange/MTN/Wave/etc. |
| Escrow crowdfunding | ✅ Wallet escrow par campagne, release / remboursement auto |
| Remboursement auto (échec campagne) | ✅ `refundCampaignIfFailed()` |
| KYC intégré | ✅ Modèle `UserVerification` ; à brancher avant microcrédit/crowdfunding |
| Credit score backend | 🔲 À implémenter (calcul côté serveur uniquement) |
| Gestion défaut paiement | 🔲 LoanRepayment + statut `defaulted` + règles |
| Limites anti-fraude | 🔲 WalletSecurity + middleware (2FA, PIN, limite retrait) |
| Microservice finance | 🔲 Optionnel : extraire wallet/ledger/paiements en service dédié |
| Audit trail | ✅ LedgerEntry + Transaction |

---

## 7. Dashboard admin fintech (spécification)

À construire côté admin :

- Total volume de transactions (par période).
- Total soldes wallets (available_balance).
- Total microcrédit actif (prêts en `active` / `funded`).
- Taux de défaut (prêts `defaulted` / total).
- Campagnes suspectes (`fraud_flag` ou `report_count` élevé).
- Alertes fraude (à définir à partir de WalletSecurity + logs).
- Payouts en attente de validation (withdrawals pending).

---

## 8. Fichiers modifiés / ajoutés

- `backend/prisma/schema.prisma` : Wallet, LedgerEntry, WalletSecurity, Campaign, Contribution, LoanRequest, LoanAgreement, LoanRepayment.
- `backend/prisma/migrations/20260207120000_fintech_wallet_ledger_escrow_loans/migration.sql`
- `backend/src/services/ledger.service.ts` (nouveau)
- `backend/src/services/payment.service.ts` : utilisation du ledger pour getWallet, addToWallet, withdrawFromWallet.
- `backend/src/services/crowdfunding.service.ts` : escrow, release, refund.
- `backend/src/services/microcredit.service.ts` : champs amount_requested, repayment_period_months, current_amount, status.
- `backend/src/routes/payments.routes.ts` : route `POST /webhook` (exposée aussi en `POST /api/payment/webhook`).
- `backend/src/app.ts` : montage des routes sur `/api/payment` pour le webhook.

Une fois la migration appliquée et les étapes « À faire » complétées, l’écosystème finance est prêt pour une exploitation type super-app fintech africaine.
