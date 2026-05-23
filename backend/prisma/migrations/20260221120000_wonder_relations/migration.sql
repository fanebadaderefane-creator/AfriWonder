-- CreateTable
CREATE TABLE "WonderRelation" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WonderRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WonderRelation_follower_id_creator_id_key" ON "WonderRelation"("follower_id", "creator_id");

-- CreateIndex
CREATE INDEX "WonderRelation_follower_id_idx" ON "WonderRelation"("follower_id");

-- CreateIndex
CREATE INDEX "WonderRelation_creator_id_idx" ON "WonderRelation"("creator_id");

-- CreateIndex
CREATE INDEX "WonderRelation_status_idx" ON "WonderRelation"("status");

-- AddForeignKey
ALTER TABLE "WonderRelation" ADD CONSTRAINT "WonderRelation_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WonderRelation" ADD CONSTRAINT "WonderRelation_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
