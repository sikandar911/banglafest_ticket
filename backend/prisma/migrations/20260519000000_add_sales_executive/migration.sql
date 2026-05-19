-- AlterEnum: Add SALES_EXECUTIVE to Role
ALTER TYPE "Role" ADD VALUE 'SALES_EXECUTIVE';

-- CreateEnum: PaymentMethod
CREATE TYPE "PaymentMethod" AS ENUM ('ONLINE', 'CASH', 'CARD_MACHINE');

-- AlterTable: Add sales_executive_id and payment_method to orders
ALTER TABLE "orders" ADD COLUMN "sales_executive_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "payment_method" "PaymentMethod" NOT NULL DEFAULT 'ONLINE';

-- AddForeignKey: sales_executive_id -> users
ALTER TABLE "orders" ADD CONSTRAINT "orders_sales_executive_id_fkey"
  FOREIGN KEY ("sales_executive_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
