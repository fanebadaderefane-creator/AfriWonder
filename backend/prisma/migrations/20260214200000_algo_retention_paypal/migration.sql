-- Rétention algo, engagement vues qualifiées, paliers expansion, PayPal
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "avg_retention_pct" DOUBLE PRECISION;
ALTER TABLE "Video" ALTER COLUMN "algo_tier" SET DEFAULT 'test';

ALTER TABLE "QualifiedVideoView" ADD COLUMN IF NOT EXISTS "watch_percent" DOUBLE PRECISION;
ALTER TABLE "QualifiedVideoView" ADD COLUMN IF NOT EXISTS "scroll_slow" BOOLEAN;
ALTER TABLE "QualifiedVideoView" ADD COLUMN IF NOT EXISTS "interaction_detected" BOOLEAN;

ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "payment_method" TEXT NOT NULL DEFAULT 'orange_money';
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "paypal_email" TEXT;
ALTER TABLE "Withdrawal" ALTER COLUMN "orange_money_phone" DROP NOT NULL;
