-- =====================================================
-- Feature : Paid Video Calls (User ↔ Star)
-- Module isolé, aucune table existante n'est modifiée
-- =====================================================

CREATE TABLE "StarProfile" (
  "id"                      TEXT PRIMARY KEY,
  "user_id"                 TEXT NOT NULL UNIQUE,
  "is_active"               BOOLEAN NOT NULL DEFAULT false,
  "is_verified"             BOOLEAN NOT NULL DEFAULT false,
  "is_banned"               BOOLEAN NOT NULL DEFAULT false,
  "ban_reason"              TEXT,
  "headline"                VARCHAR(200),
  "bio"                     VARCHAR(2000),
  "languages"               TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tags"                    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "price_fcfa_5min"         DOUBLE PRECISION,
  "price_fcfa_10min"        DOUBLE PRECISION,
  "price_fcfa_15min"        DOUBLE PRECISION,
  "max_calls_per_day"       INTEGER NOT NULL DEFAULT 8,
  "max_extensions_per_call" INTEGER NOT NULL DEFAULT 4,
  "currency"                TEXT NOT NULL DEFAULT 'XOF',
  "rating_avg"              DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rating_count"            INTEGER NOT NULL DEFAULT 0,
  "calls_completed"         INTEGER NOT NULL DEFAULT 0,
  "calls_no_show"           INTEGER NOT NULL DEFAULT 0,
  "total_earnings_fcfa"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"              TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StarProfile_user_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StarProfile_is_active_idx" ON "StarProfile"("is_active");
CREATE INDEX "StarProfile_is_verified_idx" ON "StarProfile"("is_verified");
CREATE INDEX "StarProfile_rating_avg_idx" ON "StarProfile"("rating_avg");

CREATE TABLE "StarAvailabilityRule" (
  "id"              TEXT PRIMARY KEY,
  "star_profile_id" TEXT NOT NULL,
  "day_of_week"     INTEGER,
  "specific_date"   DATE,
  "start_time"      VARCHAR(5) NOT NULL,
  "end_time"        VARCHAR(5) NOT NULL,
  "timezone"        VARCHAR(64) NOT NULL DEFAULT 'UTC',
  "is_blocked"      BOOLEAN NOT NULL DEFAULT false,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StarAvailabilityRule_star_fkey" FOREIGN KEY ("star_profile_id") REFERENCES "StarProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StarAvailabilityRule_star_profile_id_idx" ON "StarAvailabilityRule"("star_profile_id");
CREATE INDEX "StarAvailabilityRule_day_of_week_idx" ON "StarAvailabilityRule"("day_of_week");
CREATE INDEX "StarAvailabilityRule_specific_date_idx" ON "StarAvailabilityRule"("specific_date");

CREATE TABLE "StarBooking" (
  "id"                      TEXT PRIMARY KEY,
  "star_profile_id"         TEXT NOT NULL,
  "fan_user_id"             TEXT NOT NULL,
  "star_user_id"            TEXT NOT NULL,
  "price_fcfa"              DOUBLE PRECISION NOT NULL,
  "duration_minutes"        INTEGER NOT NULL,
  "extra_minutes"           INTEGER NOT NULL DEFAULT 0,
  "currency"                TEXT NOT NULL DEFAULT 'XOF',
  "scheduled_start_at"      TIMESTAMP(3) NOT NULL,
  "scheduled_end_at"        TIMESTAMP(3) NOT NULL,
  "actually_started_at"     TIMESTAMP(3),
  "actually_ended_at"       TIMESTAMP(3),
  "status"                  TEXT NOT NULL DEFAULT 'pending_payment',
  "payment_method"          TEXT,
  "payment_transaction_id"  TEXT,
  "payout_transaction_id"   TEXT,
  "platform_fee_fcfa"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "star_earnings_fcfa"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "agora_channel"           TEXT NOT NULL UNIQUE,
  "agora_token_nonce"       INTEGER NOT NULL DEFAULT 0,
  "fan_notes"               VARCHAR(500),
  "cancel_reason"           TEXT,
  "cancelled_by"            TEXT,
  "cancelled_at"            TIMESTAMP(3),
  "refund_amount_fcfa"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reminder_sent_at"        TIMESTAMP(3),
  "created_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"              TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StarBooking_profile_fkey" FOREIGN KEY ("star_profile_id") REFERENCES "StarProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StarBooking_fan_fkey"     FOREIGN KEY ("fan_user_id")     REFERENCES "User"("id")        ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StarBooking_star_fkey"    FOREIGN KEY ("star_user_id")    REFERENCES "User"("id")        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StarBooking_star_profile_id_idx" ON "StarBooking"("star_profile_id");
CREATE INDEX "StarBooking_fan_user_id_idx"     ON "StarBooking"("fan_user_id");
CREATE INDEX "StarBooking_star_user_id_idx"    ON "StarBooking"("star_user_id");
CREATE INDEX "StarBooking_status_idx"          ON "StarBooking"("status");
CREATE INDEX "StarBooking_scheduled_start_at_idx" ON "StarBooking"("scheduled_start_at");

CREATE TABLE "StarCallSession" (
  "id"                TEXT PRIMARY KEY,
  "booking_id"        TEXT NOT NULL UNIQUE,
  "fan_uid"           INTEGER NOT NULL,
  "star_uid"          INTEGER NOT NULL,
  "fan_joined_at"     TIMESTAMP(3),
  "star_joined_at"    TIMESTAMP(3),
  "both_present_at"   TIMESTAMP(3),
  "last_heartbeat_at" TIMESTAMP(3),
  "end_reason"        TEXT,
  "ended_at"          TIMESTAMP(3),
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StarCallSession_booking_fkey" FOREIGN KEY ("booking_id") REFERENCES "StarBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StarCallSession_booking_id_idx" ON "StarCallSession"("booking_id");

CREATE TABLE "StarBookingExtension" (
  "id"                 TEXT PRIMARY KEY,
  "booking_id"         TEXT NOT NULL,
  "minutes"            INTEGER NOT NULL DEFAULT 5,
  "price_fcfa"         DOUBLE PRECISION NOT NULL,
  "platform_fee_fcfa"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "star_earnings_fcfa" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "transaction_id"     TEXT,
  "status"             TEXT NOT NULL DEFAULT 'pending',
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StarBookingExtension_booking_fkey" FOREIGN KEY ("booking_id") REFERENCES "StarBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StarBookingExtension_booking_id_idx" ON "StarBookingExtension"("booking_id");
CREATE INDEX "StarBookingExtension_status_idx"     ON "StarBookingExtension"("status");

CREATE TABLE "StarRating" (
  "id"              TEXT PRIMARY KEY,
  "booking_id"      TEXT NOT NULL UNIQUE,
  "star_profile_id" TEXT NOT NULL,
  "fan_user_id"     TEXT NOT NULL,
  "star_user_id"    TEXT NOT NULL,
  "rating"          INTEGER NOT NULL,
  "review"          VARCHAR(1000),
  "is_positive"     BOOLEAN NOT NULL DEFAULT true,
  "is_hidden"       BOOLEAN NOT NULL DEFAULT false,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StarRating_booking_fkey" FOREIGN KEY ("booking_id") REFERENCES "StarBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StarRating_profile_fkey" FOREIGN KEY ("star_profile_id") REFERENCES "StarProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StarRating_fan_fkey"     FOREIGN KEY ("fan_user_id")  REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StarRating_star_fkey"    FOREIGN KEY ("star_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StarRating_star_profile_id_idx" ON "StarRating"("star_profile_id");
CREATE INDEX "StarRating_is_hidden_idx"       ON "StarRating"("is_hidden");

CREATE TABLE "StarDispute" (
  "id"                 TEXT PRIMARY KEY,
  "booking_id"         TEXT NOT NULL,
  "opener_user_id"     TEXT NOT NULL,
  "status"             TEXT NOT NULL DEFAULT 'open',
  "reason"             VARCHAR(80) NOT NULL,
  "description"        VARCHAR(2000),
  "evidence_urls"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "resolved_by"        TEXT,
  "resolution_note"    VARCHAR(2000),
  "resolved_at"        TIMESTAMP(3),
  "refund_amount_fcfa" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StarDispute_booking_fkey" FOREIGN KEY ("booking_id")     REFERENCES "StarBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StarDispute_opener_fkey"  FOREIGN KEY ("opener_user_id") REFERENCES "User"("id")       ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StarDispute_booking_id_idx"     ON "StarDispute"("booking_id");
CREATE INDEX "StarDispute_status_idx"         ON "StarDispute"("status");
CREATE INDEX "StarDispute_opener_user_id_idx" ON "StarDispute"("opener_user_id");

CREATE TABLE "StarDisputeMessage" (
  "id"         TEXT PRIMARY KEY,
  "dispute_id" TEXT NOT NULL,
  "author_id"  TEXT NOT NULL,
  "body"       VARCHAR(2000) NOT NULL,
  "is_admin"   BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StarDisputeMessage_dispute_fkey" FOREIGN KEY ("dispute_id") REFERENCES "StarDispute"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StarDisputeMessage_author_fkey"  FOREIGN KEY ("author_id")  REFERENCES "User"("id")       ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StarDisputeMessage_dispute_id_idx" ON "StarDisputeMessage"("dispute_id");
