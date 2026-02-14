-- CreateTable
CREATE TABLE "EarlyAccessWaitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EarlyAccessWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformDonation" (
    "id" TEXT NOT NULL,
    "amount_fcfa" INTEGER NOT NULL,
    "donor_email" TEXT,
    "donor_phone" TEXT,
    "donor_name" TEXT,
    "payment_method" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "PlatformDonation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFeedback" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "email" TEXT,
    "join_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "join_mailing" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EarlyAccessWaitlist_email_key" ON "EarlyAccessWaitlist"("email");

-- CreateIndex
CREATE INDEX "EarlyAccessWaitlist_email_idx" ON "EarlyAccessWaitlist"("email");

-- CreateIndex
CREATE INDEX "PlatformDonation_status_idx" ON "PlatformDonation"("status");

-- CreateIndex
CREATE INDEX "PlatformDonation_created_at_idx" ON "PlatformDonation"("created_at");

-- CreateIndex
CREATE INDEX "PlatformFeedback_type_idx" ON "PlatformFeedback"("type");

-- CreateIndex
CREATE INDEX "PlatformFeedback_created_at_idx" ON "PlatformFeedback"("created_at");

-- Seed early_access_max_users default (1000) via PlatformSettings
INSERT INTO "PlatformSettings" ("id", "key", "value", "updated_at")
SELECT 'ps-early_access_max_users', 'early_access_max_users', '1000'::jsonb, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PlatformSettings" WHERE key = 'early_access_max_users');
