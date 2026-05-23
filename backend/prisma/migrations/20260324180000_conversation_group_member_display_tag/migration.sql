-- Libellé optionnel visible dans le groupe uniquement (CDC type WhatsApp « tag »)
ALTER TABLE "ConversationGroupMember" ADD COLUMN IF NOT EXISTS "group_display_tag" TEXT;
