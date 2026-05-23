-- CreateTable: EventTicketType (stock par type)
CREATE TABLE "event_ticket_types" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "quantity_available" INTEGER NOT NULL DEFAULT 0,
    "quantity_sold" INTEGER NOT NULL DEFAULT 0,
    "max_per_user" INTEGER,
    "sale_start" TIMESTAMP(3),
    "sale_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TicketLock (lock 2 min checkout)
CREATE TABLE "ticket_locks" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "ticket_type" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_locks_pkey" PRIMARY KEY ("id")
);

-- AlterTable EventTicket: add event_ticket_type_id, qr_signature, scan_count (table name = "EventTicket" from initial migration)
ALTER TABLE "EventTicket" ADD COLUMN IF NOT EXISTS "event_ticket_type_id" TEXT;
ALTER TABLE "EventTicket" ADD COLUMN IF NOT EXISTS "qr_signature" TEXT;
ALTER TABLE "EventTicket" ADD COLUMN IF NOT EXISTS "scan_count" INTEGER NOT NULL DEFAULT 0;

-- Unique constraint EventTicketType(event_id, name)
CREATE UNIQUE INDEX IF NOT EXISTS "event_ticket_types_event_id_name_key" ON "event_ticket_types"("event_id", "name");

-- Indexes
CREATE INDEX IF NOT EXISTS "event_ticket_types_event_id_idx" ON "event_ticket_types"("event_id");
CREATE INDEX IF NOT EXISTS "ticket_locks_event_id_idx" ON "ticket_locks"("event_id");
CREATE INDEX IF NOT EXISTS "ticket_locks_user_id_idx" ON "ticket_locks"("user_id");
CREATE INDEX IF NOT EXISTS "ticket_locks_expires_at_idx" ON "ticket_locks"("expires_at");

-- FK EventTicketType -> Event (table name = "Event" from initial migration)
ALTER TABLE "event_ticket_types" ADD CONSTRAINT "event_ticket_types_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK TicketLock -> Event
ALTER TABLE "ticket_locks" ADD CONSTRAINT "ticket_locks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK EventTicket.event_ticket_type_id -> EventTicketType
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_event_ticket_type_id_fkey" FOREIGN KEY ("event_ticket_type_id") REFERENCES "event_ticket_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "EventTicket_event_ticket_type_id_idx" ON "EventTicket"("event_ticket_type_id");
