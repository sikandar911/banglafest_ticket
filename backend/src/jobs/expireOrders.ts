import cron from 'node-cron';
import prisma from '../lib/prisma';

export function startExpireOrdersJob(): void {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const expiredOrders = await prisma.order.findMany({
        where: {
          status: 'PENDING',
          expiresAt: { lt: new Date() },
        },
        select: { id: true, tierId: true, quantity: true },
      });

      if (expiredOrders.length === 0) return;

      console.log(`[CronJob] Expiring ${expiredOrders.length} stale order(s)...`);

      await prisma.$transaction(async (tx) => {
        for (const order of expiredOrders) {
          // Restore ticket availability
          await tx.ticketTier.update({
            where: { id: order.tierId },
            data: { availableQty: { increment: order.quantity } },
          });

          // Mark order as FAILED
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'FAILED' },
          });
        }
      });

      console.log(`[CronJob] Successfully expired ${expiredOrders.length} order(s) and restored inventory.`);
    } catch (err) {
      console.error('[CronJob] Error expiring orders:', err);
    }
  });

  console.log('[CronJob] Order expiry job started (runs every minute).');
}
