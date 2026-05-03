-- Verticale restauration (phase 1) : statut compte restaurant, commission, ventilation commande, retrait / split.
ALTER TABLE "Restaurant" ADD COLUMN "account_status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Restaurant" ADD COLUMN "platform_commission_pct" DOUBLE PRECISION NOT NULL DEFAULT 10;
ALTER TABLE "Restaurant" ADD COLUMN "kyc_status" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "supports_pickup" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Restaurant_account_status_idx" ON "Restaurant"("account_status");

ALTER TABLE "FoodOrder" ADD COLUMN "platform_fee_amount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "FoodOrder" ADD COLUMN "restaurant_payout_amount" DOUBLE PRECISION;
ALTER TABLE "FoodOrder" ADD COLUMN "courier_payout_amount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "FoodOrder" ADD COLUMN "fulfillment_type" TEXT NOT NULL DEFAULT 'delivery';
ALTER TABLE "FoodOrder" ADD COLUMN "split_applied_at" TIMESTAMP(3);
