-- CPO 2.19 StoryReaction, 2.21 StoryPoll/StoryPollVote, 4.17 deleted_for_all_at, 4.23 pinned_message_id

-- CreateTable StoryReaction
CREATE TABLE "StoryReaction" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '❤️',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable StoryPoll
CREATE TABLE "StoryPoll" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable StoryPollVote
CREATE TABLE "StoryPollVote" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "option_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryPollVote_pkey" PRIMARY KEY ("id")
);

-- AlterTable Message: deleted_for_all_at (CPO 4.17)
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "deleted_for_all_at" TIMESTAMP(3);

-- AlterTable Conversation: pinned_message_id (CPO 4.23)
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "pinned_message_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StoryReaction_story_id_user_id_key" ON "StoryReaction"("story_id", "user_id");
CREATE INDEX "StoryReaction_story_id_idx" ON "StoryReaction"("story_id");
CREATE INDEX "StoryReaction_user_id_idx" ON "StoryReaction"("user_id");

CREATE UNIQUE INDEX "StoryPoll_story_id_key" ON "StoryPoll"("story_id");
CREATE INDEX "StoryPoll_story_id_idx" ON "StoryPoll"("story_id");

CREATE UNIQUE INDEX "StoryPollVote_poll_id_user_id_key" ON "StoryPollVote"("poll_id", "user_id");
CREATE INDEX "StoryPollVote_poll_id_idx" ON "StoryPollVote"("poll_id");
CREATE INDEX "StoryPollVote_user_id_idx" ON "StoryPollVote"("user_id");

-- AddForeignKey
ALTER TABLE "StoryReaction" ADD CONSTRAINT "StoryReaction_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryReaction" ADD CONSTRAINT "StoryReaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryPoll" ADD CONSTRAINT "StoryPoll_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryPollVote" ADD CONSTRAINT "StoryPollVote_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "StoryPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryPollVote" ADD CONSTRAINT "StoryPollVote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_pinned_message_id_fkey" FOREIGN KEY ("pinned_message_id") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
