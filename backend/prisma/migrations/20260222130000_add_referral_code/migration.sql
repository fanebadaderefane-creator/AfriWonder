-- Add referral_code column to User for the referral program
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referral_code" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_referral_code_key" ON "User"("referral_code");
