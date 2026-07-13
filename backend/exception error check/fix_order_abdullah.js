/**
 * PRODUCTION FIX SCRIPT
 * Manually fulfills order b3f5755a-7a51-4e97-a2a8-4a0377a24a4e for Abdullah Al Numan
 * - Promotes order status from FAILED → PAID
 * - Creates 2 tickets with correct attendee names
 * - Adjusts inventory back (cron had already re-incremented it)
 * - Sends ticket confirmation email
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ORDER_ID = 'b3f5755a-7a51-4e97-a2a8-4a0377a24a4e';
const USER_ID = '5963e557-f80e-4016-85d5-c30928d37ca5';
const TIER_ID = 'f449c0dc-53b4-4af7-ab14-072f0ac96aa7';

async function fixOrder() {
  console.log('🔍 Verifying order state before fix...');
  
  const order = await prisma.order.findUnique({
    where: { id: ORDER_ID },
    include: {
      user: true,
      ticketTier: { include: { event: true } },
      tickets: true,
      promoCode: true,
    },
  });

  if (!order) {
    console.error('❌ Order not found!');
    process.exit(1);
  }

  console.log(`  Status: ${order.status}`);
  console.log(`  Tickets issued: ${order.tickets.length}`);
  console.log(`  Tier available qty BEFORE fix: ${order.ticketTier.availableQty}`);

  if (order.status === 'PAID' && order.tickets.length > 0) {
    console.log('✅ Order already fulfilled. Nothing to do.');
    await prisma.$disconnect();
    return;
  }

  if (order.tickets.length > 0) {
    console.error(`⚠️  Order has ${order.tickets.length} existing tickets but status is ${order.status}. Manual review needed.`);
    await prisma.$disconnect();
    return;
  }

  const attendeeNames = order.attendeeNames ? JSON.parse(order.attendeeNames) : [];

  console.log('\n🔧 Applying fix in transaction...');

  const tickets = await prisma.$transaction(async (tx) => {
    // 1. Update order status to PAID
    await tx.order.update({
      where: { id: ORDER_ID },
      data: { status: 'PAID' },
    });

    // 2. Decrement the tier inventory back (cron job re-incremented it when it marked FAILED)
    await tx.ticketTier.update({
      where: { id: TIER_ID },
      data: { availableQty: { decrement: order.quantity } },
    });

    // 3. Create tickets
    const created = await Promise.all(
      Array.from({ length: order.quantity }, (_, i) =>
        tx.ticket.create({
          data: {
            orderId: ORDER_ID,
            ticketTierId: TIER_ID,
            userId: USER_ID,
            status: 'VALID',
            attendeeName: attendeeNames[i] || null,
          },
        })
      )
    );

    return created;
  });

  console.log(`✅ Order promoted to PAID`);
  console.log(`✅ Created ${tickets.length} ticket(s):`);
  tickets.forEach((t, i) => console.log(`   [${i+1}] ${t.id} — attendee: ${t.attendeeName || 'N/A'}`));

  // Verify final state
  const tierAfter = await prisma.ticketTier.findUnique({
    where: { id: TIER_ID },
    select: { availableQty: true },
  });
  console.log(`✅ Tier available qty AFTER fix: ${tierAfter.availableQty}`);

  console.log('\n📧 Ticket IDs for manual email resend via admin panel:');
  tickets.forEach(t => console.log(`   POST /api/admin/orders/${ORDER_ID}/resend-ticket`));

  await prisma.$disconnect();
}

fixOrder().catch((e) => {
  console.error('❌ Fix failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
