-- CreateTable
CREATE TABLE "ConversationGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "last_message_text" TEXT,

    CONSTRAINT "ConversationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationGroupMember" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMessage" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "media_url" TEXT,
    "thumbnail_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "read_by" JSONB,
    "reply_to_id" TEXT,

    CONSTRAINT "GroupMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationGroup_created_by_id_idx" ON "ConversationGroup"("created_by_id");

-- CreateIndex
CREATE INDEX "ConversationGroup_last_message_at_idx" ON "ConversationGroup"("last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationGroupMember_group_id_user_id_key" ON "ConversationGroupMember"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "ConversationGroupMember_group_id_idx" ON "ConversationGroupMember"("group_id");

-- CreateIndex
CREATE INDEX "ConversationGroupMember_user_id_idx" ON "ConversationGroupMember"("user_id");

-- CreateIndex
CREATE INDEX "GroupMessage_group_id_idx" ON "GroupMessage"("group_id");

-- CreateIndex
CREATE INDEX "GroupMessage_sender_id_idx" ON "GroupMessage"("sender_id");

-- CreateIndex
CREATE INDEX "GroupMessage_created_at_idx" ON "GroupMessage"("created_at");

-- AddForeignKey
ALTER TABLE "ConversationGroup" ADD CONSTRAINT "ConversationGroup_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationGroupMember" ADD CONSTRAINT "ConversationGroupMember_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "ConversationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationGroupMember" ADD CONSTRAINT "ConversationGroupMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "ConversationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
