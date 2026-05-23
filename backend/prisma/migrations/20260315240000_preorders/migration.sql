-- CPO 6.37 — Précommandes

ALTER TABLE "Product" ADD COLUMN "is_preorder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "preorder_available_at" TIMESTAMP(3);

CREATE TABLE "Preorder" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Preorder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Preorder_product_id_idx" ON "Preorder"("product_id");
CREATE INDEX "Preorder_user_id_idx" ON "Preorder"("user_id");
CREATE INDEX "Preorder_status_idx" ON "Preorder"("status");

ALTER TABLE "Preorder" ADD CONSTRAINT "Preorder_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Preorder" ADD CONSTRAINT "Preorder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
