-- CDC confidentialité — accusés de lecture (option type WhatsApp)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "messaging_read_receipts_enabled" BOOLEAN NOT NULL DEFAULT true;
