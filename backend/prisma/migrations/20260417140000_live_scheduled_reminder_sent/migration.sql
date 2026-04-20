-- Rappel live programmé : éviter les notifications en boucle
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "scheduled_reminder_sent_at" TIMESTAMP(3);
