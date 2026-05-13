import { Response, NextFunction, Request } from 'express';
import Stripe from 'stripe';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authenticate';
import {
  sendTicketConfirmationEmail,
  sendRefundConfirmationEmail,
} from '../services/email.service';
import { generateTicketPdf } from '../services/pdf.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

// ─── Event Management ─────────────────────────────────────────────────────────

// POST /api/admin/events
export async function createEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, startTime, endTime, location } = req.body;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        createdBy: req.user!.id,
      },
    });

    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/events/:id
export async function updateEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { title, description, startTime, endTime, location } = req.body;

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(location !== undefined && { location }),
      },
    });

    res.json({ event });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/events/:id
export async function deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    await prisma.event.delete({ where: { id } });
    res.json({ message: 'Event deleted.' });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/events/:id/tiers
export async function createTier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: eventId } = req.params;
    const { name, description, price, totalCapacity, features, maxPerPerson } = req.body;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }

    const tier = await prisma.ticketTier.create({
      data: {
        eventId,
        name,
        description: description || null,
        price,
        totalCapacity,
        availableQty: totalCapacity,
        features: features && features.length > 0 ? JSON.stringify(features) : null,
        maxPerPerson: maxPerPerson || 1,
      },
    });

    res.status(201).json({ 
      tier: {
        ...tier,
        features: tier.features ? JSON.parse(tier.features) : [],
      }
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/tiers/:id
export async function updateTier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, description, price, totalCapacity, features, maxPerPerson } = req.body;

    const existing = await prisma.ticketTier.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Ticket tier not found.' });
      return;
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (price !== undefined) updateData.price = price;
    if (totalCapacity !== undefined) {
      updateData.totalCapacity = totalCapacity;
      updateData.availableQty = existing.availableQty + (totalCapacity - existing.totalCapacity);
    }
    if (features !== undefined) {
      updateData.features = features && features.length > 0 ? JSON.stringify(features) : null;
    }
    if (maxPerPerson !== undefined) updateData.maxPerPerson = maxPerPerson;

    const tier = await prisma.ticketTier.update({
      where: { id },
      data: updateData,
    });

    res.json({ 
      tier: {
        ...tier,
        features: tier.features ? JSON.parse(tier.features) : [],
      }
    });
  } catch (err) {
    next(err);
  }
}

// ─── Finance & Reporting ──────────────────────────────────────────────────────

// GET /api/admin/revenue
export async function getRevenue(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await prisma.order.aggregate({
      where: { status: 'PAID' },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const refundedResult = await prisma.order.aggregate({
      where: { status: 'REFUNDED' },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const recentOrders = await prisma.order.findMany({
      where: { status: { in: ['PAID', 'REFUNDED'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { name: true, email: true } },
        ticketTier: { select: { name: true } },
      },
    });

    res.json({
      totalRevenue: Number(result._sum.totalAmount ?? 0),
      paidOrderCount: result._count.id,
      totalRefunded: Number(refundedResult._sum.totalAmount ?? 0),
      refundedOrderCount: refundedResult._count.id,
      netRevenue:
        Number(result._sum.totalAmount ?? 0) - Number(refundedResult._sum.totalAmount ?? 0),
      recentOrders: recentOrders.map((o) => ({ ...o, totalAmount: Number(o.totalAmount) })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users
export async function listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
        orders: {
          where: { status: 'PAID' },
          select: { id: true, totalAmount: true, createdAt: true },
        },
      },
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/orders
export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = status ? { status: status as 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' } : {};

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          ticketTier: { select: { name: true } },
          tickets: { select: { id: true, status: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders: orders.map((o) => ({ ...o, totalAmount: Number(o.totalAmount) })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/orders/:id/refund
export async function refundOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        tickets: true,
        user: { select: { name: true, email: true } },
        ticketTier: { include: { event: { select: { title: true } } } },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (order.status !== 'PAID') {
      res.status(400).json({ error: 'Only PAID orders can be refunded.' });
      return;
    }

    if (!order.stripePaymentIntent) {
      res.status(400).json({ error: 'No payment intent found for this order.' });
      return;
    }

    // Issue refund via Stripe
    await stripe.refunds.create({ payment_intent: order.stripePaymentIntent });

    // Update DB — cancel all tickets and mark order REFUNDED
    await prisma.$transaction([
      prisma.order.update({ where: { id }, data: { status: 'REFUNDED' } }),
      prisma.ticket.updateMany({
        where: { orderId: id },
        data: { status: 'CANCELLED' },
      }),
    ]);

    await sendRefundConfirmationEmail(order.user.email, order.user.name, {
      orderId: order.id,
      amount: Number(order.totalAmount),
      eventTitle: order.ticketTier.event.title,
      tierName: order.ticketTier.name,
      quantity: order.quantity,
    });

    res.json({ message: 'Order refunded and tickets cancelled successfully.' });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/tickets/:ticketId/resend
export async function resendTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ticketId } = req.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { name: true, email: true } },
        ticketTier: { include: { event: true } },
        order: { select: { id: true } },
      },
    });

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }

    if (ticket.status === 'CANCELLED') {
      res.status(400).json({ error: 'Cannot resend a cancelled ticket.' });
      return;
    }

    const pdfBuffer = await generateTicketPdf({
      ticketId: ticket.id,
      userName: ticket.user.name,
      userEmail: ticket.user.email,
      eventTitle: ticket.ticketTier.event.title,
      tierName: ticket.ticketTier.name,
      eventDate: ticket.ticketTier.event.startTime,
      location: ticket.ticketTier.event.location ?? '',
      orderId: ticket.order.id,
      createdAt: ticket.createdAt,
    });

    await sendTicketConfirmationEmail(
      ticket.user.email,
      ticket.user.name,
      [{ ticketId: ticket.id, pdfBuffer }],
      {
        eventTitle: ticket.ticketTier.event.title,
        tierName: ticket.ticketTier.name,
        eventDate: ticket.ticketTier.event.startTime,
      }
    );

    res.json({ message: 'Ticket resent successfully.' });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/bypass - Admin book tickets without payment
export async function bypassBookTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, tierId, quantity } = req.body;

    // Validate input
    if (!userId || !tierId || !quantity || quantity < 1) {
      res.status(400).json({ error: 'Invalid input. Provide userId, tierId, and quantity.' });
      return;
    }

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // Check tier exists and has availability
    const tier = await prisma.ticketTier.findUnique({
      where: { id: tierId },
      include: { event: true },
    });
    if (!tier) {
      res.status(404).json({ error: 'Ticket tier not found.' });
      return;
    }

    if (tier.availableQty < quantity) {
      res.status(400).json({ error: `Only ${tier.availableQty} tickets available.` });
      return;
    }

    // Create order with bypass flag
    const order = await prisma.order.create({
      data: {
        userId,
        tierId,
        quantity,
        totalAmount: 0, // No charge for bypass
        status: 'PAID', // Auto-mark as paid since it's admin bypass
        isBypassed: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
      },
      include: {
        ticketTier: { include: { event: true } },
      },
    });

    // Update tier availability
    await prisma.ticketTier.update({
      where: { id: tierId },
      data: { availableQty: tier.availableQty - quantity },
    });

    // Generate tickets
    const ticketPromises = [];
    for (let i = 0; i < quantity; i++) {
      ticketPromises.push(
        prisma.ticket.create({
          data: {
            orderId: order.id,
            ticketTierId: tierId,
            userId,
          },
        })
      );
    }
    const tickets = await Promise.all(ticketPromises);

    // Generate PDFs and send email
    const pdfBuffers = await Promise.all(
      tickets.map((ticket) =>
        generateTicketPdf({
          ticketId: ticket.id,
          userName: user.name,
          userEmail: user.email,
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
      user.email,
      user.name,
      tickets.map((ticket, idx) => ({
        ticketId: ticket.id,
        pdfBuffer: pdfBuffers[idx],
      })),
      {
        eventTitle: order.ticketTier.event.title,
        tierName: order.ticketTier.name,
        eventDate: order.ticketTier.event.startTime,
      }
    );

    res.status(201).json({
      order,
      tickets,
      message: `${quantity} bypass ticket(s) booked successfully for ${user.name}`,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id/role
export async function updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN', 'SCANNER'].includes(role)) {
      res.status(400).json({ error: 'Invalid role.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}
