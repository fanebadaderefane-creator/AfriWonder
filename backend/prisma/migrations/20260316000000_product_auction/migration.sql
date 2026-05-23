-- CPO 6.35 — Enchères produit

CREATE TABLE "ProductAuction" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "start_price" DOUBLE PRECISION NOT NULL,
    "current_bid" DOUBLE PRECISION NOT NULL,
    "current_bidder_id" TEXT,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAuction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductAuction_product_id_key" ON "ProductAuction"("product_id");
CREATE INDEX "ProductAuction_seller_id_idx" ON "ProductAuction"("seller_id");
CREATE INDEX "ProductAuction_status_idx" ON "ProductAuction"("status");
CREATE INDEX "ProductAuction_end_at_idx" ON "ProductAuction"("end_at");

ALTER TABLE "ProductAuction" ADD CONSTRAINT "ProductAuction_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAuction" ADD CONSTRAINT "ProductAuction_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAuction" ADD CONSTRAINT "ProductAuction_current_bidder_id_fkey" FOREIGN KEY ("current_bidder_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
