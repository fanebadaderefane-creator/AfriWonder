/*
  Warnings:

  - You are about to drop the column `amount` on the `LoanRequest` table. All the data in the column will be lost.
  - You are about to drop the column `repayment_period` on the `LoanRequest` table. All the data in the column will be lost.
  - You are about to drop the column `cover_image` on the `NewsArticle` table. All the data in the column will be lost.
  - You are about to drop the column `views_count` on the `NewsArticle` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `NewsArticle` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[campaign_id]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.
  - Made the column `progress_percentage` on table `Enrollment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `type` on table `Message` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `Message` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `slug` to the `NewsArticle` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable (Certificate.verification_token may not exist in shadow DB)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Certificate' AND column_name = 'verification_token') THEN
    ALTER TABLE "Certificate" ALTER COLUMN "verification_token" DROP DEFAULT;
  END IF;
END $$;

-- AlterTable (Enrollment.progress_percentage may not exist in shadow DB)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Enrollment' AND column_name = 'progress_percentage') THEN
    ALTER TABLE "Enrollment" ALTER COLUMN "progress_percentage" SET NOT NULL;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "speakers" JSONB;

-- AlterTable
ALTER TABLE "Gift" ADD COLUMN     "animation_url" TEXT,
ADD COLUMN     "coin_value" DOUBLE PRECISION,
ADD COLUMN     "rarity" TEXT;

-- AlterTable (LiveAnalytics may not exist yet in shadow DB - created in later migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'LiveAnalytics') THEN
    ALTER TABLE "LiveAnalytics" ADD COLUMN IF NOT EXISTS "retention_buckets" JSONB;
    ALTER TABLE "LiveAnalytics" ADD COLUMN IF NOT EXISTS "viewer_countries" JSONB;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "LiveChat" ADD COLUMN     "is_moderated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_pinned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LiveStream" ADD COLUMN     "language" TEXT,
ADD COLUMN     "playback_url" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "rtmp_url" TEXT,
ADD COLUMN     "scheduled_at" TIMESTAMP(3),
ADD COLUMN     "stream_key" TEXT,
ADD COLUMN     "total_watch_time" INTEGER;

-- AlterTable LiveViewer (table created in later migration, columns added there)
-- Removed to fix migration order issue

-- AlterTable
ALTER TABLE "LoanRequest" DROP COLUMN "amount",
DROP COLUMN "repayment_period",
ALTER COLUMN "status" SET DEFAULT 'active';

-- AlterTable (Message.type and Message.status may not exist yet - added in later migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Message' AND column_name = 'type') THEN
    ALTER TABLE "Message" ALTER COLUMN "type" SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Message' AND column_name = 'status') THEN
    ALTER TABLE "Message" ALTER COLUMN "status" SET NOT NULL;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "NewsArticle" DROP COLUMN "cover_image",
DROP COLUMN "views_count",
ADD COLUMN     "author_avatar" TEXT,
ADD COLUMN     "author_name" TEXT,
ADD COLUMN     "breaking_expiry_at" TIMESTAMP(3),
ADD COLUMN     "breaking_priority" INTEGER,
ADD COLUMN     "comments_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "excerpt" TEXT,
ADD COLUMN     "featured_image" TEXT,
ADD COLUMN     "is_breaking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_premium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_sponsored" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'FR',
ADD COLUMN     "likes_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reading_time" INTEGER,
ADD COLUMN     "seo_description" TEXT,
ADD COLUMN     "seo_title" TEXT,
ADD COLUMN     "shares_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "verified_source_id" TEXT,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;

-- AlterTable (UserPresence may not exist yet - created in later migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'UserPresence') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'UserPresence' AND column_name = 'last_seen') THEN
      ALTER TABLE "UserPresence" ALTER COLUMN "last_seen" DROP DEFAULT;
    END IF;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "WalletSecurity" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ArticleView" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "user_id" TEXT,
    "ip_hash" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleLike" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleComment" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "content" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_reported" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNewsPreference" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "preferred_categories" JSONB,
    "preferred_country" TEXT,
    "preferred_language" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNewsPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendingArticle" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendingArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiedSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "trust_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifiedSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsPremiumSubscription" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsPremiumSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleView_article_id_idx" ON "ArticleView"("article_id");

-- CreateIndex
CREATE INDEX "ArticleView_user_id_idx" ON "ArticleView"("user_id");

-- CreateIndex
CREATE INDEX "ArticleView_viewed_at_idx" ON "ArticleView"("viewed_at");

-- CreateIndex
CREATE INDEX "ArticleView_article_id_ip_hash_idx" ON "ArticleView"("article_id", "ip_hash");

-- CreateIndex
CREATE INDEX "ArticleLike_article_id_idx" ON "ArticleLike"("article_id");

-- CreateIndex
CREATE INDEX "ArticleLike_user_id_idx" ON "ArticleLike"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleLike_article_id_user_id_key" ON "ArticleLike"("article_id", "user_id");

-- CreateIndex
CREATE INDEX "ArticleComment_article_id_idx" ON "ArticleComment"("article_id");

-- CreateIndex
CREATE INDEX "ArticleComment_user_id_idx" ON "ArticleComment"("user_id");

-- CreateIndex
CREATE INDEX "ArticleComment_parent_id_idx" ON "ArticleComment"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserNewsPreference_user_id_key" ON "UserNewsPreference"("user_id");

-- CreateIndex
CREATE INDEX "UserNewsPreference_user_id_idx" ON "UserNewsPreference"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "TrendingArticle_article_id_key" ON "TrendingArticle"("article_id");

-- CreateIndex
CREATE INDEX "TrendingArticle_score_idx" ON "TrendingArticle"("score");

-- CreateIndex
CREATE INDEX "VerifiedSource_name_idx" ON "VerifiedSource"("name");

-- CreateIndex
CREATE INDEX "NewsPremiumSubscription_user_id_idx" ON "NewsPremiumSubscription"("user_id");

-- CreateIndex
CREATE INDEX "NewsPremiumSubscription_expires_at_idx" ON "NewsPremiumSubscription"("expires_at");

-- CreateIndex (only if column exists for shadow DB compatibility)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Certificate' AND column_name = 'verification_token') THEN
    CREATE INDEX IF NOT EXISTS "Certificate_verification_token_idx" ON "Certificate"("verification_token");
  END IF;
END $$;

-- CreateIndex
CREATE INDEX "Gift_rarity_idx" ON "Gift"("rarity");

-- CreateIndex
CREATE INDEX "LiveChat_is_pinned_idx" ON "LiveChat"("is_pinned");

-- CreateIndex
CREATE INDEX "LiveStream_room_id_idx" ON "LiveStream"("room_id");

-- CreateIndex
CREATE INDEX "LiveStream_region_idx" ON "LiveStream"("region");

-- CreateIndex
CREATE INDEX "LiveStream_category_idx" ON "LiveStream"("category");

-- CreateIndex
CREATE INDEX "LoanRequest_deadline_idx" ON "LoanRequest"("deadline");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NewsArticle_slug_key" ON "NewsArticle"("slug");

-- CreateIndex
CREATE INDEX "NewsArticle_country_idx" ON "NewsArticle"("country");

-- CreateIndex
CREATE INDEX "NewsArticle_language_idx" ON "NewsArticle"("language");

-- CreateIndex
CREATE INDEX "NewsArticle_status_idx" ON "NewsArticle"("status");

-- CreateIndex
CREATE INDEX "NewsArticle_is_breaking_idx" ON "NewsArticle"("is_breaking");

-- CreateIndex
CREATE INDEX "NewsArticle_published_at_idx" ON "NewsArticle"("published_at");

-- CreateIndex
CREATE INDEX "NewsArticle_verified_source_id_idx" ON "NewsArticle"("verified_source_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Wallet_campaign_id_key" ON "Wallet"("campaign_id");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRequest" ADD CONSTRAINT "LoanRequest_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicPetition" ADD CONSTRAINT "CivicPetition_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetitionSignature" ADD CONSTRAINT "PetitionSignature_signer_id_fkey" FOREIGN KEY ("signer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_verified_source_id_fkey" FOREIGN KEY ("verified_source_id") REFERENCES "VerifiedSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleView" ADD CONSTRAINT "ArticleView_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleView" ADD CONSTRAINT "ArticleView_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleLike" ADD CONSTRAINT "ArticleLike_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleLike" ADD CONSTRAINT "ArticleLike_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ArticleComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNewsPreference" ADD CONSTRAINT "UserNewsPreference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendingArticle" ADD CONSTRAINT "TrendingArticle_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPremiumSubscription" ADD CONSTRAINT "NewsPremiumSubscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
