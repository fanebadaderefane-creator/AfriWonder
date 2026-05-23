-- CDC Live Streaming Mali: Grille sanctions - 3 strikes = ban
CREATE TABLE IF NOT EXISTS "UserStrike" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "infraction" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "reason" TEXT NOT NULL,
    "context_type" TEXT,
    "context_id" TEXT,
    "issued_by" TEXT NOT NULL,
    "suspension_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStrike_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserStrike_user_id_idx" ON "UserStrike"("user_id");
CREATE INDEX IF NOT EXISTS "UserStrike_infraction_idx" ON "UserStrike"("infraction");
CREATE INDEX IF NOT EXISTS "UserStrike_created_at_idx" ON "UserStrike"("created_at");

ALTER TABLE "UserStrike" ADD CONSTRAINT "UserStrike_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
