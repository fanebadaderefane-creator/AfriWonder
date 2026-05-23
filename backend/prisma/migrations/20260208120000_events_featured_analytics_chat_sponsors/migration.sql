-- AlterTable Event: featured_until, sponsors
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "featured_until" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "sponsors" JSONB;

-- AlterTable EventTicket: city, source (analytics)
ALTER TABLE "EventTicket" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "EventTicket" ADD COLUMN IF NOT EXISTS "source" TEXT;

-- AlterTable EventPayment: city, source (analytics)
ALTER TABLE "EventPayment" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "EventPayment" ADD COLUMN IF NOT EXISTS "source" TEXT;

-- CreateTable EventFeaturedPayment
CREATE TABLE IF NOT EXISTS "EventFeaturedPayment" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "featured_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventFeaturedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable EventChatMessage
CREATE TABLE IF NOT EXISTS "EventChatMessage" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EventFeaturedPayment_event_id_idx" ON "EventFeaturedPayment"("event_id");
CREATE INDEX IF NOT EXISTS "EventFeaturedPayment_user_id_idx" ON "EventFeaturedPayment"("user_id");
CREATE INDEX IF NOT EXISTS "EventFeaturedPayment_status_idx" ON "EventFeaturedPayment"("status");

CREATE INDEX IF NOT EXISTS "EventChatMessage_event_id_idx" ON "EventChatMessage"("event_id");
CREATE INDEX IF NOT EXISTS "EventChatMessage_user_id_idx" ON "EventChatMessage"("user_id");
CREATE INDEX IF NOT EXISTS "EventChatMessage_created_at_idx" ON "EventChatMessage"("created_at");

ALTER TABLE "EventFeaturedPayment" ADD CONSTRAINT "EventFeaturedPayment_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventFeaturedPayment" ADD CONSTRAINT "EventFeaturedPayment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventChatMessage" ADD CONSTRAINT "EventChatMessage_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventChatMessage" ADD CONSTRAINT "EventChatMessage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
