-- AlterTable: SellerProfile - Phase 1 Marketplace
-- Ajout: phone, whatsapp, tiktok_url, instagram_url, x_url
-- status: default "pending" (admin approuve avant que la boutique soit visible)

ALTER TABLE "SellerProfile" ADD COLUMN "phone" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN "tiktok_url" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN "instagram_url" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN "x_url" TEXT;
ALTER TABLE "SellerProfile" ALTER COLUMN "status" SET DEFAULT 'pending';
