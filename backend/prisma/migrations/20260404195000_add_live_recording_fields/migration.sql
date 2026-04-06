ALTER TABLE "LiveStream"
ADD COLUMN IF NOT EXISTS "recording_resource_id" TEXT,
ADD COLUMN IF NOT EXISTS "recording_sid" TEXT;
