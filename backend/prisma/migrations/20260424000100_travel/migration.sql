-- Migration Travel : billets bus + hôtels
-- AfriWonder Vague 4 Super-app

CREATE TABLE IF NOT EXISTS "BusCompany" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT UNIQUE NOT NULL,
  "logo_url"    TEXT,
  "description" TEXT,
  "phone"       TEXT,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "BusCompany_name_idx" ON "BusCompany"("name");

CREATE TABLE IF NOT EXISTS "BusRoute" (
  "id"               TEXT PRIMARY KEY,
  "company_id"       TEXT NOT NULL REFERENCES "BusCompany"("id") ON DELETE CASCADE,
  "origin_city"      TEXT NOT NULL,
  "destination_city" TEXT NOT NULL,
  "departure_time"   TEXT NOT NULL,
  "arrival_time"     TEXT NOT NULL,
  "duration_min"     INTEGER NOT NULL,
  "price_fcfa"       DOUBLE PRECISION NOT NULL,
  "bus_type"         TEXT NOT NULL DEFAULT 'standard',
  "seats_total"      INTEGER NOT NULL DEFAULT 50,
  "days_of_week"     INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6],
  "is_active"        BOOLEAN NOT NULL DEFAULT true,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "BusRoute_company_id_idx" ON "BusRoute"("company_id");
CREATE INDEX IF NOT EXISTS "BusRoute_origin_destination_idx" ON "BusRoute"("origin_city","destination_city");
CREATE INDEX IF NOT EXISTS "BusRoute_is_active_idx" ON "BusRoute"("is_active");

CREATE TABLE IF NOT EXISTS "BusBooking" (
  "id"              TEXT PRIMARY KEY,
  "route_id"        TEXT NOT NULL REFERENCES "BusRoute"("id") ON DELETE CASCADE,
  "passenger_id"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "passenger_name"  TEXT NOT NULL,
  "passenger_phone" TEXT NOT NULL,
  "travel_date"     TIMESTAMP(3) NOT NULL,
  "seats"           INTEGER NOT NULL DEFAULT 1,
  "seat_numbers"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "total_fcfa"      DOUBLE PRECISION NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'pending',
  "payment_status"  TEXT NOT NULL DEFAULT 'unpaid',
  "payment_method"  TEXT,
  "reference"       TEXT UNIQUE NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "BusBooking_route_id_idx" ON "BusBooking"("route_id");
CREATE INDEX IF NOT EXISTS "BusBooking_passenger_id_idx" ON "BusBooking"("passenger_id");
CREATE INDEX IF NOT EXISTS "BusBooking_travel_date_idx" ON "BusBooking"("travel_date");
CREATE INDEX IF NOT EXISTS "BusBooking_status_idx" ON "BusBooking"("status");

CREATE TABLE IF NOT EXISTS "Hotel" (
  "id"              TEXT PRIMARY KEY,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "address"         TEXT NOT NULL,
  "city"            TEXT NOT NULL,
  "country"         TEXT NOT NULL DEFAULT 'ML',
  "lat"             DOUBLE PRECISION,
  "lng"             DOUBLE PRECISION,
  "star_rating"     DOUBLE PRECISION,
  "amenities"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "images"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "phone"           TEXT,
  "email"           TEXT,
  "price_fcfa_from" DOUBLE PRECISION,
  "is_active"       BOOLEAN NOT NULL DEFAULT true,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Hotel_city_idx" ON "Hotel"("city");
CREATE INDEX IF NOT EXISTS "Hotel_is_active_idx" ON "Hotel"("is_active");

CREATE TABLE IF NOT EXISTS "HotelRoom" (
  "id"          TEXT PRIMARY KEY,
  "hotel_id"    TEXT NOT NULL REFERENCES "Hotel"("id") ON DELETE CASCADE,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "capacity"    INTEGER NOT NULL DEFAULT 2,
  "price_fcfa"  DOUBLE PRECISION NOT NULL,
  "images"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "amenities"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "HotelRoom_hotel_id_idx" ON "HotelRoom"("hotel_id");

CREATE TABLE IF NOT EXISTS "HotelBooking" (
  "id"             TEXT PRIMARY KEY,
  "hotel_id"       TEXT NOT NULL REFERENCES "Hotel"("id") ON DELETE CASCADE,
  "room_id"        TEXT NOT NULL REFERENCES "HotelRoom"("id") ON DELETE CASCADE,
  "guest_id"       TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "check_in"       TIMESTAMP(3) NOT NULL,
  "check_out"      TIMESTAMP(3) NOT NULL,
  "nights"         INTEGER NOT NULL,
  "guests_count"   INTEGER NOT NULL DEFAULT 1,
  "total_fcfa"     DOUBLE PRECISION NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'pending',
  "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
  "payment_method" TEXT,
  "reference"      TEXT UNIQUE NOT NULL,
  "notes"          TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "HotelBooking_hotel_id_idx" ON "HotelBooking"("hotel_id");
CREATE INDEX IF NOT EXISTS "HotelBooking_guest_id_idx" ON "HotelBooking"("guest_id");
CREATE INDEX IF NOT EXISTS "HotelBooking_check_in_idx" ON "HotelBooking"("check_in");
CREATE INDEX IF NOT EXISTS "HotelBooking_status_idx" ON "HotelBooking"("status");
