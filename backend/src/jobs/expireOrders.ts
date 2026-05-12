import cron from 'node-cron';
import prisma from '../lib/prisma';
import { sendOrderExpiredEmail } from '../services/email.service';

export function startExpireOrdersJob(): void {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const expiredOrders = await prisma.order.findMany({
        where: {
          status: 'PENDING',
          expiresAt: { lt: new Date() },
        },
        include: {
          user: { select: { name: true, email: true } },
          ticketTier: { include: { event: { select: { title: true } } } },
        },
      });

      if (expiredOrders.length === 0) return;

      console.log(`[CronJob] Expiring ${expiredOrders.length} stale order(s)...`);

      await prisma.$transaction(async (tx) => {
        for (const order of expiredOrders) {
          await tx.ticketTier.update({
            where: { id: order.tierId },
            data: { availableQty: { increment: order.quantity } },
          });
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'FAILED' },
          });
        }
      });

      // Send expiry notifications after transaction commits
      await Promise.allSettled(
        expiredOrders.map((order) =>
          sendOrderExpiredEmail(order.user.email, order.user.name, {
            eventTitle: order.ticketTier.event.title,
            tierName: order.ticketTier.name,
            quantity: order.quantity,
          })
        )
      );

      console.log(`[CronJob] Successfully expired ${expiredOrders.length} order(s) and restored inventory.`);
    } catch (err) {
      console.error('[CronJob] Error expiring orders:', err);
    }
  });

  console.log('[CronJob] Order expiry job started (runs every minute).');
}
