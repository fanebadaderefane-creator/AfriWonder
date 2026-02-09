-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "video_url" TEXT;

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "from_currency" TEXT NOT NULL,
    "to_currency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerReview" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_staff" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_by" TEXT NOT NULL,
    "processed_by" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExchangeRate_from_currency_idx" ON "ExchangeRate"("from_currency");

-- CreateIndex
CREATE INDEX "ExchangeRate_to_currency_idx" ON "ExchangeRate"("to_currency");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_from_currency_to_currency_key" ON "ExchangeRate"("from_currency", "to_currency");

-- CreateIndex
CREATE INDEX "SellerReview_seller_id_idx" ON "SellerReview"("seller_id");

-- CreateIndex
CREATE INDEX "SellerReview_user_id_idx" ON "SellerReview"("user_id");

-- CreateIndex
CREATE INDEX "SellerReview_status_idx" ON "SellerReview"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_user_id_idx" ON "SupportTicket"("user_id");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportMessage_ticket_id_idx" ON "SupportMessage"("ticket_id");

-- CreateIndex
CREATE INDEX "SupportMessage_user_id_idx" ON "SupportMessage"("user_id");

-- CreateIndex
CREATE INDEX "Refund_order_id_idx" ON "Refund"("order_id");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- CreateIndex
CREATE INDEX "Dispute_user_id_status_idx" ON "Dispute"("user_id", "status");

-- CreateIndex
CREATE INDEX "Dispute_seller_id_status_idx" ON "Dispute"("seller_id", "status");

-- CreateIndex
CREATE INDEX "Dispute_order_id_status_idx" ON "Dispute"("order_id", "status");

-- CreateIndex
CREATE INDEX "Order_user_id_idx" ON "Order"("user_id");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_user_id_status_idx" ON "Order"("user_id", "status");

-- CreateIndex
CREATE INDEX "Order_status_created_at_idx" ON "Order"("status", "created_at");

-- CreateIndex
CREATE INDEX "Product_seller_id_status_idx" ON "Product"("seller_id", "status");

-- CreateIndex
CREATE INDEX "Product_category_status_idx" ON "Product"("category", "status");

-- CreateIndex
CREATE INDEX "Product_status_created_at_idx" ON "Product"("status", "created_at");

-- CreateIndex
CREATE INDEX "Review_product_id_status_idx" ON "Review"("product_id", "status");

-- CreateIndex
CREATE INDEX "Review_product_id_rating_idx" ON "Review"("product_id", "rating");

-- CreateIndex
CREATE INDEX "Review_user_id_product_id_idx" ON "Review"("user_id", "product_id");

-- CreateIndex
CREATE INDEX "SellerProfile_status_is_verified_idx" ON "SellerProfile"("status", "is_verified");

-- CreateIndex
CREATE INDEX "SellerProfile_country_status_idx" ON "SellerProfile"("country", "status");

-- CreateIndex
CREATE INDEX "Transaction_user_id_status_idx" ON "Transaction"("user_id", "status");

-- CreateIndex
CREATE INDEX "Transaction_type_status_idx" ON "Transaction"("type", "status");

-- CreateIndex
CREATE INDEX "Transaction_user_id_type_created_at_idx" ON "Transaction"("user_id", "type", "created_at");

-- AddForeignKey
ALTER TABLE "SellerReview" ADD CONSTRAINT "SellerReview_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerReview" ADD CONSTRAINT "SellerReview_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
