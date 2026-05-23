-- AlterTable
ALTER TABLE "Message" ADD COLUMN "poll_options" JSONB;
ALTER TABLE "Message" ADD COLUMN "poll_votes" JSONB;
