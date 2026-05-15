import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authenticate';
import { sendTicketConfirmationEmail } from '../services/email.service';
import { generateTicketPdf } from '../services/pdf.service';

// POST /api/orders
// Creates a PENDING order and reserves tickets using a Prisma transaction
export async function createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tierId, quantity } = req.body;
    const userId = req.user!.id;

    if (!tierId || !quantity || quantity < 1) {
      res.status(400).json({ error: 'tierId and a valid quantity are required.' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Lock the tier row for update
      const tier = await tx.ticketTier.findUnique({ where: { id: tierId } });
      if (!tier) throw new Error('TIER_NOT_FOUND');
      if (tier.availableQty < quantity) throw new Error('INSUFFICIENT_INVENTORY');

      const totalAmount = Number(tier.price) * quantity;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Decrement availability atomically
      await tx.ticketTier.update({
        where: { id: tierId },
        data: { availableQty: { decrement: quantity } },
      });

      // Create PENDING order
      const order = await tx.order.create({
        data: {
          userId,
          tierId,
          quantity,
          totalAmount,
          expiresAt,
          status: 'PENDING',
        },
      });

      return { order, tier, totalAmount };
    });

    res.status(201).json({
      orderId: result.order.id,
      totalAmount: result.totalAmount,
      expiresAt: result.order.expiresAt,
      tier: { id: result.tier.id, name: result.tier.name, price: Number(result.tier.price) },
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'TIER_NOT_FOUND') {
        res.status(404).json({ error: 'Ticket tier not found.' });
        return;
      }
      if (err.message === 'INSUFFICIENT_INVENTORY') {
        res.status(409).json({ error: 'Not enough tickets available.' });
        return;
      }
    }
    next(err);
  }
}

// POST /api/orders/:id/confirm  (skip-payment / dev mode)
export async function confirmOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        ticketTier: { include: { event: true } },
      },
    });

    if (!order) { res.status(404).json({ error: 'Order not found.' }); return; }
    if (order.userId !== req.user!.id) { res.status(403).json({ error: 'Access denied.' }); return; }
    // Idempotent: already paid means frontend beat the webhook or double-submit
    if (order.status === 'PAID') { res.json({ orderId: order.id, message: 'Order already confirmed.' }); return; }
    if (order.status !== 'PENDING') { res.status(400).json({ error: 'Order is no longer pending.' }); return; }

    const ticketData = Array.from({ length: order.quantity }).map(() => ({
      orderId: order.id,
      ticketTierId: order.tierId,
      userId: order.userId,
      status: 'VALID' as const,
    }));

    const tickets = await prisma.$transaction(async (tx) => {
      const created = await Promise.all(ticketData.map((d) => tx.ticket.create({ data: d })));
      await tx.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
      return created;
    });

    const pdfBuffers = await Promise.all(
      tickets.map((ticket) =>
        generateTicketPdf({
          ticketId: ticket.id,
          userName: order.user.name,
          userEmail: order.user.email,
          eventTitle: order.ticketTier.event.title,
          tierName: order.ticketTier.name,
          eventDate: order.ticketTier.event.startTime,
          location: order.ticketTier.event.location ?? '',
          orderId: order.id,
          createdAt: ticket.createdAt,
        })
      )
    );

    await sendTicketConfirmationEmail(
      order.user.email,
      order.user.name,
      tickets.map((t, i) => ({ ticketId: t.id, pdfBuffer: pdfBuffers[i] })),
      {
        eventTitle: order.ticketTier.event.title,
        tierName: order.ticketTier.name,
        eventDate: order.ticketTier.event.startTime,
      }
    );

    res.json({ orderId: order.id, message: 'Order confirmed.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:id
export async function getOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        tickets: {
          include: { ticketTier: { select: { name: true, price: true } } },
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    // Users can only see their own orders; admins can see all
    if (req.user!.role === 'USER' && order.userId !== req.user!.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
}
