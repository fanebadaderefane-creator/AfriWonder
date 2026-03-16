-- User: bannière profil (CPO 1.6), compte public/privé (CPO 1.17)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profile_cover_url" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "is_private" BOOLEAN NOT NULL DEFAULT false;

-- Post: programmation (CPO 2.35), épingler (CPO 2.36)
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "is_pinned" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Post_scheduled_at_idx" ON "Post"("scheduled_at");

-- CloseFriend: liste proches (CPO 1.18)
CREATE TABLE IF NOT EXISTS "CloseFriend" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "friend_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CloseFriend_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CloseFriend_user_id_friend_id_key" ON "CloseFriend"("user_id", "friend_id");
CREATE INDEX IF NOT EXISTS "CloseFriend_user_id_idx" ON "CloseFriend"("user_id");
CREATE INDEX IF NOT EXISTS "CloseFriend_friend_id_idx" ON "CloseFriend"("friend_id");
ALTER TABLE "CloseFriend" ADD CONSTRAINT "CloseFriend_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CloseFriend" ADD CONSTRAINT "CloseFriend_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
