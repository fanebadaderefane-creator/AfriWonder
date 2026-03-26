-- AlterTable
ALTER TABLE "Message" ADD COLUMN "event_id" TEXT;

-- CreateIndex
CREATE INDEX "Message_event_id_idx" ON "Message"("event_id");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
