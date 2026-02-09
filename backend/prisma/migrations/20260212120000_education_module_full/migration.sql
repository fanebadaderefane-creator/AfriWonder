-- Course: new columns
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "trailer_url" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'XOF';
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "reviews_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "certificate_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Course" ALTER COLUMN "description" SET DATA TYPE TEXT;
ALTER TABLE "Course" ALTER COLUMN "duration_hours" SET DATA TYPE DOUBLE PRECISION;

-- Lesson
CREATE TABLE IF NOT EXISTS "Lesson" (
  "id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "video_url" TEXT,
  "duration_minutes" INTEGER,
  "order" INTEGER NOT NULL DEFAULT 0,
  "is_preview" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Lesson_course_id_idx" ON "Lesson"("course_id");
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CourseReview
CREATE TABLE IF NOT EXISTS "CourseReview" (
  "id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CourseReview_course_id_user_id_key" ON "CourseReview"("course_id", "user_id");
CREATE INDEX IF NOT EXISTS "CourseReview_course_id_idx" ON "CourseReview"("course_id");
CREATE INDEX IF NOT EXISTS "CourseReview_user_id_idx" ON "CourseReview"("user_id");
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CourseWishlist
CREATE TABLE IF NOT EXISTS "CourseWishlist" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseWishlist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CourseWishlist_user_id_course_id_key" ON "CourseWishlist"("user_id", "course_id");
CREATE INDEX IF NOT EXISTS "CourseWishlist_user_id_idx" ON "CourseWishlist"("user_id");
CREATE INDEX IF NOT EXISTS "CourseWishlist_course_id_idx" ON "CourseWishlist"("course_id");
ALTER TABLE "CourseWishlist" ADD CONSTRAINT "CourseWishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseWishlist" ADD CONSTRAINT "CourseWishlist_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserLevel
CREATE TABLE IF NOT EXISTS "UserLevel" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "next_level_xp" INTEGER NOT NULL DEFAULT 100,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserLevel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserLevel_user_id_key" ON "UserLevel"("user_id");
CREATE INDEX IF NOT EXISTS "UserLevel_user_id_idx" ON "UserLevel"("user_id");
CREATE INDEX IF NOT EXISTS "UserLevel_level_idx" ON "UserLevel"("level");
ALTER TABLE "UserLevel" ADD CONSTRAINT "UserLevel_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enrollment: new columns
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "progress_percentage" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "last_lesson_id" TEXT;
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "completed" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Enrollment" SET "progress_percentage" = "progress" WHERE "progress_percentage" IS NULL OR "progress_percentage" = 0;
UPDATE "Enrollment" SET "completed" = true WHERE "completed_at" IS NOT NULL;

-- Certificate: verification_token (backfill existing then add unique)
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "verification_token" TEXT;
UPDATE "Certificate" SET "verification_token" = gen_random_uuid()::text WHERE "verification_token" IS NULL;
ALTER TABLE "Certificate" ALTER COLUMN "verification_token" SET NOT NULL;
ALTER TABLE "Certificate" ALTER COLUMN "verification_token" SET DEFAULT gen_random_uuid()::text;
CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_verification_token_key" ON "Certificate"("verification_token");
ALTER TABLE "Certificate" ALTER COLUMN "certificate_url" DROP NOT NULL;

-- Course indexes
CREATE INDEX IF NOT EXISTS "Course_level_idx" ON "Course"("level");
CREATE INDEX IF NOT EXISTS "Course_is_featured_idx" ON "Course"("is_featured");
CREATE INDEX IF NOT EXISTS "Course_created_at_idx" ON "Course"("created_at");
CREATE INDEX IF NOT EXISTS "Course_rating_idx" ON "Course"("rating");
CREATE INDEX IF NOT EXISTS "Course_price_idx" ON "Course"("price");
