-- ParcelShipment (livraison colis standalone)
CREATE TABLE IF NOT EXISTS "ParcelShipment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "recipient_phone" TEXT,
    "recipient_address" TEXT NOT NULL,
    "destination_country" TEXT NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "carrier" TEXT NOT NULL,
    "tracking_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "cost" DOUBLE PRECISION NOT NULL,
    "estimated_delivery" TIMESTAMP(3),
    "actual_delivery" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParcelShipment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ParcelShipment_tracking_number_key" ON "ParcelShipment"("tracking_number");
CREATE INDEX IF NOT EXISTS "ParcelShipment_user_id_idx" ON "ParcelShipment"("user_id");
CREATE INDEX IF NOT EXISTS "ParcelShipment_tracking_number_idx" ON "ParcelShipment"("tracking_number");
CREATE INDEX IF NOT EXISTS "ParcelShipment_status_idx" ON "ParcelShipment"("status");
ALTER TABLE "ParcelShipment" ADD CONSTRAINT "ParcelShipment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ParcelTrackingEvent
CREATE TABLE IF NOT EXISTS "ParcelTrackingEvent" (
    "id" TEXT NOT NULL,
    "parcel_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParcelTrackingEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ParcelTrackingEvent_parcel_id_idx" ON "ParcelTrackingEvent"("parcel_id");
CREATE INDEX IF NOT EXISTS "ParcelTrackingEvent_timestamp_idx" ON "ParcelTrackingEvent"("timestamp");
ALTER TABLE "ParcelTrackingEvent" ADD CONSTRAINT "ParcelTrackingEvent_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "ParcelShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Product.is_merchandising
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "is_merchandising" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Product_seller_id_is_merchandising_idx" ON "Product"("seller_id", "is_merchandising");
