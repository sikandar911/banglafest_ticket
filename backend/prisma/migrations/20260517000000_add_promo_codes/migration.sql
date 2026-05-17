-- Add promo_discount_amount to ticket_tiers
ALTER TABLE "ticket_tiers" ADD COLUMN "promo_discount_amount" DECIMAL(10,2);

-- Add promo code fields to orders
ALTER TABLE "orders" ADD COLUMN "promo_code_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "discount_amount" DECIMAL(10,2);

-- Create promo_codes table
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "influencer_name" TEXT NOT NULL,
    "social_media" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- Create promo_code_events join table
CREATE TABLE "promo_code_events" (
    "promo_code_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    CONSTRAINT "promo_code_events_pkey" PRIMARY KEY ("promo_code_id","event_id")
);

-- Unique constraint on promo code
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- Foreign keys
ALTER TABLE "promo_code_events" ADD CONSTRAINT "promo_code_events_promo_code_id_fkey"
    FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "promo_code_events" ADD CONSTRAINT "promo_code_events_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_promo_code_id_fkey"
    FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
