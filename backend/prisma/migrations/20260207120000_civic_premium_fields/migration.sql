-- CivicPetition: premium / boost / featured
ALTER TABLE "CivicPetition" ADD COLUMN IF NOT EXISTS "is_boosted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CivicPetition" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CivicPetition" ADD COLUMN IF NOT EXISTS "featured_until" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "CivicPetition_is_featured_idx" ON "CivicPetition"("is_featured");
