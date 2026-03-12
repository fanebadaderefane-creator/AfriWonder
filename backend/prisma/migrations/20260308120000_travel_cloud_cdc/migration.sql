-- Voyage (CDC 20)
CREATE TABLE "TravelHotel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "price_per_night_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "rating" DOUBLE PRECISION,
    "image_url" TEXT,
    "amenities" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelHotel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TravelFlight" (
    "id" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departure_at" TIMESTAMP(3) NOT NULL,
    "arrival_at" TIMESTAMP(3) NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "carrier" TEXT,
    "flight_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelFlight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TravelBooking" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "hotel_id" TEXT,
    "flight_id" TEXT,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "guests" INTEGER,
    "total_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelBooking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TravelHotel_city_country_idx" ON "TravelHotel"("city", "country");
CREATE INDEX "TravelFlight_origin_destination_idx" ON "TravelFlight"("origin", "destination");
CREATE INDEX "TravelBooking_user_id_idx" ON "TravelBooking"("user_id");
CREATE INDEX "TravelBooking_status_idx" ON "TravelBooking"("status");

ALTER TABLE "TravelBooking" ADD CONSTRAINT "TravelBooking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TravelBooking" ADD CONSTRAINT "TravelBooking_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "TravelHotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TravelBooking" ADD CONSTRAINT "TravelBooking_flight_id_fkey" FOREIGN KEY ("flight_id") REFERENCES "TravelFlight"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Cloud personnel (CDC 24)
CREATE TABLE "UserCloudFile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT,
    "folder" TEXT DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCloudFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCloudFile_user_id_key_key" ON "UserCloudFile"("user_id", "key");
CREATE INDEX "UserCloudFile_user_id_idx" ON "UserCloudFile"("user_id");

ALTER TABLE "UserCloudFile" ADD CONSTRAINT "UserCloudFile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
