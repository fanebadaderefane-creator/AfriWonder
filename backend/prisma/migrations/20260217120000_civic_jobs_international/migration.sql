-- Civic: extend CivicPetition (geo, category, shares, target authority)
ALTER TABLE "CivicPetition" ADD COLUMN "category" TEXT;
ALTER TABLE "CivicPetition" ADD COLUMN "country" TEXT;
ALTER TABLE "CivicPetition" ADD COLUMN "region" TEXT;
ALTER TABLE "CivicPetition" ADD COLUMN "city" TEXT;
ALTER TABLE "CivicPetition" ADD COLUMN "is_national" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CivicPetition" ADD COLUMN "shares_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CivicPetition" ADD COLUMN "target_authority_email" TEXT;

-- Civic: extend PetitionSignature (verification, ip, geo for dashboard)
ALTER TABLE "PetitionSignature" ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PetitionSignature" ADD COLUMN "ip_address" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "signer_city" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "signer_country" TEXT;

-- Civic: PetitionComment
CREATE TABLE IF NOT EXISTS "PetitionComment" (
    "id" TEXT NOT NULL,
    "petition_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetitionComment_pkey" PRIMARY KEY ("id")
);

-- Civic: PetitionCommentLike
CREATE TABLE IF NOT EXISTS "PetitionCommentLike" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetitionCommentLike_pkey" PRIMARY KEY ("id")
);

-- Civic: SavedPetition
CREATE TABLE IF NOT EXISTS "SavedPetition" (
    "id" TEXT NOT NULL,
    "petition_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPetition_pkey" PRIMARY KEY ("id")
);

-- Jobs: extend Job (country, currency, views, premium, urgent)
ALTER TABLE "Job" ADD COLUMN "salary_currency" TEXT NOT NULL DEFAULT 'XOF';
ALTER TABLE "Job" ADD COLUMN "country" TEXT;
ALTER TABLE "Job" ADD COLUMN "views_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Job" ADD COLUMN "is_premium" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "is_urgent" BOOLEAN NOT NULL DEFAULT false;

-- Jobs: CandidateProfile
CREATE TABLE IF NOT EXISTS "CandidateProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cv_url" TEXT,
    "portfolio_url" TEXT,
    "skills" JSONB,
    "experience" JSONB,
    "education" JSONB,
    "availability" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- Jobs: CompanyProfile
CREATE TABLE IF NOT EXISTS "CompanyProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT,
    "description" TEXT,
    "logo_url" TEXT,
    "documents_legal" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- Jobs: CompanyRating (candidate rates employer)
CREATE TABLE IF NOT EXISTS "CompanyRating" (
    "id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyRating_pkey" PRIMARY KEY ("id")
);

-- Jobs: CandidateRating (employer rates candidate)
CREATE TABLE IF NOT EXISTS "CandidateRating" (
    "id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateRating_pkey" PRIMARY KEY ("id")
);

-- Jobs: SavedJob
CREATE TABLE IF NOT EXISTS "SavedJob" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedJob_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "CandidateProfile_user_id_key" ON "CandidateProfile"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "CompanyProfile_user_id_key" ON "CompanyProfile"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "CompanyRating_from_user_id_to_user_id_job_id_key" ON "CompanyRating"("from_user_id", "to_user_id", "job_id");
CREATE UNIQUE INDEX IF NOT EXISTS "CandidateRating_from_user_id_to_user_id_job_id_key" ON "CandidateRating"("from_user_id", "to_user_id", "job_id");
CREATE UNIQUE INDEX IF NOT EXISTS "PetitionCommentLike_comment_id_user_id_key" ON "PetitionCommentLike"("comment_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "SavedPetition_petition_id_user_id_key" ON "SavedPetition"("petition_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "SavedJob_job_id_user_id_key" ON "SavedJob"("job_id", "user_id");

CREATE INDEX IF NOT EXISTS "CivicPetition_country_idx" ON "CivicPetition"("country");
CREATE INDEX IF NOT EXISTS "CivicPetition_category_idx" ON "CivicPetition"("category");
CREATE INDEX IF NOT EXISTS "Job_country_idx" ON "Job"("country");
CREATE INDEX IF NOT EXISTS "PetitionComment_petition_id_idx" ON "PetitionComment"("petition_id");
CREATE INDEX IF NOT EXISTS "PetitionComment_user_id_idx" ON "PetitionComment"("user_id");
CREATE INDEX IF NOT EXISTS "PetitionComment_parent_id_idx" ON "PetitionComment"("parent_id");
CREATE INDEX IF NOT EXISTS "PetitionCommentLike_comment_id_idx" ON "PetitionCommentLike"("comment_id");
CREATE INDEX IF NOT EXISTS "PetitionCommentLike_user_id_idx" ON "PetitionCommentLike"("user_id");
CREATE INDEX IF NOT EXISTS "SavedPetition_petition_id_idx" ON "SavedPetition"("petition_id");
CREATE INDEX IF NOT EXISTS "SavedPetition_user_id_idx" ON "SavedPetition"("user_id");
CREATE INDEX IF NOT EXISTS "CandidateProfile_user_id_idx" ON "CandidateProfile"("user_id");
CREATE INDEX IF NOT EXISTS "CompanyProfile_user_id_idx" ON "CompanyProfile"("user_id");
CREATE INDEX IF NOT EXISTS "CompanyProfile_is_verified_idx" ON "CompanyProfile"("is_verified");
CREATE INDEX IF NOT EXISTS "CompanyRating_to_user_id_idx" ON "CompanyRating"("to_user_id");
CREATE INDEX IF NOT EXISTS "CandidateRating_to_user_id_idx" ON "CandidateRating"("to_user_id");
CREATE INDEX IF NOT EXISTS "SavedJob_job_id_idx" ON "SavedJob"("job_id");
CREATE INDEX IF NOT EXISTS "SavedJob_user_id_idx" ON "SavedJob"("user_id");

-- FKs (add only if tables exist and columns exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PetitionComment_petition_id_fkey') THEN
    ALTER TABLE "PetitionComment" ADD CONSTRAINT "PetitionComment_petition_id_fkey" FOREIGN KEY ("petition_id") REFERENCES "CivicPetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PetitionComment_user_id_fkey') THEN
    ALTER TABLE "PetitionComment" ADD CONSTRAINT "PetitionComment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PetitionComment_parent_id_fkey') THEN
    ALTER TABLE "PetitionComment" ADD CONSTRAINT "PetitionComment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "PetitionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PetitionCommentLike_comment_id_fkey') THEN
    ALTER TABLE "PetitionCommentLike" ADD CONSTRAINT "PetitionCommentLike_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "PetitionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PetitionCommentLike_user_id_fkey') THEN
    ALTER TABLE "PetitionCommentLike" ADD CONSTRAINT "PetitionCommentLike_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SavedPetition_petition_id_fkey') THEN
    ALTER TABLE "SavedPetition" ADD CONSTRAINT "SavedPetition_petition_id_fkey" FOREIGN KEY ("petition_id") REFERENCES "CivicPetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SavedPetition_user_id_fkey') THEN
    ALTER TABLE "SavedPetition" ADD CONSTRAINT "SavedPetition_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CandidateProfile_user_id_fkey') THEN
    ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CompanyProfile_user_id_fkey') THEN
    ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CompanyRating_from_user_id_fkey') THEN
    ALTER TABLE "CompanyRating" ADD CONSTRAINT "CompanyRating_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CompanyRating_to_user_id_fkey') THEN
    ALTER TABLE "CompanyRating" ADD CONSTRAINT "CompanyRating_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CandidateRating_from_user_id_fkey') THEN
    ALTER TABLE "CandidateRating" ADD CONSTRAINT "CandidateRating_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CandidateRating_to_user_id_fkey') THEN
    ALTER TABLE "CandidateRating" ADD CONSTRAINT "CandidateRating_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SavedJob_job_id_fkey') THEN
    ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SavedJob_user_id_fkey') THEN
    ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
