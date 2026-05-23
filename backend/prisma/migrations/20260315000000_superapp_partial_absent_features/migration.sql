-- AfriWonder: fonctionnalités Partiel/Absent -> complètes (posts, mentions, ephemeral, QR, chapitres, remix, etc.)

-- Post (feed social texte/image)
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "text" TEXT,
    "image_url" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Post_user_id_idx" ON "Post"("user_id");
CREATE INDEX "Post_visibility_created_at_idx" ON "Post"("visibility", "created_at");
ALTER TABLE "Post" ADD CONSTRAINT "Post_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comment: mentions
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "mention_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Video: remix, sous-titres, téléchargement, premium
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "remix_of_id" TEXT;
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "subtitle_url" TEXT;
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "download_allowed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "is_premium" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Video_remix_of_id_idx" ON "Video"("remix_of_id");
ALTER TABLE "Video" ADD CONSTRAINT "Video_remix_of_id_fkey" FOREIGN KEY ("remix_of_id") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- VideoChapter
CREATE TABLE "VideoChapter" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start_time_sec" INTEGER NOT NULL,
    "end_time_sec" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoChapter_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VideoChapter_video_id_idx" ON "VideoChapter"("video_id");
ALTER TABLE "VideoChapter" ADD CONSTRAINT "VideoChapter_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Message: éphémère, localisation, contact, sticker
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "is_ephemeral" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "location_lat" DOUBLE PRECISION;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "location_lng" DOUBLE PRECISION;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "location_label" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "contact_user_id" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "contact_name" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "sticker_url" TEXT;
CREATE INDEX IF NOT EXISTS "Message_expires_at_idx" ON "Message"("expires_at");

-- PaymentRequest (QR paiement)
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "qr_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "paid_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentRequest_qr_token_key" ON "PaymentRequest"("qr_token");
CREATE INDEX "PaymentRequest_from_user_id_idx" ON "PaymentRequest"("from_user_id");
CREATE INDEX "PaymentRequest_status_idx" ON "PaymentRequest"("status");
CREATE INDEX "PaymentRequest_expires_at_idx" ON "PaymentRequest"("expires_at");
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BusinessPage
CREATE TABLE "BusinessPage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "avatar_url" TEXT,
    "cover_url" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessPage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BusinessPage_user_id_key" ON "BusinessPage"("user_id");
CREATE UNIQUE INDEX "BusinessPage_slug_key" ON "BusinessPage"("slug");
CREATE INDEX "BusinessPage_user_id_idx" ON "BusinessPage"("user_id");
CREATE INDEX "BusinessPage_slug_idx" ON "BusinessPage"("slug");
ALTER TABLE "BusinessPage" ADD CONSTRAINT "BusinessPage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LiveStreamProduct (live commerce)
CREATE TABLE "LiveStreamProduct" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveStreamProduct_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LiveStreamProduct_live_id_product_id_key" ON "LiveStreamProduct"("live_id", "product_id");
CREATE INDEX "LiveStreamProduct_live_id_idx" ON "LiveStreamProduct"("live_id");
CREATE INDEX "LiveStreamProduct_product_id_idx" ON "LiveStreamProduct"("product_id");
ALTER TABLE "LiveStreamProduct" ADD CONSTRAINT "LiveStreamProduct_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveStreamProduct" ADD CONSTRAINT "LiveStreamProduct_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Product: delivery_url (produits digitaux)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "delivery_url" TEXT;

-- CashbackConfig
CREATE TABLE "CashbackConfig" (
    "id" TEXT NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "min_order_amount" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CashbackConfig_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CashbackConfig_is_active_idx" ON "CashbackConfig"("is_active");

-- ChatBot
CREATE TABLE "ChatBot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "welcome_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatBot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChatBot_username_key" ON "ChatBot"("username");
CREATE INDEX "ChatBot_username_idx" ON "ChatBot"("username");
CREATE INDEX "ChatBot_is_active_idx" ON "ChatBot"("is_active");

-- Order: cashback
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cashback_amount" DOUBLE PRECISION NOT NULL DEFAULT 0;
