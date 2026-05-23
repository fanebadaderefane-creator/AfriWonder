-- CPO full complements: 3.9 STT, 5.9 VirtualCard, 5.23 InternationalTransfer, 5.39 PaymentPreauth, 7.19 CreatorContract, 4.40 E2E preference

-- User: E2E preference
ALTER TABLE "User" ADD COLUMN "messaging_e2e_enabled" BOOLEAN NOT NULL DEFAULT false;

-- VideoSubtitleGeneration (CPO 3.9)
CREATE TABLE IF NOT EXISTS "VideoSubtitleGeneration" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'auto',
    "result_url" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VideoSubtitleGeneration_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VideoSubtitleGeneration_video_id_idx" ON "VideoSubtitleGeneration"("video_id");
CREATE INDEX IF NOT EXISTS "VideoSubtitleGeneration_status_idx" ON "VideoSubtitleGeneration"("status");
ALTER TABLE "VideoSubtitleGeneration" ADD CONSTRAINT "VideoSubtitleGeneration_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- VirtualCard (CPO 5.9)
CREATE TABLE IF NOT EXISTS "VirtualCard" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'virtual',
    "status" TEXT NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "spending_limit" DOUBLE PRECISION,
    "external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VirtualCard_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VirtualCard_user_id_idx" ON "VirtualCard"("user_id");
CREATE INDEX IF NOT EXISTS "VirtualCard_status_idx" ON "VirtualCard"("status");
ALTER TABLE "VirtualCard" ADD CONSTRAINT "VirtualCard_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- InternationalTransfer (CPO 5.23)
CREATE TABLE IF NOT EXISTS "InternationalTransfer" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "recipient_country" TEXT NOT NULL,
    "recipient_iban" TEXT,
    "recipient_phone" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "target_currency" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reference" TEXT,
    "fee" DOUBLE PRECISION,
    "exchange_rate" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InternationalTransfer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "InternationalTransfer_sender_id_idx" ON "InternationalTransfer"("sender_id");
CREATE INDEX IF NOT EXISTS "InternationalTransfer_status_idx" ON "InternationalTransfer"("status");
ALTER TABLE "InternationalTransfer" ADD CONSTRAINT "InternationalTransfer_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PaymentPreauth (CPO 5.39)
CREATE TABLE IF NOT EXISTS "PaymentPreauth" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "order_id" TEXT,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3),
    "captured_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentPreauth_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PaymentPreauth_user_id_idx" ON "PaymentPreauth"("user_id");
CREATE INDEX IF NOT EXISTS "PaymentPreauth_order_id_idx" ON "PaymentPreauth"("order_id");
CREATE INDEX IF NOT EXISTS "PaymentPreauth_status_idx" ON "PaymentPreauth"("status");
ALTER TABLE "PaymentPreauth" ADD CONSTRAINT "PaymentPreauth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreatorContract (CPO 7.19)
CREATE TABLE IF NOT EXISTS "CreatorContract" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "reference" TEXT,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "notes" TEXT,
    "attachment_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreatorContract_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CreatorContract_creator_id_idx" ON "CreatorContract"("creator_id");
CREATE INDEX IF NOT EXISTS "CreatorContract_type_idx" ON "CreatorContract"("type");
ALTER TABLE "CreatorContract" ADD CONSTRAINT "CreatorContract_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
