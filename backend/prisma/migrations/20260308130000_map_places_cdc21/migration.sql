CREATE TABLE "MapPlace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapPlace_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MapPlace_latitude_longitude_idx" ON "MapPlace"("latitude", "longitude");
CREATE INDEX "MapPlace_category_idx" ON "MapPlace"("category");
