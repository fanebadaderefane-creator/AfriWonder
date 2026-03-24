-- CPO 8.25 — Notes et avis sur une mini-app
-- mini_apps doit exister avant la FK (absent des migrations précédentes → shadow DB P1014)

CREATE TABLE IF NOT EXISTS "mini_apps" (
    "id" TEXT NOT NULL,
    "developer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon_url" TEXT,
    "category" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "installs_count" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviews_count" INTEGER NOT NULL DEFAULT 0,
    "price" TEXT NOT NULL DEFAULT 'gratuit',
    "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "screenshots" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "bundle_url" TEXT,
    "bundle_hash" TEXT,
    "commission_rate" DOUBLE PRECISION NOT NULL,
    "gmv_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenue_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commission_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_transaction_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mini_apps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "mini_apps_developer_id_idx" ON "mini_apps"("developer_id");
CREATE INDEX IF NOT EXISTS "mini_apps_category_idx" ON "mini_apps"("category");
CREATE INDEX IF NOT EXISTS "mini_apps_status_idx" ON "mini_apps"("status");
CREATE INDEX IF NOT EXISTS "mini_apps_featured_idx" ON "mini_apps"("featured");
CREATE INDEX IF NOT EXISTS "mini_apps_installs_count_idx" ON "mini_apps"("installs_count");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mini_apps_developer_id_fkey'
  ) THEN
    ALTER TABLE "mini_apps"
      ADD CONSTRAINT "mini_apps_developer_id_fkey"
      FOREIGN KEY ("developer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE "MiniAppReview" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MiniAppReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MiniAppReview_mini_app_id_user_id_key" ON "MiniAppReview"("mini_app_id", "user_id");
CREATE INDEX "MiniAppReview_mini_app_id_idx" ON "MiniAppReview"("mini_app_id");
CREATE INDEX "MiniAppReview_user_id_idx" ON "MiniAppReview"("user_id");

ALTER TABLE "MiniAppReview" ADD CONSTRAINT "MiniAppReview_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MiniAppReview" ADD CONSTRAINT "MiniAppReview_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
