-- LiveViewer.city + LiveAnalytics.viewer_cities (CDC analytics villes)
ALTER TABLE "LiveViewer" ADD COLUMN IF NOT EXISTS "city" TEXT;

ALTER TABLE "LiveAnalytics" ADD COLUMN IF NOT EXISTS "viewer_cities" JSONB;
