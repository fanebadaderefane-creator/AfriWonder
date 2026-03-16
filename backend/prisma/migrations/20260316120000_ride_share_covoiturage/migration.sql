-- CPO 9.22 — Co-voiturage

CREATE TABLE "RideShare" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departure_at" TIMESTAMP(3) NOT NULL,
    "seats_available" INTEGER NOT NULL DEFAULT 4,
    "price_per_seat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideShare_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RideShare_driver_id_idx" ON "RideShare"("driver_id");
CREATE INDEX "RideShare_departure_at_idx" ON "RideShare"("departure_at");
CREATE INDEX "RideShare_status_idx" ON "RideShare"("status");
CREATE INDEX "RideShare_origin_destination_idx" ON "RideShare"("origin", "destination");
ALTER TABLE "RideShare" ADD CONSTRAINT "RideShare_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RideShareBooking" (
    "id" TEXT NOT NULL,
    "ride_share_id" TEXT NOT NULL,
    "passenger_id" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideShareBooking_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RideShareBooking_ride_share_id_passenger_id_key" ON "RideShareBooking"("ride_share_id", "passenger_id");
CREATE INDEX "RideShareBooking_ride_share_id_idx" ON "RideShareBooking"("ride_share_id");
CREATE INDEX "RideShareBooking_passenger_id_idx" ON "RideShareBooking"("passenger_id");
ALTER TABLE "RideShareBooking" ADD CONSTRAINT "RideShareBooking_ride_share_id_fkey" FOREIGN KEY ("ride_share_id") REFERENCES "RideShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RideShareBooking" ADD CONSTRAINT "RideShareBooking_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
