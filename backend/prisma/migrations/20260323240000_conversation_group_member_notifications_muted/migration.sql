-- Notifications groupe : sourdine par membre
ALTER TABLE "ConversationGroupMember" ADD COLUMN "notifications_muted" BOOLEAN NOT NULL DEFAULT false;
