-- CPO 6.38 — Alertes prix / disponibilité

CREATE TABLE "ProductAlert" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "target_price" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified_at" TIMESTAMP(3),

    CONSTRAINT "ProductAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductAlert_product_id_user_id_alert_type_key" ON "ProductAlert"("product_id", "user_id", "alert_type");
CREATE INDEX "ProductAlert_product_id_idx" ON "ProductAlert"("product_id");
CREATE INDEX "ProductAlert_user_id_idx" ON "ProductAlert"("user_id");
CREATE INDEX "ProductAlert_alert_type_idx" ON "ProductAlert"("alert_type");

ALTER TABLE "ProductAlert" ADD CONSTRAINT "ProductAlert_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAlert" ADD CONSTRAINT "ProductAlert_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
