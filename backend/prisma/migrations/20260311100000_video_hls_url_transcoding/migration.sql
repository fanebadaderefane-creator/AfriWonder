-- AlterTable: add hls_url to Video
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "hls_url" TEXT;

-- AlterTable: add error_message to TranscodingJob and FK to Video
ALTER TABLE "TranscodingJob" ADD COLUMN IF NOT EXISTS "error_message" TEXT;

-- Add FK Video -> TranscodingJob (TranscodingJob.video_id -> Video.id) if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TranscodingJob_video_id_fkey'
  ) THEN
    ALTER TABLE "TranscodingJob" ADD CONSTRAINT "TranscodingJob_video_id_fkey"
      FOREIGN KEY ("video_id") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
