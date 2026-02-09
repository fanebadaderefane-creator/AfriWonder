-- CreateTable
CREATE TABLE IF NOT EXISTS "AbandonedCart" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "product_ids" JSONB NOT NULL,
    "items_snapshot" JSONB,
    "total_value" DOUBLE PRECISION NOT NULL,
    "abandoned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recovered" BOOLEAN NOT NULL DEFAULT false,
    "recovered_at" TIMESTAMP(3),
    "recovered_order_id" TEXT,

    CONSTRAINT "AbandonedCart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AbandonedCart_seller_id_idx" ON "AbandonedCart"("seller_id");
CREATE INDEX IF NOT EXISTS "AbandonedCart_abandoned_at_idx" ON "AbandonedCart"("abandoned_at");
CREATE INDEX IF NOT EXISTS "AbandonedCart_user_id_idx" ON "AbandonedCart"("user_id");
