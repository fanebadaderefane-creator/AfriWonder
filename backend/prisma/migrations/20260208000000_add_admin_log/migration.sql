-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminLog_admin_id_idx" ON "AdminLog"("admin_id");

-- CreateIndex
CREATE INDEX "AdminLog_action_type_idx" ON "AdminLog"("action_type");

-- CreateIndex
CREATE INDEX "AdminLog_target_type_idx" ON "AdminLog"("target_type");

-- CreateIndex
CREATE INDEX "AdminLog_created_at_idx" ON "AdminLog"("created_at");
