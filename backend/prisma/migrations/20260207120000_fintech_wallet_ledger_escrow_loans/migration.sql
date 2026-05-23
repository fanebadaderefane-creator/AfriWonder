-- AlterTable Wallet: pro fields + ledger + escrow
ALTER TABLE "Wallet" ADD COLUMN "wallet_type" TEXT NOT NULL DEFAULT 'user';
ALTER TABLE "Wallet" ADD COLUMN "available_balance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Wallet" ADD COLUMN "pending_balance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Wallet" ADD COLUMN "locked_balance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Wallet" ADD COLUMN "total_earnings" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Wallet" ADD COLUMN "total_payouts" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Wallet" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Wallet" ADD COLUMN "campaign_id" TEXT;

UPDATE "Wallet" SET "available_balance" = "balance" WHERE "available_balance" = 0;

DROP INDEX IF EXISTS "Wallet_user_id_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Wallet_campaign_id_key" ON "Wallet"("campaign_id") WHERE "campaign_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Wallet_wallet_type_idx" ON "Wallet"("wallet_type");
CREATE INDEX IF NOT EXISTS "Wallet_campaign_id_idx" ON "Wallet"("campaign_id");
CREATE INDEX IF NOT EXISTS "Wallet_user_id_wallet_type_idx" ON "Wallet"("user_id", "wallet_type");

-- CreateTable LedgerEntry
CREATE TABLE IF NOT EXISTS "LedgerEntry" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "description" TEXT,
    "balance_before" DOUBLE PRECISION NOT NULL,
    "balance_after" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LedgerEntry_wallet_id_idx" ON "LedgerEntry"("wallet_id");
CREATE INDEX IF NOT EXISTS "LedgerEntry_reference_id_reference_type_idx" ON "LedgerEntry"("reference_id", "reference_type");
CREATE INDEX IF NOT EXISTS "LedgerEntry_created_at_idx" ON "LedgerEntry"("created_at");

-- CreateTable WalletSecurity
CREATE TABLE IF NOT EXISTS "WalletSecurity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pin_hash" TEXT,
    "withdrawal_daily_limit" DOUBLE PRECISION,
    "last_withdrawal_at" TIMESTAMP(3),
    "withdrawal_count_today" INTEGER NOT NULL DEFAULT 0,
    "two_fa_required_for_withdrawal" BOOLEAN NOT NULL DEFAULT true,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "blocked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletSecurity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WalletSecurity_user_id_key" ON "WalletSecurity"("user_id");
CREATE INDEX IF NOT EXISTS "WalletSecurity_user_id_idx" ON "WalletSecurity"("user_id");

-- AlterTable Campaign
ALTER TABLE "Campaign" ADD COLUMN "kyc_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Campaign" ADD COLUMN "report_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN "fraud_flag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Campaign" ADD COLUMN "milestones" JSONB;
CREATE INDEX IF NOT EXISTS "Campaign_fraud_flag_idx" ON "Campaign"("fraud_flag");

-- AlterTable Contribution
ALTER TABLE "Contribution" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Contribution" ADD COLUMN "escrow_released_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Contribution_status_idx" ON "Contribution"("status");

-- AlterTable LoanRequest
ALTER TABLE "LoanRequest" ADD COLUMN "amount_requested" DOUBLE PRECISION;
ALTER TABLE "LoanRequest" ADD COLUMN "current_amount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "LoanRequest" ADD COLUMN "repayment_period_months" INTEGER;
ALTER TABLE "LoanRequest" ADD COLUMN "business_plan" TEXT;
ALTER TABLE "LoanRequest" ADD COLUMN "credit_score" DOUBLE PRECISION;
ALTER TABLE "LoanRequest" ADD COLUMN "risk_level" TEXT;
ALTER TABLE "LoanRequest" ADD COLUMN "deadline" TIMESTAMP(3);
UPDATE "LoanRequest" SET "amount_requested" = COALESCE("amount_requested", "amount"), "current_amount" = COALESCE("current_amount", 0), "repayment_period_months" = COALESCE("repayment_period_months", "repayment_period") WHERE "amount_requested" IS NULL OR "repayment_period_months" IS NULL;
ALTER TABLE "LoanRequest" ALTER COLUMN "amount_requested" SET NOT NULL;
ALTER TABLE "LoanRequest" ALTER COLUMN "current_amount" SET NOT NULL;
ALTER TABLE "LoanRequest" ALTER COLUMN "repayment_period_months" SET NOT NULL;

-- CreateTable LoanAgreement
CREATE TABLE IF NOT EXISTS "LoanAgreement" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "borrower_signature" TEXT,
    "lender_signature" TEXT,
    "contract_pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanAgreement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LoanAgreement_loan_id_key" ON "LoanAgreement"("loan_id");
CREATE INDEX IF NOT EXISTS "LoanAgreement_loan_id_idx" ON "LoanAgreement"("loan_id");

-- CreateTable LoanRepayment
CREATE TABLE IF NOT EXISTS "LoanRepayment" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount_due" DOUBLE PRECISION NOT NULL,
    "amount_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "penalty_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanRepayment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LoanRepayment_loan_id_idx" ON "LoanRepayment"("loan_id");
CREATE INDEX IF NOT EXISTS "LoanRepayment_due_date_idx" ON "LoanRepayment"("due_date");
CREATE INDEX IF NOT EXISTS "LoanRepayment_status_idx" ON "LoanRepayment"("status");

-- AddForeignKey LedgerEntry -> Wallet
ALTER TABLE "LedgerEntry" DROP CONSTRAINT IF EXISTS "LedgerEntry_wallet_id_fkey";
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey WalletSecurity -> User
ALTER TABLE "WalletSecurity" DROP CONSTRAINT IF EXISTS "WalletSecurity_user_id_fkey";
ALTER TABLE "WalletSecurity" ADD CONSTRAINT "WalletSecurity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Wallet -> Campaign (optional)
ALTER TABLE "Wallet" DROP CONSTRAINT IF EXISTS "Wallet_campaign_id_fkey";
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey LoanAgreement -> LoanRequest
ALTER TABLE "LoanAgreement" DROP CONSTRAINT IF EXISTS "LoanAgreement_loan_id_fkey";
ALTER TABLE "LoanAgreement" ADD CONSTRAINT "LoanAgreement_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "LoanRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey LoanRepayment -> LoanRequest
ALTER TABLE "LoanRepayment" DROP CONSTRAINT IF EXISTS "LoanRepayment_loan_id_fkey";
ALTER TABLE "LoanRepayment" ADD CONSTRAINT "LoanRepayment_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "LoanRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
