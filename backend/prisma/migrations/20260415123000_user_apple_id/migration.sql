-- Sign in with Apple : sujet stable (`sub`)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "apple_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_apple_id_key" ON "User"("apple_id");
