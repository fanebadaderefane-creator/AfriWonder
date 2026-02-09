-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "phone_number" TEXT;

-- CreateTable
CREATE TABLE "VideoTip" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "payment_method" TEXT NOT NULL DEFAULT 'orange_money',
    "transaction_id" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "africonnect_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creator_earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoTip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "orange_money_phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transaction_reference" TEXT,
    "admin_notes" TEXT,
    "processed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoTip_video_id_idx" ON "VideoTip"("video_id");

-- CreateIndex
CREATE INDEX "VideoTip_sender_id_idx" ON "VideoTip"("sender_id");

-- CreateIndex
CREATE INDEX "VideoTip_receiver_id_idx" ON "VideoTip"("receiver_id");

-- CreateIndex
CREATE INDEX "VideoTip_status_idx" ON "VideoTip"("status");

-- CreateIndex
CREATE INDEX "VideoTip_created_at_idx" ON "VideoTip"("created_at");

-- CreateIndex
CREATE INDEX "Withdrawal_user_id_idx" ON "Withdrawal"("user_id");

-- CreateIndex
CREATE INDEX "Withdrawal_status_idx" ON "Withdrawal"("status");

-- CreateIndex
CREATE INDEX "Withdrawal_created_at_idx" ON "Withdrawal"("created_at");

-- CreateIndex
CREATE INDEX "Withdrawal_orange_money_phone_idx" ON "Withdrawal"("orange_money_phone");

-- CreateIndex
CREATE INDEX "Transaction_payment_method_idx" ON "Transaction"("payment_method");

-- AddForeignKey
ALTER TABLE "VideoTip" ADD CONSTRAINT "VideoTip_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTip" ADD CONSTRAINT "VideoTip_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTip" ADD CONSTRAINT "VideoTip_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTip" ADD CONSTRAINT "VideoTip_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerWallet" ADD CONSTRAINT "SellerWallet_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
