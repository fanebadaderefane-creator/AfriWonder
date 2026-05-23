-- CDC Live — accusé réception âge (traçabilité) + cloche créateur (notifs prochains lives)
CREATE TABLE IF NOT EXISTS "LiveAgeAcknowledgment" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "restriction" TEXT NOT NULL DEFAULT '18+',
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveAgeAcknowledgment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LiveAgeAcknowledgment_live_id_user_id_key" ON "LiveAgeAcknowledgment"("live_id", "user_id");
CREATE INDEX IF NOT EXISTS "LiveAgeAcknowledgment_user_id_idx" ON "LiveAgeAcknowledgment"("user_id");

DO $$ BEGIN
 ALTER TABLE "LiveAgeAcknowledgment" ADD CONSTRAINT "LiveAgeAcknowledgment_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "LiveAgeAcknowledgment" ADD CONSTRAINT "LiveAgeAcknowledgment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "LiveCreatorBellSubscriber" (
    "id" TEXT NOT NULL,
    "subscriber_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveCreatorBellSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LiveCreatorBellSubscriber_subscriber_id_creator_id_key" ON "LiveCreatorBellSubscriber"("subscriber_id", "creator_id");
CREATE INDEX IF NOT EXISTS "LiveCreatorBellSubscriber_creator_id_idx" ON "LiveCreatorBellSubscriber"("creator_id");

DO $$ BEGIN
 ALTER TABLE "LiveCreatorBellSubscriber" ADD CONSTRAINT "LiveCreatorBellSubscriber_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "LiveCreatorBellSubscriber" ADD CONSTRAINT "LiveCreatorBellSubscriber_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
