-- CDC Marketplace Mali P2 : géolocalisation, Q/R, formules vendeurs, poids
ALTER TABLE "Product" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN "weight_kg" DOUBLE PRECISION;

ALTER TABLE "SellerProfile" ADD COLUMN "subscription_tier" TEXT DEFAULT 'free';

CREATE TABLE "ProductQuestion" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT,
  "answered_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductQuestion_product_id_idx" ON "ProductQuestion"("product_id");
CREATE INDEX "ProductQuestion_user_id_idx" ON "ProductQuestion"("user_id");

ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
