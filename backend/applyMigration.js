const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndApply() {
  try {
    console.log('🔍 Checking database schema...\n');

    // Check ticket_tiers columns
    const tierColumns = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'ticket_tiers' 
      AND column_name IN ('promo_discount_amount')
    `;
    console.log('ticket_tiers columns:');
    console.log('  promo_discount_amount:', tierColumns.length > 0 ? '✅ EXISTS' : '❌ MISSING');

    // Check orders columns
    const orderColumns = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('promo_code_id', 'discount_amount')
    `;
    console.log('\norders columns:');
    console.log('  promo_code_id:', orderColumns.some(c => c.column_name === 'promo_code_id') ? '✅ EXISTS' : '❌ MISSING');
    console.log('  discount_amount:', orderColumns.some(c => c.column_name === 'discount_amount') ? '✅ EXISTS' : '❌ MISSING');

    // Check tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('promo_codes', 'promo_code_events')
    `;
    console.log('\nPromo tables:');
    console.log('  promo_codes:', tables.some(t => t.table_name === 'promo_codes') ? '✅ EXISTS' : '❌ MISSING');
    console.log('  promo_code_events:', tables.some(t => t.table_name === 'promo_code_events') ? '✅ EXISTS' : '❌ MISSING');

    // Apply missing migrations
    console.log('\n📝 Applying missing schema changes...\n');

    // Add promo_discount_amount if missing
    if (tierColumns.length === 0) {
      console.log('⏳ Adding promo_discount_amount to ticket_tiers...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "ticket_tiers" ADD COLUMN "promo_discount_amount" DECIMAL(10,2)`
      );
      console.log('✅ Done');
    }

    // Add promo_code_id if missing
    if (!orderColumns.some(c => c.column_name === 'promo_code_id')) {
      console.log('⏳ Adding promo_code_id to orders...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "orders" ADD COLUMN "promo_code_id" TEXT`
      );
      console.log('✅ Done');
    }

    // Create promo_codes table if missing
    if (!tables.some(t => t.table_name === 'promo_codes')) {
      console.log('⏳ Creating promo_codes table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "promo_codes" (
            "id" TEXT NOT NULL,
            "code" TEXT NOT NULL,
            "influencer_name" TEXT NOT NULL,
            "social_media" TEXT,
            "is_active" BOOLEAN NOT NULL DEFAULT true,
            "usage_count" INTEGER NOT NULL DEFAULT 0,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
        )
      `);
      console.log('✅ Done');

      console.log('⏳ Creating unique index on promo_codes.code...');
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code")`
      );
      console.log('✅ Done');
    }

    // Create promo_code_events table if missing
    if (!tables.some(t => t.table_name === 'promo_code_events')) {
      console.log('⏳ Creating promo_code_events table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "promo_code_events" (
            "promo_code_id" TEXT NOT NULL,
            "event_id" TEXT NOT NULL,
            CONSTRAINT "promo_code_events_pkey" PRIMARY KEY ("promo_code_id","event_id")
        )
      `);
      console.log('✅ Done');

      console.log('⏳ Adding foreign key constraints...');
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "promo_code_events" ADD CONSTRAINT "promo_code_events_promo_code_id_fkey"
            FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        console.log('✅ promo_code_events_promo_code_id_fkey');

        await prisma.$executeRawUnsafe(
          `ALTER TABLE "promo_code_events" ADD CONSTRAINT "promo_code_events_event_id_fkey"
            FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        );
        console.log('✅ promo_code_events_event_id_fkey');

        await prisma.$executeRawUnsafe(
          `ALTER TABLE "orders" ADD CONSTRAINT "orders_promo_code_id_fkey"
            FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE`
        );
        console.log('✅ orders_promo_code_id_fkey');
      } catch (err) {
        console.log('ℹ️  Foreign keys may already exist:', err.message.substring(0, 50));
      }
    }

    console.log('\n✅ Schema migration complete!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndApply();
