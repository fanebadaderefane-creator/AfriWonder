-- Missions journalières (rétention)
CREATE TABLE IF NOT EXISTS "DailyMissionCompletion" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mission_type" TEXT NOT NULL,
    "completed_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyMissionCompletion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyMissionCompletion_user_id_mission_type_completed_date_key" ON "DailyMissionCompletion"("user_id", "mission_type", "completed_date");
CREATE INDEX IF NOT EXISTS "DailyMissionCompletion_user_id_idx" ON "DailyMissionCompletion"("user_id");
CREATE INDEX IF NOT EXISTS "DailyMissionCompletion_completed_date_idx" ON "DailyMissionCompletion"("completed_date");
ALTER TABLE "DailyMissionCompletion" ADD CONSTRAINT "DailyMissionCompletion_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
