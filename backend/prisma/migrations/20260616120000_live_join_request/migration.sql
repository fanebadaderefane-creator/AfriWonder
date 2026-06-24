-- Live privé : demandes d'accès spectateur (acceptation créateur)
CREATE TABLE IF NOT EXISTS "LiveJoinRequest" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "LiveJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LiveJoinRequest_live_id_user_id_key" ON "LiveJoinRequest"("live_id", "user_id");
CREATE INDEX IF NOT EXISTS "LiveJoinRequest_live_id_status_idx" ON "LiveJoinRequest"("live_id", "status");
CREATE INDEX IF NOT EXISTS "LiveJoinRequest_user_id_idx" ON "LiveJoinRequest"("user_id");

DO $$ BEGIN
  ALTER TABLE "LiveJoinRequest" ADD CONSTRAINT "LiveJoinRequest_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "LiveJoinRequest" ADD CONSTRAINT "LiveJoinRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
