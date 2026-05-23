-- CreateTable
CREATE TABLE "MonetizationRequest" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonetizationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonetizationRequest_creator_id_idx" ON "MonetizationRequest"("creator_id");

-- CreateIndex
CREATE INDEX "MonetizationRequest_status_idx" ON "MonetizationRequest"("status");

-- AddForeignKey
ALTER TABLE "MonetizationRequest" ADD CONSTRAINT "MonetizationRequest_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
