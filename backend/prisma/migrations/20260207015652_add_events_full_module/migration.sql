-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'XOF',
ADD COLUMN     "event_type" TEXT NOT NULL DEFAULT 'physical',
ADD COLUMN     "faq" JSONB,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_free" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "organizer_name" TEXT,
ADD COLUMN     "platform_fee_pct" DOUBLE PRECISION DEFAULT 10,
ADD COLUMN     "refund_policy" TEXT,
ADD COLUMN     "replay_url" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "virtual_url" TEXT,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "location" DROP NOT NULL,
ALTER COLUMN "price" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "insurance_amount" DOUBLE PRECISION,
ADD COLUMN     "live_id" TEXT,
ADD COLUMN     "logistics_fee" DOUBLE PRECISION,
ADD COLUMN     "priority_fee" DOUBLE PRECISION,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'marketplace';

-- CreateTable
CREATE TABLE "EventTicket" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ticket_type" TEXT NOT NULL DEFAULT 'standard',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "payment_method" TEXT,
    "transaction_id" TEXT,
    "qr_code" TEXT,
    "checked_in" BOOLEAN NOT NULL DEFAULT false,
    "checked_in_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAttendance" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'participant',
    "status" TEXT NOT NULL DEFAULT 'registered',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPayment" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "provider" TEXT NOT NULL,
    "transaction_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLike" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventComment" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventTicket_qr_code_key" ON "EventTicket"("qr_code");

-- CreateIndex
CREATE INDEX "EventTicket_event_id_idx" ON "EventTicket"("event_id");

-- CreateIndex
CREATE INDEX "EventTicket_user_id_idx" ON "EventTicket"("user_id");

-- CreateIndex
CREATE INDEX "EventTicket_qr_code_idx" ON "EventTicket"("qr_code");

-- CreateIndex
CREATE INDEX "EventTicket_payment_status_idx" ON "EventTicket"("payment_status");

-- CreateIndex
CREATE INDEX "EventAttendance_event_id_idx" ON "EventAttendance"("event_id");

-- CreateIndex
CREATE INDEX "EventAttendance_user_id_idx" ON "EventAttendance"("user_id");

-- CreateIndex
CREATE INDEX "EventAttendance_status_idx" ON "EventAttendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EventAttendance_event_id_user_id_key" ON "EventAttendance"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "EventPayment_event_id_idx" ON "EventPayment"("event_id");

-- CreateIndex
CREATE INDEX "EventPayment_user_id_idx" ON "EventPayment"("user_id");

-- CreateIndex
CREATE INDEX "EventPayment_transaction_id_idx" ON "EventPayment"("transaction_id");

-- CreateIndex
CREATE INDEX "EventPayment_status_idx" ON "EventPayment"("status");

-- CreateIndex
CREATE INDEX "EventLike_event_id_idx" ON "EventLike"("event_id");

-- CreateIndex
CREATE INDEX "EventLike_user_id_idx" ON "EventLike"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "EventLike_event_id_user_id_key" ON "EventLike"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "EventComment_event_id_idx" ON "EventComment"("event_id");

-- CreateIndex
CREATE INDEX "EventComment_user_id_idx" ON "EventComment"("user_id");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_event_type_idx" ON "Event"("event_type");

-- CreateIndex
CREATE INDEX "Event_location_idx" ON "Event"("location");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPayment" ADD CONSTRAINT "EventPayment_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPayment" ADD CONSTRAINT "EventPayment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLike" ADD CONSTRAINT "EventLike_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLike" ADD CONSTRAINT "EventLike_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventComment" ADD CONSTRAINT "EventComment_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventComment" ADD CONSTRAINT "EventComment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
