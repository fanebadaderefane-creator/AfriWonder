-- Lien d'invitation groupe (CDC WhatsApp)
ALTER TABLE "ConversationGroup" ADD COLUMN "invite_token" TEXT;
CREATE UNIQUE INDEX "ConversationGroup_invite_token_key" ON "ConversationGroup"("invite_token") WHERE "invite_token" IS NOT NULL;
