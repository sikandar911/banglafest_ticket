-- AlterTable: add attendee_name to tickets (nullable)
ALTER TABLE "tickets" ADD COLUMN "attendee_name" TEXT;

-- AlterTable: add attendee_names to orders (nullable, stored as JSON string)
ALTER TABLE "orders" ADD COLUMN "attendee_names" TEXT;
