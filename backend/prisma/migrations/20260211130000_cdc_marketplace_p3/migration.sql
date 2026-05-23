-- CDC Marketplace Mali P3 : prix négociable, validité annonce, critères détaillés avis, réponse vendeur
ALTER TABLE "Product" ADD COLUMN "negotiable_price" BOOLEAN DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "valid_until" TIMESTAMP(3);

ALTER TABLE "OrderReview" ADD COLUMN "seller_reply" TEXT;
ALTER TABLE "OrderReview" ADD COLUMN "seller_reply_at" TIMESTAMP(3);
ALTER TABLE "OrderReview" ADD COLUMN "quality_rating" INTEGER;
ALTER TABLE "OrderReview" ADD COLUMN "communication_rating" INTEGER;
ALTER TABLE "OrderReview" ADD COLUMN "delivery_rating" INTEGER;
ALTER TABLE "OrderReview" ADD COLUMN "conformity_rating" INTEGER;
