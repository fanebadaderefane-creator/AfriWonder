-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'XOF',
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "location_type" TEXT NOT NULL DEFAULT 'both',
ADD COLUMN     "total_bookings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "travel_fee" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ServiceProvider" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_badge" TEXT,
    "kyc_status" TEXT NOT NULL DEFAULT 'pending',
    "kyc_document_url" TEXT,
    "kyc_selfie_url" TEXT,
    "service_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "service_radius_km" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "location_type" TEXT NOT NULL DEFAULT 'both',
    "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_bookings" INTEGER NOT NULL DEFAULT 0,
    "total_earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payout_method" TEXT,
    "payout_account" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceBooking" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "booking_date" TIMESTAMP(3) NOT NULL,
    "booking_time" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "location_type" TEXT NOT NULL,
    "customer_address_id" TEXT,
    "provider_address_id" TEXT,
    "total_price" DOUBLE PRECISION NOT NULL,
    "platform_fee" DOUBLE PRECISION NOT NULL,
    "provider_earnings" DOUBLE PRECISION NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "payment_method" TEXT,
    "payment_transaction_id" TEXT,
    "deposit_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deposit_paid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "cancellation_reason" TEXT,
    "cancelled_by" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAvailability" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_recurring" BOOLEAN NOT NULL DEFAULT true,
    "specific_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceUnavailability" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceReview" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDispute" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reporter_type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolution" TEXT,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "provider_id" TEXT NOT NULL,

    CONSTRAINT "ServiceDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePayout" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "commission_rate" DOUBLE PRECISION NOT NULL,
    "commission_amount" DOUBLE PRECISION NOT NULL,
    "net_amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payout_method" TEXT NOT NULL,
    "payout_account" TEXT NOT NULL,
    "booking_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "processed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProvider_user_id_key" ON "ServiceProvider"("user_id");

-- CreateIndex
CREATE INDEX "ServiceProvider_user_id_idx" ON "ServiceProvider"("user_id");

-- CreateIndex
CREATE INDEX "ServiceProvider_status_idx" ON "ServiceProvider"("status");

-- CreateIndex
CREATE INDEX "ServiceProvider_is_verified_idx" ON "ServiceProvider"("is_verified");

-- CreateIndex
CREATE INDEX "ServiceProvider_kyc_status_idx" ON "ServiceProvider"("kyc_status");

-- CreateIndex
CREATE INDEX "ServiceProvider_service_categories_idx" ON "ServiceProvider"("service_categories");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_name_key" ON "ServiceCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE INDEX "ServiceCategory_slug_idx" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE INDEX "ServiceCategory_parent_id_idx" ON "ServiceCategory"("parent_id");

-- CreateIndex
CREATE INDEX "ServiceCategory_is_active_idx" ON "ServiceCategory"("is_active");

-- CreateIndex
CREATE INDEX "ServiceBooking_service_id_idx" ON "ServiceBooking"("service_id");

-- CreateIndex
CREATE INDEX "ServiceBooking_customer_id_idx" ON "ServiceBooking"("customer_id");

-- CreateIndex
CREATE INDEX "ServiceBooking_provider_id_idx" ON "ServiceBooking"("provider_id");

-- CreateIndex
CREATE INDEX "ServiceBooking_status_idx" ON "ServiceBooking"("status");

-- CreateIndex
CREATE INDEX "ServiceBooking_booking_date_idx" ON "ServiceBooking"("booking_date");

-- CreateIndex
CREATE INDEX "ServiceBooking_payment_status_idx" ON "ServiceBooking"("payment_status");

-- CreateIndex
CREATE INDEX "ServiceBooking_customer_id_status_idx" ON "ServiceBooking"("customer_id", "status");

-- CreateIndex
CREATE INDEX "ServiceBooking_provider_id_status_idx" ON "ServiceBooking"("provider_id", "status");

-- CreateIndex
CREATE INDEX "ServiceAvailability_provider_id_idx" ON "ServiceAvailability"("provider_id");

-- CreateIndex
CREATE INDEX "ServiceAvailability_day_of_week_idx" ON "ServiceAvailability"("day_of_week");

-- CreateIndex
CREATE INDEX "ServiceAvailability_specific_date_idx" ON "ServiceAvailability"("specific_date");

-- CreateIndex
CREATE INDEX "ServiceAvailability_provider_id_day_of_week_idx" ON "ServiceAvailability"("provider_id", "day_of_week");

-- CreateIndex
CREATE INDEX "ServiceUnavailability_provider_id_idx" ON "ServiceUnavailability"("provider_id");

-- CreateIndex
CREATE INDEX "ServiceUnavailability_start_date_idx" ON "ServiceUnavailability"("start_date");

-- CreateIndex
CREATE INDEX "ServiceUnavailability_end_date_idx" ON "ServiceUnavailability"("end_date");

-- CreateIndex
CREATE INDEX "ServiceUnavailability_provider_id_start_date_end_date_idx" ON "ServiceUnavailability"("provider_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceReview_booking_id_key" ON "ServiceReview"("booking_id");

-- CreateIndex
CREATE INDEX "ServiceReview_service_id_idx" ON "ServiceReview"("service_id");

-- CreateIndex
CREATE INDEX "ServiceReview_provider_id_idx" ON "ServiceReview"("provider_id");

-- CreateIndex
CREATE INDEX "ServiceReview_customer_id_idx" ON "ServiceReview"("customer_id");

-- CreateIndex
CREATE INDEX "ServiceReview_rating_idx" ON "ServiceReview"("rating");

-- CreateIndex
CREATE INDEX "ServiceReview_status_idx" ON "ServiceReview"("status");

-- CreateIndex
CREATE INDEX "ServiceReview_service_id_status_idx" ON "ServiceReview"("service_id", "status");

-- CreateIndex
CREATE INDEX "ServiceReview_provider_id_rating_idx" ON "ServiceReview"("provider_id", "rating");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDispute_booking_id_key" ON "ServiceDispute"("booking_id");

-- CreateIndex
CREATE INDEX "ServiceDispute_booking_id_idx" ON "ServiceDispute"("booking_id");

-- CreateIndex
CREATE INDEX "ServiceDispute_reporter_id_idx" ON "ServiceDispute"("reporter_id");

-- CreateIndex
CREATE INDEX "ServiceDispute_provider_id_idx" ON "ServiceDispute"("provider_id");

-- CreateIndex
CREATE INDEX "ServiceDispute_status_idx" ON "ServiceDispute"("status");

-- CreateIndex
CREATE INDEX "ServiceDispute_reporter_id_status_idx" ON "ServiceDispute"("reporter_id", "status");

-- CreateIndex
CREATE INDEX "ServicePayout_provider_id_idx" ON "ServicePayout"("provider_id");

-- CreateIndex
CREATE INDEX "ServicePayout_status_idx" ON "ServicePayout"("status");

-- CreateIndex
CREATE INDEX "ServicePayout_created_at_idx" ON "ServicePayout"("created_at");

-- CreateIndex
CREATE INDEX "ServicePayout_provider_id_status_idx" ON "ServicePayout"("provider_id", "status");

-- CreateIndex
CREATE INDEX "Address_latitude_longitude_idx" ON "Address"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Service_category_id_idx" ON "Service"("category_id");

-- CreateIndex
CREATE INDEX "Service_location_type_idx" ON "Service"("location_type");

-- AddForeignKey
ALTER TABLE "ServiceProvider" ADD CONSTRAINT "ServiceProvider_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_customer_address_id_fkey" FOREIGN KEY ("customer_address_id") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_provider_address_id_fkey" FOREIGN KEY ("provider_address_id") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAvailability" ADD CONSTRAINT "ServiceAvailability_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceUnavailability" ADD CONSTRAINT "ServiceUnavailability_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReview" ADD CONSTRAINT "ServiceReview_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "ServiceBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReview" ADD CONSTRAINT "ServiceReview_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReview" ADD CONSTRAINT "ServiceReview_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReview" ADD CONSTRAINT "ServiceReview_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDispute" ADD CONSTRAINT "ServiceDispute_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "ServiceBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDispute" ADD CONSTRAINT "ServiceDispute_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePayout" ADD CONSTRAINT "ServicePayout_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
