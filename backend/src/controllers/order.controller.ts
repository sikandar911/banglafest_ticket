import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authenticate';
import { sendTicketConfirmationEmail } from '../services/email.service';
import { generateTicketPdf } from '../services/pdf.service';

// POST /api/orders
// Creates a PENDING order and reserves tickets using a Prisma transaction
export async function createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tierId, quantity, promoCode } = req.body;
    const userId = req.user!.id;

    if (!tierId || !quantity || quantity < 1) {
      res.status(400).json({ error: 'tierId and a valid quantity are required.' });
      return;
    }

    // Validate promo code if provided
    let promoCodeRecord: { id: string } | null = null;
    let discountPerTicket = 0;

    if (promoCode) {
      const normalizedCode = String(promoCode).trim().toUpperCase();
      const found = await prisma.promoCode.findUnique({
        where: { code: normalizedCode },
        include: {
          events: {
            include: {
              event: { include: { ticketTiers: { where: { id: tierId } } } },
            },
          },
        },
      });

      if (found && found.isActive) {
        const tierInPromo = found.events.some((pe) => pe.event.ticketTiers.length > 0);
        if (tierInPromo) {
          promoCodeRecord = { id: found.id };
          const tier = await prisma.ticketTier.findUnique({ where: { id: tierId } });
          discountPerTicket = tier?.promoDiscountAmount ? Number(tier.promoDiscountAmount) : 0;
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Atomic decrement — only succeeds if availableQty >= quantity.
      const updated = await tx.ticketTier.updateMany({
        where: { id: tierId, availableQty: { gte: quantity } },
        data: { availableQty: { decrement: quantity } },
      });

      if (updated.count === 0) {
        const tier = await tx.ticketTier.findUnique({ where: { id: tierId } });
        if (!tier) throw new Error('TIER_NOT_FOUND');
        throw new Error('INSUFFICIENT_INVENTORY');
      }

      const tier = await tx.ticketTier.findUnique({ where: { id: tierId } });
      const baseTotal = Number(tier!.price) * quantity;
      const totalDiscount = discountPerTicket * quantity;
      const totalAmount = Math.max(0, baseTotal - totalDiscount);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const order = await tx.order.create({
        data: {
          userId,
          tierId,
          quantity,
          totalAmount,
          expiresAt,
          status: 'PENDING',
          ...(promoCodeRecord && {
            promoCodeId: promoCodeRecord.id,
            discountAmount: totalDiscount,
          }),
        },
      });

      // Increment promo code usage count
      if (promoCodeRecord) {
        await tx.promoCode.update({
          where: { id: promoCodeRecord.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      return { order, tier: tier!, totalAmount, totalDiscount };
    });

    res.status(201).json({
      orderId: result.order.id,
      totalAmount: result.totalAmount,
      discountAmount: result.totalDiscount,
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
    if (order.status === 'PAID') { res.json({ orderId: order.id, message: 'Order already confirmed.' }); return; }
    if (order.status !== 'PENDING') { res.status(400).json({ error: 'Order is no longer pending.' }); return; }
    if (order.expiresAt < new Date()) { res.status(400).json({ error: 'Order has expired. Please start a new checkout.' }); return; }

    // Atomic status transition — prevents double-confirmation if webhook and
    // frontend confirmOrder race each other
    const ticketData = Array.from({ length: order.quantity }).map(() => ({
      orderId: order.id,
      ticketTierId: order.tierId,
      userId: order.userId,
      status: 'VALID' as const,
    }));

    const tickets = await prisma.$transaction(async (tx) => {
      // Transition PENDING → PAID atomically; 0 rows means already processed
      const transitioned = await tx.order.updateMany({
        where: { id: order.id, status: 'PENDING' },
        data: { status: 'PAID' },
      });
      if (transitioned.count === 0) return null; // webhook beat us — idempotent

      const created = await Promise.all(ticketData.map((d) => tx.ticket.create({ data: d })));
      return created;
    });

    if (!tickets) { res.json({ orderId: order.id, message: 'Order already confirmed.' }); return; }

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
