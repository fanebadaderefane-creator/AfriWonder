-- CDC: Auto-unpin messages premium (30s) / VIP (2min)
ALTER TABLE "LiveChat" ADD COLUMN IF NOT EXISTS "pin_expires_at" TIMESTAMP(3);
