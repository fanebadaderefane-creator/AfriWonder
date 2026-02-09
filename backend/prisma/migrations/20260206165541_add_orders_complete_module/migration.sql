/*
  Warnings:

  - You are about to drop the column `price` on the `OrderItem` table. All the data in the column will be lost.
  - Added the required column `subtotal_amount` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_price` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "evidence_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "resolution_type" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "actual_delivery_date" TIMESTAMP(3),
ADD COLUMN     "billing_address" TEXT,
ADD COLUMN     "carrier" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'XOF',
ADD COLUMN     "customer_notes" TEXT,
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "display_currency" TEXT,
ADD COLUMN     "dispute_status" TEXT,
ADD COLUMN     "escrow_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "estimated_delivery_date" TIMESTAMP(3),
ADD COLUMN     "exchange_rate" DOUBLE PRECISION,
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "payment_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "seller_id" TEXT,
ADD COLUMN     "shipped_at" TIMESTAMP(3),
ADD COLUMN     "shipping_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal_amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "tax_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tracking_number" TEXT,
ADD COLUMN     "transaction_id" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "price",
ADD COLUMN     "product_snapshot" JSONB,
ADD COLUMN     "unit_price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "variant" JSONB;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "order_id" TEXT;

-- AlterTable
ALTER TABLE "Shipping" ADD COLUMN     "current_location" TEXT,
ADD COLUMN     "proof_of_delivery_photo" TEXT,
ADD COLUMN     "signature" TEXT;

-- CreateTable
CREATE TABLE "OrderPayment" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "transaction_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "paid_at" TIMESTAMP(3),
    "provider_reference" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderReview" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_item_id" TEXT,
    "product_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_rating" INTEGER NOT NULL,
    "seller_rating" INTEGER,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeMessage" (
    "id" TEXT NOT NULL,
    "dispute_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_staff" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderInvoice" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "pdf_url" TEXT,
    "tax_id" TEXT,
    "vat_amount" DOUBLE PRECISION,
    "vat_rate" DOUBLE PRECISION,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderPayment_order_id_idx" ON "OrderPayment"("order_id");

-- CreateIndex
CREATE INDEX "OrderPayment_provider_idx" ON "OrderPayment"("provider");

-- CreateIndex
CREATE INDEX "OrderPayment_status_idx" ON "OrderPayment"("status");

-- CreateIndex
CREATE INDEX "OrderPayment_transaction_id_idx" ON "OrderPayment"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "OrderPayment_order_id_provider_transaction_id_key" ON "OrderPayment"("order_id", "provider", "transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "OrderReview_order_item_id_key" ON "OrderReview"("order_item_id");

-- CreateIndex
CREATE INDEX "OrderReview_order_id_idx" ON "OrderReview"("order_id");

-- CreateIndex
CREATE INDEX "OrderReview_product_id_idx" ON "OrderReview"("product_id");

-- CreateIndex
CREATE INDEX "OrderReview_seller_id_idx" ON "OrderReview"("seller_id");

-- CreateIndex
CREATE INDEX "OrderReview_user_id_idx" ON "OrderReview"("user_id");

-- CreateIndex
CREATE INDEX "OrderReview_status_idx" ON "OrderReview"("status");

-- CreateIndex
CREATE INDEX "OrderReview_product_rating_idx" ON "OrderReview"("product_rating");

-- CreateIndex
CREATE UNIQUE INDEX "OrderReview_order_id_product_id_key" ON "OrderReview"("order_id", "product_id");

-- CreateIndex
CREATE INDEX "DisputeMessage_dispute_id_idx" ON "DisputeMessage"("dispute_id");

-- CreateIndex
CREATE INDEX "DisputeMessage_user_id_idx" ON "DisputeMessage"("user_id");

-- CreateIndex
CREATE INDEX "DisputeMessage_created_at_idx" ON "DisputeMessage"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "OrderInvoice_order_id_key" ON "OrderInvoice"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "OrderInvoice_invoice_number_key" ON "OrderInvoice"("invoice_number");

-- CreateIndex
CREATE INDEX "OrderInvoice_order_id_idx" ON "OrderInvoice"("order_id");

-- CreateIndex
CREATE INDEX "OrderInvoice_invoice_number_idx" ON "OrderInvoice"("invoice_number");

-- CreateIndex
CREATE INDEX "OrderInvoice_issued_at_idx" ON "OrderInvoice"("issued_at");

-- CreateIndex
CREATE INDEX "Order_seller_id_idx" ON "Order"("seller_id");

-- CreateIndex
CREATE INDEX "Order_payment_status_idx" ON "Order"("payment_status");

-- CreateIndex
CREATE INDEX "Order_seller_id_status_idx" ON "Order"("seller_id", "status");

-- CreateIndex
CREATE INDEX "Order_tracking_number_idx" ON "Order"("tracking_number");

-- CreateIndex
CREATE INDEX "Order_payment_status_status_idx" ON "Order"("payment_status", "status");

-- CreateIndex
CREATE INDEX "Review_order_id_idx" ON "Review"("order_id");

-- CreateIndex
CREATE INDEX "Review_order_id_product_id_idx" ON "Review"("order_id", "product_id");

-- CreateIndex
CREATE INDEX "Shipping_carrier_idx" ON "Shipping"("carrier");

-- AddForeignKey
ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReview" ADD CONSTRAINT "OrderReview_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReview" ADD CONSTRAINT "OrderReview_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReview" ADD CONSTRAINT "OrderReview_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReview" ADD CONSTRAINT "OrderReview_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderInvoice" ADD CONSTRAINT "OrderInvoice_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
