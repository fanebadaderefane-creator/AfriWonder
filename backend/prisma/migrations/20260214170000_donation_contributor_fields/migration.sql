-- Add new donor fields for contributor info
ALTER TABLE "PlatformDonation" ADD COLUMN "donor_first_name" TEXT;
ALTER TABLE "PlatformDonation" ADD COLUMN "donor_age" INTEGER;
ALTER TABLE "PlatformDonation" ADD COLUMN "donor_country" TEXT;
ALTER TABLE "PlatformDonation" ADD COLUMN "donor_city" TEXT;
ALTER TABLE "PlatformDonation" ADD COLUMN "show_in_contributors" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "PlatformDonation_show_in_contributors_idx" ON "PlatformDonation"("show_in_contributors");
