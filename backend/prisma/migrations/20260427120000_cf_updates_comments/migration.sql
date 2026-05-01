-- Fil d'updates porteur + commentaires discussion (crowdfunding)
CREATE TABLE IF NOT EXISTS "cf_campaign_updates" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cf_campaign_updates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cf_campaign_updates_campaign_id_idx" ON "cf_campaign_updates"("campaign_id");
ALTER TABLE "cf_campaign_updates" ADD CONSTRAINT "cf_campaign_updates_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "cf_campaign_comments" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cf_campaign_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cf_campaign_comments_campaign_id_idx" ON "cf_campaign_comments"("campaign_id");
CREATE INDEX IF NOT EXISTS "cf_campaign_comments_user_id_idx" ON "cf_campaign_comments"("user_id");
ALTER TABLE "cf_campaign_comments" ADD CONSTRAINT "cf_campaign_comments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cf_campaign_comments" ADD CONSTRAINT "cf_campaign_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cf_campaign_comments" ADD CONSTRAINT "cf_campaign_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "cf_campaign_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
