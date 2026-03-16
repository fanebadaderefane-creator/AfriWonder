-- CPO 6.36 — Négociation de prix

CREATE TABLE "ProductOffer" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "offered_price" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "seller_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "ProductOffer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductOffer_product_id_idx" ON "ProductOffer"("product_id");
CREATE INDEX "ProductOffer_buyer_id_idx" ON "ProductOffer"("buyer_id");
CREATE INDEX "ProductOffer_status_idx" ON "ProductOffer"("status");

ALTER TABLE "ProductOffer" ADD CONSTRAINT "ProductOffer_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOffer" ADD CONSTRAINT "ProductOffer_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
