/*
  Warnings:

  - You are about to drop the column `is_admin_bypass` on the `orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "is_admin_bypass",
ADD COLUMN     "is_bypassed" BOOLEAN NOT NULL DEFAULT false;
