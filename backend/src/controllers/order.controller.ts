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
        const now = new Date();
        const withinDates =
          (!found.startDate || now >= found.startDate) &&
          (!found.endDate || now <= found.endDate);
        const tierInPromo = found.events.some((pe) => pe.event.ticketTiers.length > 0);
        if (tierInPromo && withinDates) {
          promoCodeRecord = { id: found.id };
          if (found.discountAmount != null) {
            discountPerTicket = Number(found.discountAmount);
          } else {
            const tier = await prisma.ticketTier.findUnique({ where: { id: tierId } });
            discountPerTicket = tier?.promoDiscountAmount ? Number(tier.promoDiscountAmount) : 0;
          }
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
    const attendeeNamesArr: string[] = order.attendeeNames
      ? (JSON.parse(order.attendeeNames) as string[])
      : [];

    const ticketData = Array.from({ length: order.quantity }, (_, i) => ({
      orderId: order.id,
      ticketTierId: order.tierId,
      userId: order.userId,
      status: 'VALID' as const,
      attendeeName: attendeeNamesArr[i] || null,
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
          attendeeName: ticket.attendeeName ?? undefined,
          userName: order.user.name,
          userEmail: order.user.email,
          eventTitle: order.ticketTier.event.title,
          tierName: order.ticketTier.name,
          eventDate: order.ticketTier.event.startTime,
          location: order.ticketTier.event.location ?? '',
          orderId: order.id,
          createdAt: ticket.createdAt,
          features: order.ticketTier.features ? JSON.parse(order.ticketTier.features as string) : undefined,
          performers: order.ticketTier.event.performers ? JSON.parse(order.ticketTier.event.performers as string) : undefined,
          specialAdditions: order.ticketTier.event.specialAdditions ? JSON.parse(order.ticketTier.event.specialAdditions as string) : undefined,
        })
      )
    );

    await sendTicketConfirmationEmail(
      order.user.email,
      order.user.name,
      tickets.map((t, i) => ({ ticketId: t.id, pdfBuffer: pdfBuffers[i] })),
      {
        orderId: order.id,
        eventTitle: order.ticketTier.event.title,
        tierName: order.ticketTier.name,
        eventDate: order.ticketTier.event.startTime,
        eventStartTime: order.ticketTier.event.startTime,
        eventVenue: order.ticketTier.event.location ?? 'TBD',
        quantity: order.quantity,
        unitPrice: Number(order.ticketTier.price),
        totalAmount: Number(order.totalAmount),
      }
    );

    res.json({ orderId: order.id, message: 'Order confirmed.' });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/orders/:id/attendee-names
// Stores attendee names for each ticket slot in a PENDING order.
// Must be called before payment. Names are optional per slot (empty string = use account name).
export async function setAttendeeNames(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { names } = req.body;

    if (!Array.isArray(names)) {
      res.status(400).json({ error: 'names must be an array of strings.' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (order.userId !== req.user!.id && order.salesExecutiveId !== req.user!.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    if (order.status !== 'PENDING' && order.status !== 'PAID') {
      res.status(400).json({ error: 'Attendee names can only be set for pending or paid orders.' });
      return;
    }

    // Clamp to order quantity, sanitise each name
    const sanitised = Array.from({ length: order.quantity }, (_, i) => {
      const raw = names[i];
      return typeof raw === 'string' ? raw.trim().slice(0, 100) : '';
    });

    await prisma.order.update({
      where: { id },
      data: { attendeeNames: JSON.stringify(sanitised) },
    });

    // For PAID orders (sales flow): tickets already exist — update attendeeName on each
    // and send confirmation email with correct names.
    if (order.status === 'PAID') {
      const tickets = await prisma.ticket.findMany({
        where: { orderId: order.id, status: { not: 'CANCELLED' } },
        include: {
          user: { select: { name: true, email: true } },
          ticketTier: { include: { event: true } },
        },
      });

      // Update each ticket's attendeeName field
      await Promise.all(
        tickets.map((ticket, i) =>
          prisma.ticket.update({
            where: { id: ticket.id },
            data: { attendeeName: sanitised[i] || null },
          })
        )
      );

      // Generate PDFs and send confirmation email (best-effort)
      if (tickets.length > 0) {
        const firstTicket = tickets[0];
        const pdfBuffers = await Promise.all(
          tickets.map((ticket, i) =>
            generateTicketPdf({
              ticketId: ticket.id,
              attendeeName: sanitised[i] || undefined,
              userName: ticket.user.name,
              userEmail: ticket.user.email,
              eventTitle: ticket.ticketTier.event.title,
              tierName: ticket.ticketTier.name,
              eventDate: ticket.ticketTier.event.startTime,
              location: ticket.ticketTier.event.location ?? '',
              orderId: order.id,
              createdAt: ticket.createdAt,
              features: ticket.ticketTier.features ? JSON.parse(ticket.ticketTier.features as string) : undefined,
              performers: ticket.ticketTier.event.performers ? JSON.parse(ticket.ticketTier.event.performers as string) : undefined,
              specialAdditions: ticket.ticketTier.event.specialAdditions ? JSON.parse(ticket.ticketTier.event.specialAdditions as string) : undefined,
            })
          )
        );

        sendTicketConfirmationEmail(
          firstTicket.user.email,
          firstTicket.user.name,
          tickets.map((t, i) => ({ ticketId: t.id, pdfBuffer: pdfBuffers[i] })),
          {
            orderId: order.id,
            eventTitle: firstTicket.ticketTier.event.title,
            tierName: firstTicket.ticketTier.name,
            eventDate: firstTicket.ticketTier.event.startTime,
            eventStartTime: firstTicket.ticketTier.event.startTime,
            eventVenue: firstTicket.ticketTier.event.location ?? 'TBD',
            quantity: tickets.length,
            unitPrice: Number(firstTicket.ticketTier.price),
            totalAmount: Number(order.totalAmount),
          }
        ).catch((err) => console.error('[setAttendeeNames] Failed to send ticket email:', err));
      }
    }

    res.json({ message: 'Attendee names saved.' });
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
