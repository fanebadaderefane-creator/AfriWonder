-- Live Battle 1v1 + multi-guest 8 places (TikTok)

CREATE TABLE "LiveBattle" (
    "id" TEXT NOT NULL,
    "challenger_id" TEXT NOT NULL,
    "opponent_id" TEXT NOT NULL,
    "challenger_live_id" TEXT NOT NULL,
    "opponent_live_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "duration_sec" INTEGER NOT NULL DEFAULT 180,
    "challenger_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "opponent_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "winner_id" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveBattle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveGuestQueue" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT,
    "avatar_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "position" INTEGER NOT NULL DEFAULT 0,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "LiveGuestQueue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveGuestSlot" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slot_index" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveGuestSlot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiveBattle_challenger_live_id_idx" ON "LiveBattle"("challenger_live_id");
CREATE INDEX "LiveBattle_opponent_live_id_idx" ON "LiveBattle"("opponent_live_id");
CREATE INDEX "LiveBattle_status_idx" ON "LiveBattle"("status");
CREATE INDEX "LiveBattle_challenger_id_idx" ON "LiveBattle"("challenger_id");
CREATE INDEX "LiveBattle_opponent_id_idx" ON "LiveBattle"("opponent_id");

CREATE UNIQUE INDEX "LiveGuestQueue_live_id_user_id_key" ON "LiveGuestQueue"("live_id", "user_id");
CREATE INDEX "LiveGuestQueue_live_id_status_idx" ON "LiveGuestQueue"("live_id", "status");
CREATE INDEX "LiveGuestQueue_user_id_idx" ON "LiveGuestQueue"("user_id");

CREATE UNIQUE INDEX "LiveGuestSlot_live_id_user_id_key" ON "LiveGuestSlot"("live_id", "user_id");
CREATE UNIQUE INDEX "LiveGuestSlot_live_id_slot_index_key" ON "LiveGuestSlot"("live_id", "slot_index");
CREATE INDEX "LiveGuestSlot_live_id_idx" ON "LiveGuestSlot"("live_id");
CREATE INDEX "LiveGuestSlot_user_id_idx" ON "LiveGuestSlot"("user_id");

ALTER TABLE "LiveBattle" ADD CONSTRAINT "LiveBattle_challenger_id_fkey" FOREIGN KEY ("challenger_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveBattle" ADD CONSTRAINT "LiveBattle_opponent_id_fkey" FOREIGN KEY ("opponent_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveBattle" ADD CONSTRAINT "LiveBattle_challenger_live_id_fkey" FOREIGN KEY ("challenger_live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveBattle" ADD CONSTRAINT "LiveBattle_opponent_live_id_fkey" FOREIGN KEY ("opponent_live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiveGuestQueue" ADD CONSTRAINT "LiveGuestQueue_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveGuestQueue" ADD CONSTRAINT "LiveGuestQueue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiveGuestSlot" ADD CONSTRAINT "LiveGuestSlot_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveGuestSlot" ADD CONSTRAINT "LiveGuestSlot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
