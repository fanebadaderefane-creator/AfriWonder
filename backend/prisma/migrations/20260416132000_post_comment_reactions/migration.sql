CREATE TABLE "post_comment_reactions" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'like',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_comment_reactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "post_comment_reactions_comment_id_user_id_key" ON "post_comment_reactions"("comment_id", "user_id");
CREATE INDEX "post_comment_reactions_comment_id_idx" ON "post_comment_reactions"("comment_id");
CREATE INDEX "post_comment_reactions_user_id_idx" ON "post_comment_reactions"("user_id");

ALTER TABLE "post_comment_reactions"
ADD CONSTRAINT "post_comment_reactions_comment_id_fkey"
FOREIGN KEY ("comment_id") REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_comment_reactions"
ADD CONSTRAINT "post_comment_reactions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
