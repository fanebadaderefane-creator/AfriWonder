-- Enterprise video views: 1 view / 30 min / user|device / video. Backend source of truth.
CREATE TABLE IF NOT EXISTS "VideoView" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "viewer_key" TEXT NOT NULL,
    "time_bucket" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VideoView_video_id_viewer_key_time_bucket_key" ON "VideoView"("video_id", "viewer_key", "time_bucket");
CREATE INDEX IF NOT EXISTS "VideoView_video_id_idx" ON "VideoView"("video_id");
CREATE INDEX IF NOT EXISTS "VideoView_video_id_time_bucket_idx" ON "VideoView"("video_id", "time_bucket");

ALTER TABLE "VideoView" ADD CONSTRAINT "VideoView_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
