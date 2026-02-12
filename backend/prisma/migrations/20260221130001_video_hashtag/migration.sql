-- CreateTable
CREATE TABLE "VideoHashtag" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "tag_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoHashtag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoHashtag_video_id_tag_name_key" ON "VideoHashtag"("video_id", "tag_name");

-- CreateIndex
CREATE INDEX "VideoHashtag_tag_name_idx" ON "VideoHashtag"("tag_name");

-- CreateIndex
CREATE INDEX "VideoHashtag_video_id_idx" ON "VideoHashtag"("video_id");

-- AddForeignKey
ALTER TABLE "VideoHashtag" ADD CONSTRAINT "VideoHashtag_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
