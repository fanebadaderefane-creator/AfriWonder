-- CreateTable CDC 2.2.6: Notation mutuelle vendeur→acheteur
CREATE TABLE "OrderBuyerReview" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderBuyerReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderBuyerReview_order_id_seller_id_key" ON "OrderBuyerReview"("order_id", "seller_id");

-- CreateIndex
CREATE INDEX "OrderBuyerReview_order_id_idx" ON "OrderBuyerReview"("order_id");

-- CreateIndex
CREATE INDEX "OrderBuyerReview_seller_id_idx" ON "OrderBuyerReview"("seller_id");

-- CreateIndex
CREATE INDEX "OrderBuyerReview_buyer_id_idx" ON "OrderBuyerReview"("buyer_id");

-- AddForeignKey
ALTER TABLE "OrderBuyerReview" ADD CONSTRAINT "OrderBuyerReview_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderBuyerReview" ADD CONSTRAINT "OrderBuyerReview_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderBuyerReview" ADD CONSTRAINT "OrderBuyerReview_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
