-- CPO 9.33 — Alertes prix voyage
CREATE TABLE "TravelPriceAlert" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "origin" TEXT,
    "destination" TEXT NOT NULL,
    "target_price" DOUBLE PRECISION NOT NULL,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelPriceAlert_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TravelPriceAlert_user_id_idx" ON "TravelPriceAlert"("user_id");
CREATE INDEX "TravelPriceAlert_type_destination_idx" ON "TravelPriceAlert"("type", "destination");
ALTER TABLE "TravelPriceAlert" ADD CONSTRAINT "TravelPriceAlert_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CPO 9.25 — Groupes d'achat
CREATE TABLE "GroupBuy" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "min_quantity" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'open',
    "end_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupBuy_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GroupBuy_product_id_idx" ON "GroupBuy"("product_id");
CREATE INDEX "GroupBuy_creator_id_idx" ON "GroupBuy"("creator_id");
CREATE INDEX "GroupBuy_status_idx" ON "GroupBuy"("status");
ALTER TABLE "GroupBuy" ADD CONSTRAINT "GroupBuy_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupBuy" ADD CONSTRAINT "GroupBuy_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GroupBuyParticipant" (
    "id" TEXT NOT NULL,
    "group_buy_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupBuyParticipant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GroupBuyParticipant_group_buy_id_user_id_key" ON "GroupBuyParticipant"("group_buy_id", "user_id");
CREATE INDEX "GroupBuyParticipant_group_buy_id_idx" ON "GroupBuyParticipant"("group_buy_id");
CREATE INDEX "GroupBuyParticipant_user_id_idx" ON "GroupBuyParticipant"("user_id");
ALTER TABLE "GroupBuyParticipant" ADD CONSTRAINT "GroupBuyParticipant_group_buy_id_fkey" FOREIGN KEY ("group_buy_id") REFERENCES "GroupBuy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupBuyParticipant" ADD CONSTRAINT "GroupBuyParticipant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CPO 11.36 — A/B testing
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Experiment_key_key" ON "Experiment"("key");

CREATE TABLE "ExperimentVariant" (
    "id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "variant_key" TEXT NOT NULL,
    "traffic_pct" INTEGER NOT NULL DEFAULT 50,
    "config" JSONB,

    CONSTRAINT "ExperimentVariant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExperimentVariant_experiment_id_variant_key_key" ON "ExperimentVariant"("experiment_id", "variant_key");
CREATE INDEX "ExperimentVariant_experiment_id_idx" ON "ExperimentVariant"("experiment_id");
ALTER TABLE "ExperimentVariant" ADD CONSTRAINT "ExperimentVariant_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserExperimentAssignment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "variant_key" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserExperimentAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserExperimentAssignment_user_id_experiment_id_key" ON "UserExperimentAssignment"("user_id", "experiment_id");
CREATE INDEX "UserExperimentAssignment_user_id_idx" ON "UserExperimentAssignment"("user_id");
CREATE INDEX "UserExperimentAssignment_experiment_id_idx" ON "UserExperimentAssignment"("experiment_id");
ALTER TABLE "UserExperimentAssignment" ADD CONSTRAINT "UserExperimentAssignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserExperimentAssignment" ADD CONSTRAINT "UserExperimentAssignment_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
