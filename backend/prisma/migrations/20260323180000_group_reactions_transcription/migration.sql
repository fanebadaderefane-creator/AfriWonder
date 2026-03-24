-- Réactions groupe + transcription vocale (1-1 et groupe)

ALTER TABLE "GroupMessage" ADD COLUMN "reactions" JSONB;
ALTER TABLE "GroupMessage" ADD COLUMN "transcription_text" TEXT;

ALTER TABLE "Message" ADD COLUMN "transcription_text" TEXT;
