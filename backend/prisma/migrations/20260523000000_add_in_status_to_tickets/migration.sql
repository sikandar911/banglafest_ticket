-- Add inStatus column to tickets table
ALTER TABLE "tickets" ADD COLUMN "in_status" BOOLEAN NOT NULL DEFAULT false;
