-- CreateTable
CREATE TABLE "group_promos" (
    "id" TEXT NOT NULL,
    "promo_code_id" TEXT NOT NULL,
    "ticket_tier_id" TEXT NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "min_tickets" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "group_promos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_promos_promo_code_id_ticket_tier_id_key" ON "group_promos"("promo_code_id", "ticket_tier_id");

-- AddForeignKey
ALTER TABLE "group_promos" ADD CONSTRAINT "group_promos_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_promos" ADD CONSTRAINT "group_promos_ticket_tier_id_fkey" FOREIGN KEY ("ticket_tier_id") REFERENCES "ticket_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
