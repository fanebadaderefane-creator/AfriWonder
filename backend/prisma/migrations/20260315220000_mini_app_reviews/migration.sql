-- CPO 8.25 — Notes et avis sur une mini-app

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
