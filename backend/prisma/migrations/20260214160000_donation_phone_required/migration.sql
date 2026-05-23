-- Add donor_message column
ALTER TABLE "PlatformDonation" ADD COLUMN "donor_message" TEXT;

-- Make donor_phone required: set placeholder for existing nulls, then alter
UPDATE "PlatformDonation" SET "donor_phone" = 'pending' WHERE "donor_phone" IS NULL OR "donor_phone" = '';
ALTER TABLE "PlatformDonation" ALTER COLUMN "donor_phone" SET NOT NULL;
