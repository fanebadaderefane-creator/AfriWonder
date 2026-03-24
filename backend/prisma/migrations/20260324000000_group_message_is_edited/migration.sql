-- Édition message groupe : tag "modifié" (CDC WhatsApp)
ALTER TABLE "GroupMessage" ADD COLUMN "is_edited" BOOLEAN NOT NULL DEFAULT false;
