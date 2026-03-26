-- AlterTable
ALTER TABLE "GroupMessage" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'sent';
ALTER TABLE "GroupMessage" ADD COLUMN "scheduled_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "GroupMessage_status_idx" ON "GroupMessage"("status");

-- CreateIndex
CREATE INDEX "GroupMessage_scheduled_at_idx" ON "GroupMessage"("scheduled_at");
