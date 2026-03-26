-- AlterTable
ALTER TABLE "GroupMessage" ADD COLUMN "event_id" TEXT;

-- CreateIndex
CREATE INDEX "GroupMessage_event_id_idx" ON "GroupMessage"("event_id");

-- AddForeignKey
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
