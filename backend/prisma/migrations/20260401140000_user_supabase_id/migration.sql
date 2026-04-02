-- AlterTable
ALTER TABLE "User" ADD COLUMN "supabase_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_supabase_id_key" ON "User"("supabase_id");
