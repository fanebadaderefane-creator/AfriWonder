-- CreateTable: Ride (transport)
CREATE TABLE "Ride" (
    "id" TEXT NOT NULL,
    "passenger_id" TEXT NOT NULL,
    "passenger_name" TEXT,
    "passenger_phone" TEXT,
    "driver_id" TEXT,
    "driver_name" TEXT,
    "driver_phone" TEXT,
    "driver_avatar" TEXT,
    "vehicle_type" TEXT NOT NULL DEFAULT 'moto',
    "pickup_location" TEXT NOT NULL,
    "pickup_lat" DOUBLE PRECISION,
    "pickup_lng" DOUBLE PRECISION,
    "dropoff_location" TEXT NOT NULL,
    "dropoff_lat" DOUBLE PRECISION,
    "dropoff_lng" DOUBLE PRECISION,
    "distance_km" DOUBLE PRECISION,
    "estimated_duration_min" INTEGER,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" TEXT NOT NULL DEFAULT 'requested',
    "payment_method" TEXT NOT NULL DEFAULT 'cash',
    "rating" DOUBLE PRECISION,
    "driver_rating" DOUBLE PRECISION,
    "tip_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Driver
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "avatar" TEXT,
    "vehicle_type" TEXT NOT NULL,
    "vehicle_brand" TEXT,
    "vehicle_model" TEXT,
    "vehicle_color" TEXT,
    "license_plate" TEXT NOT NULL,
    "license_number" TEXT,
    "license_expiry" DATE,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "total_rides" INTEGER NOT NULL DEFAULT 0,
    "total_earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "current_location" TEXT,
    "current_lat" DOUBLE PRECISION,
    "current_lng" DOUBLE PRECISION,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_documents" JSONB DEFAULT '[]',
    "bank_account" TEXT,
    "available_seats" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Restaurant
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "banner_url" TEXT,
    "cuisine_type" JSONB DEFAULT '[]',
    "address" TEXT NOT NULL,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT NOT NULL,
    "opening_hours" TEXT,
    "delivery_time_min" INTEGER NOT NULL DEFAULT 30,
    "minimum_order" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delivery_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "accepts_orders" BOOLEAN NOT NULL DEFAULT true,
    "tags" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MenuItem
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "restaurant_name" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'plats',
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "image_url" TEXT,
    "images" JSONB DEFAULT '[]',
    "preparation_time_min" INTEGER NOT NULL DEFAULT 20,
    "calories" INTEGER,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "is_spicy" BOOLEAN NOT NULL DEFAULT false,
    "is_vegetarian" BOOLEAN NOT NULL DEFAULT false,
    "allergens" JSONB DEFAULT '[]',
    "options" JSONB DEFAULT '[]',
    "discount_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orders_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FoodOrder
CREATE TABLE "FoodOrder" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "restaurant_id" TEXT NOT NULL,
    "restaurant_name" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION,
    "delivery_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "service_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "delivery_address" TEXT NOT NULL,
    "delivery_lat" DOUBLE PRECISION,
    "delivery_lng" DOUBLE PRECISION,
    "delivery_instructions" TEXT,
    "payment_method" TEXT NOT NULL DEFAULT 'cash',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "delivery_person_id" TEXT,
    "delivery_person_name" TEXT,
    "delivery_person_phone" TEXT,
    "estimated_delivery_time" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "rating" DOUBLE PRECISION,
    "review" TEXT,
    "special_requests" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AirtimeRecharge
CREATE TABLE "AirtimeRecharge" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "payment_method" TEXT NOT NULL DEFAULT 'wallet',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transaction_id" TEXT,
    "reference" TEXT,
    "bonus_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_self_recharge" BOOLEAN NOT NULL DEFAULT true,
    "recipient_name" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AirtimeRecharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BillPayment
CREATE TABLE "BillPayment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bill_type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "customer_name" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "payment_method" TEXT NOT NULL DEFAULT 'wallet',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reference" TEXT,
    "transaction_id" TEXT,
    "due_date" DATE,
    "bill_period" TEXT,
    "fees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Ticket
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ticket_type" TEXT NOT NULL,
    "event_id" TEXT,
    "event_name" TEXT,
    "event_date" TIMESTAMP(3),
    "venue" TEXT,
    "seat_number" TEXT,
    "section" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total_amount" DOUBLE PRECISION,
    "payment_method" TEXT NOT NULL DEFAULT 'wallet',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "qr_code" TEXT,
    "ticket_number" TEXT,
    "organizer_name" TEXT,
    "organizer_contact" TEXT,
    "terms_conditions" TEXT,
    "is_transferable" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Doctor
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "qualifications" JSONB DEFAULT '[]',
    "license_number" TEXT,
    "years_experience" INTEGER,
    "profile_photo" TEXT,
    "bio" TEXT,
    "languages" JSONB,
    "clinic_name" TEXT,
    "clinic_address" TEXT,
    "city" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "consultation_fee" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "accepts_telemedicine" BOOLEAN NOT NULL DEFAULT true,
    "accepts_insurance" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "total_consultations" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "available_hours" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Appointment
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "patient_name" TEXT,
    "patient_phone" TEXT,
    "patient_age" INTEGER,
    "doctor_id" TEXT NOT NULL,
    "doctor_name" TEXT,
    "doctor_specialty" TEXT,
    "appointment_type" TEXT NOT NULL DEFAULT 'telemedicine',
    "appointment_date" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "reason" TEXT NOT NULL,
    "symptoms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "consultation_fee" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "payment_method" TEXT,
    "video_call_link" TEXT,
    "prescription" TEXT,
    "prescription_file_url" TEXT,
    "medical_notes" TEXT,
    "follow_up_required" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Pharmacy
CREATE TABLE "Pharmacy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner_id" TEXT,
    "license_number" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT NOT NULL,
    "opening_hours" TEXT,
    "is_24h" BOOLEAN NOT NULL DEFAULT false,
    "offers_delivery" BOOLEAN NOT NULL DEFAULT true,
    "delivery_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimum_order" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "accepts_prescriptions" BOOLEAN NOT NULL DEFAULT true,
    "pharmacist_name" TEXT,
    "logo_url" TEXT,
    "services" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pharmacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Property
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "owner_name" TEXT,
    "owner_phone" TEXT,
    "listing_type" TEXT NOT NULL,
    "property_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "neighborhood" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "surface_area" DOUBLE PRECISION,
    "floor" INTEGER,
    "total_floors" INTEGER,
    "is_furnished" BOOLEAN NOT NULL DEFAULT false,
    "amenities" JSONB DEFAULT '[]',
    "images" JSONB DEFAULT '[]',
    "video_url" TEXT,
    "year_built" INTEGER,
    "available_from" DATE,
    "status" TEXT NOT NULL DEFAULT 'available',
    "views" INTEGER NOT NULL DEFAULT 0,
    "saved_count" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "deposit_required" DOUBLE PRECISION,
    "utilities_included" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InsurancePolicy
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "policy_type" TEXT NOT NULL,
    "policy_number" TEXT,
    "provider" TEXT NOT NULL,
    "plan_name" TEXT,
    "coverage_amount" DOUBLE PRECISION,
    "premium_amount" DOUBLE PRECISION NOT NULL,
    "payment_frequency" TEXT NOT NULL DEFAULT 'monthly',
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "start_date" DATE,
    "end_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "beneficiaries" JSONB DEFAULT '[]',
    "covered_items" JSONB DEFAULT '[]',
    "exclusions" JSONB DEFAULT '[]',
    "deductible" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "documents" JSONB DEFAULT '[]',
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "claims_count" INTEGER NOT NULL DEFAULT 0,
    "last_payment_date" DATE,
    "next_payment_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InsuranceClaim
CREATE TABLE "InsuranceClaim" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "policy_number" TEXT,
    "claim_number" TEXT,
    "incident_date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "claim_amount" DOUBLE PRECISION NOT NULL,
    "approved_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "supporting_documents" JSONB DEFAULT '[]',
    "photos" JSONB DEFAULT '[]',
    "adjuster_name" TEXT,
    "adjuster_notes" TEXT,
    "rejection_reason" TEXT,
    "paid_date" DATE,
    "payment_method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Ride_passenger_id_idx" ON "Ride"("passenger_id");
CREATE INDEX "Ride_driver_id_idx" ON "Ride"("driver_id");
CREATE INDEX "Ride_status_idx" ON "Ride"("status");
CREATE INDEX "Ride_created_at_idx" ON "Ride"("created_at");

CREATE UNIQUE INDEX "Driver_user_id_key" ON "Driver"("user_id");
CREATE INDEX "Driver_user_id_idx" ON "Driver"("user_id");
CREATE INDEX "Driver_status_idx" ON "Driver"("status");
CREATE INDEX "Driver_vehicle_type_idx" ON "Driver"("vehicle_type");

CREATE INDEX "Restaurant_owner_id_idx" ON "Restaurant"("owner_id");
CREATE INDEX "Restaurant_city_idx" ON "Restaurant"("city");
CREATE INDEX "Restaurant_is_open_idx" ON "Restaurant"("is_open");

CREATE INDEX "MenuItem_restaurant_id_idx" ON "MenuItem"("restaurant_id");
CREATE INDEX "MenuItem_category_idx" ON "MenuItem"("category");

CREATE INDEX "FoodOrder_customer_id_idx" ON "FoodOrder"("customer_id");
CREATE INDEX "FoodOrder_restaurant_id_idx" ON "FoodOrder"("restaurant_id");
CREATE INDEX "FoodOrder_delivery_person_id_idx" ON "FoodOrder"("delivery_person_id");
CREATE INDEX "FoodOrder_status_idx" ON "FoodOrder"("status");

CREATE INDEX "AirtimeRecharge_user_id_idx" ON "AirtimeRecharge"("user_id");
CREATE INDEX "AirtimeRecharge_status_idx" ON "AirtimeRecharge"("status");
CREATE INDEX "AirtimeRecharge_created_at_idx" ON "AirtimeRecharge"("created_at");

CREATE INDEX "BillPayment_user_id_idx" ON "BillPayment"("user_id");
CREATE INDEX "BillPayment_bill_type_idx" ON "BillPayment"("bill_type");
CREATE INDEX "BillPayment_status_idx" ON "BillPayment"("status");

CREATE INDEX "Ticket_user_id_idx" ON "Ticket"("user_id");
CREATE INDEX "Ticket_ticket_type_idx" ON "Ticket"("ticket_type");
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

CREATE UNIQUE INDEX "Doctor_user_id_key" ON "Doctor"("user_id");
CREATE INDEX "Doctor_user_id_idx" ON "Doctor"("user_id");
CREATE INDEX "Doctor_specialty_idx" ON "Doctor"("specialty");
CREATE INDEX "Doctor_city_idx" ON "Doctor"("city");

CREATE INDEX "Appointment_patient_id_idx" ON "Appointment"("patient_id");
CREATE INDEX "Appointment_doctor_id_idx" ON "Appointment"("doctor_id");
CREATE INDEX "Appointment_appointment_date_idx" ON "Appointment"("appointment_date");
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

CREATE INDEX "Pharmacy_owner_id_idx" ON "Pharmacy"("owner_id");
CREATE INDEX "Pharmacy_city_idx" ON "Pharmacy"("city");

CREATE INDEX "Property_owner_id_idx" ON "Property"("owner_id");
CREATE INDEX "Property_listing_type_idx" ON "Property"("listing_type");
CREATE INDEX "Property_property_type_idx" ON "Property"("property_type");
CREATE INDEX "Property_city_idx" ON "Property"("city");
CREATE INDEX "Property_status_idx" ON "Property"("status");

CREATE INDEX "InsurancePolicy_user_id_idx" ON "InsurancePolicy"("user_id");
CREATE INDEX "InsurancePolicy_status_idx" ON "InsurancePolicy"("status");

CREATE INDEX "InsuranceClaim_user_id_idx" ON "InsuranceClaim"("user_id");
CREATE INDEX "InsuranceClaim_policy_id_idx" ON "InsuranceClaim"("policy_id");
CREATE INDEX "InsuranceClaim_status_idx" ON "InsuranceClaim"("status");

-- Foreign keys
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Driver" ADD CONSTRAINT "Driver_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FoodOrder" ADD CONSTRAINT "FoodOrder_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FoodOrder" ADD CONSTRAINT "FoodOrder_delivery_person_id_fkey" FOREIGN KEY ("delivery_person_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FoodOrder" ADD CONSTRAINT "FoodOrder_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AirtimeRecharge" ADD CONSTRAINT "AirtimeRecharge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillPayment" ADD CONSTRAINT "BillPayment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Pharmacy" ADD CONSTRAINT "Pharmacy_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Property" ADD CONSTRAINT "Property_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "InsurancePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
