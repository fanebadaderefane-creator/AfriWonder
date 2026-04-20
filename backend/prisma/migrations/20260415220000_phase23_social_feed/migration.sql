-- Phase 23 — sondages vidéo, challenges, collections sauvegardes, réactions commentaires, remix kind.

CREATE TABLE "VideoChallenge" (
    "id" TEXT NOT NULL,
    "hashtag" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sponsor_brand" TEXT,
    "is_sponsored" BOOLEAN NOT NULL DEFAULT false,
    "revenue_share_note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "VideoChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoChallenge_hashtag_key" ON "VideoChallenge"("hashtag");
CREATE INDEX "VideoChallenge_is_active_created_at_idx" ON "VideoChallenge"("is_active", "created_at");

ALTER TABLE "Video" ADD COLUMN "comment_subscribers_first" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Video" ADD COLUMN "remix_kind" TEXT;
ALTER TABLE "Video" ADD COLUMN "challenge_id" TEXT;

CREATE INDEX "Video_challenge_id_idx" ON "Video"("challenge_id");
ALTER TABLE "Video" ADD CONSTRAINT "Video_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "VideoChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "VideoPoll" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoPoll_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoPoll_video_id_key" ON "VideoPoll"("video_id");
CREATE INDEX "VideoPoll_expires_at_idx" ON "VideoPoll"("expires_at");

ALTER TABLE "VideoPoll" ADD CONSTRAINT "VideoPoll_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "VideoPollVote" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "option_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoPollVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoPollVote_poll_id_user_id_key" ON "VideoPollVote"("poll_id", "user_id");
CREATE INDEX "VideoPollVote_poll_id_idx" ON "VideoPollVote"("poll_id");

ALTER TABLE "VideoPollVote" ADD CONSTRAINT "VideoPollVote_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "VideoPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoPollVote" ADD CONSTRAINT "VideoPollVote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SaveCollection" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaveCollection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SaveCollection_user_id_idx" ON "SaveCollection"("user_id");

ALTER TABLE "SaveCollection" ADD CONSTRAINT "SaveCollection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Save" ADD COLUMN "collection_id" TEXT;
CREATE INDEX "Save_collection_id_idx" ON "Save"("collection_id");
ALTER TABLE "Save" ADD CONSTRAINT "Save_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "SaveCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CommentReaction" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'like',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommentReaction_comment_id_user_id_key" ON "CommentReaction"("comment_id", "user_id");
CREATE INDEX "CommentReaction_comment_id_idx" ON "CommentReaction"("comment_id");

ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
