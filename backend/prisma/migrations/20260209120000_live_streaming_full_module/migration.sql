-- AlterTable LiveStream: stream_token, thumbnail_url, replay_url, total_messages, total_likes
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "stream_token" TEXT;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "thumbnail_url" TEXT;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "replay_url" TEXT;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "total_messages" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "total_likes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable LiveViewer
CREATE TABLE IF NOT EXISTS "LiveViewer" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "watch_duration" INTEGER,
    "country" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveViewer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LiveViewer_live_id_user_id_session_id_key" ON "LiveViewer"("live_id", "user_id", "session_id");
CREATE INDEX IF NOT EXISTS "LiveViewer_live_id_idx" ON "LiveViewer"("live_id");
CREATE INDEX IF NOT EXISTS "LiveViewer_user_id_idx" ON "LiveViewer"("user_id");
CREATE INDEX IF NOT EXISTS "LiveViewer_is_active_idx" ON "LiveViewer"("is_active");

-- CreateTable LiveModerationSettings
CREATE TABLE IF NOT EXISTS "LiveModerationSettings" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "slow_mode_seconds" INTEGER NOT NULL DEFAULT 0,
    "comments_enabled" BOOLEAN NOT NULL DEFAULT true,
    "followers_only" BOOLEAN NOT NULL DEFAULT false,
    "banned_words" JSONB,

    CONSTRAINT "LiveModerationSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LiveModerationSettings_live_id_key" ON "LiveModerationSettings"("live_id");
CREATE INDEX IF NOT EXISTS "LiveModerationSettings_live_id_idx" ON "LiveModerationSettings"("live_id");

-- CreateTable LiveModerator
CREATE TABLE IF NOT EXISTS "LiveModerator" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveModerator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LiveModerator_live_id_user_id_key" ON "LiveModerator"("live_id", "user_id");
CREATE INDEX IF NOT EXISTS "LiveModerator_live_id_idx" ON "LiveModerator"("live_id");
CREATE INDEX IF NOT EXISTS "LiveModerator_user_id_idx" ON "LiveModerator"("user_id");

-- CreateTable LiveLike
CREATE TABLE IF NOT EXISTS "LiveLike" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveLike_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LiveLike_live_id_idx" ON "LiveLike"("live_id");
CREATE INDEX IF NOT EXISTS "LiveLike_user_id_idx" ON "LiveLike"("user_id");

-- CreateTable LiveAnalytics
CREATE TABLE IF NOT EXISTS "LiveAnalytics" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "total_viewers" INTEGER NOT NULL DEFAULT 0,
    "peak_viewers" INTEGER NOT NULL DEFAULT 0,
    "unique_viewers" INTEGER NOT NULL DEFAULT 0,
    "total_gifts_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_messages" INTEGER NOT NULL DEFAULT 0,
    "total_likes" INTEGER NOT NULL DEFAULT 0,
    "average_watch_time_seconds" INTEGER,
    "duration_seconds" INTEGER,
    "viewer_countries" JSONB,
    "retention_buckets" JSONB,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LiveAnalytics_live_id_key" ON "LiveAnalytics"("live_id");
CREATE INDEX IF NOT EXISTS "LiveAnalytics_live_id_idx" ON "LiveAnalytics"("live_id");

-- CreateTable LiveTopDonor
CREATE TABLE IF NOT EXISTS "LiveTopDonor" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveTopDonor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LiveTopDonor_live_id_user_id_key" ON "LiveTopDonor"("live_id", "user_id");
CREATE INDEX IF NOT EXISTS "LiveTopDonor_live_id_idx" ON "LiveTopDonor"("live_id");
CREATE INDEX IF NOT EXISTS "LiveTopDonor_user_id_idx" ON "LiveTopDonor"("user_id");

-- CreateTable CreatorLevel
CREATE TABLE IF NOT EXISTS "CreatorLevel" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "total_earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_streams" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorLevel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CreatorLevel_user_id_key" ON "CreatorLevel"("user_id");
CREATE INDEX IF NOT EXISTS "CreatorLevel_user_id_idx" ON "CreatorLevel"("user_id");

-- AddForeignKey LiveViewer
ALTER TABLE "LiveViewer" ADD CONSTRAINT "LiveViewer_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveViewer" ADD CONSTRAINT "LiveViewer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey LiveModerationSettings
ALTER TABLE "LiveModerationSettings" ADD CONSTRAINT "LiveModerationSettings_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey LiveModerator
ALTER TABLE "LiveModerator" ADD CONSTRAINT "LiveModerator_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveModerator" ADD CONSTRAINT "LiveModerator_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey LiveLike
ALTER TABLE "LiveLike" ADD CONSTRAINT "LiveLike_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveLike" ADD CONSTRAINT "LiveLike_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey LiveAnalytics
ALTER TABLE "LiveAnalytics" ADD CONSTRAINT "LiveAnalytics_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey LiveTopDonor
ALTER TABLE "LiveTopDonor" ADD CONSTRAINT "LiveTopDonor_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveTopDonor" ADD CONSTRAINT "LiveTopDonor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey CreatorLevel
ALTER TABLE "CreatorLevel" ADD CONSTRAINT "CreatorLevel_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
