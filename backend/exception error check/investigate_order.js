const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate() {
  const orderId = 'b3f5755a-7a51-4e97-a2a8-4a0377a24a4e';

  console.log('=== ORDER DETAILS ===');
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true } },
      ticketTier: {
        select: {
          name: true,
          price: true,
          availableQty: true,
          totalCapacity: true,
          event: { select: { title: true } },
        },
      },
      tickets: true,
      promoCode: { select: { code: true, discountAmount: true } },
    },
  });

  if (!order) {
    console.log('ORDER NOT FOUND!');
    process.exit(1);
  }

  console.log(JSON.stringify({
    id: order.id,
    status: order.status,
    stripePaymentIntent: order.stripePaymentIntent,
    stripeSessionId: order.stripeSessionId,
    quantity: order.quantity,
    totalAmount: order.totalAmount?.toString(),
    discountAmount: order.discountAmount?.toString(),
    expiresAt: order.expiresAt,
    createdAt: order.createdAt,
    isBypassed: order.isBypassed,
    paymentMethod: order.paymentMethod,
    attendeeNames: order.attendeeNames,
    user: order.user,
    ticketTier: {
      name: order.ticketTier?.name,
      price: order.ticketTier?.price?.toString(),
      availableQty: order.ticketTier?.availableQty,
      totalCapacity: order.ticketTier?.totalCapacity,
      event: order.ticketTier?.event,
    },
    ticketCount: order.tickets.length,
    tickets: order.tickets,
    promoCode: order.promoCode,
  }, null, 2));

  // Check if there are any other orders from this user
  console.log('\n=== OTHER RECENT ORDERS FROM SAME USER ===');
  const userOrders = await prisma.order.findMany({
    where: { userId: order.userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      status: true,
      createdAt: true,
      totalAmount: true,
      stripePaymentIntent: true,
      expiresAt: true,
    },
  });
  console.log(JSON.stringify(userOrders, null, 2));

  // Check the tier's current inventory
  console.log('\n=== TIER INVENTORY CHECK ===');
  const tier = await prisma.ticketTier.findUnique({
    where: { id: order.tierId },
    select: { id: true, name: true, availableQty: true, totalCapacity: true },
  });
  console.log(JSON.stringify(tier, null, 2));

  await prisma.$disconnect();
}

investigate().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
