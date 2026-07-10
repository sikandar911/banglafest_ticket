import { Response, NextFunction, Request } from 'express';
import Stripe from 'stripe';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authenticate';
import {
  sendTicketConfirmationEmail,
} from '../services/email.service';
import { generateTicketPdf } from '../services/pdf.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

// ─── Event Management ─────────────────────────────────────────────────────────

// POST /api/admin/events
export async function createEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, startTime, endTime, location, imageUrl, performers, specialAdditions } = req.body;

    if (!title || !String(title).trim()) {
      res.status(400).json({ error: 'Title is required.' });
      return;
    }
    if (!startTime || !endTime) {
      res.status(400).json({ error: 'Start time and end time are required.' });
      return;
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ error: 'Invalid date format.' });
      return;
    }
    if (end <= start) {
      res.status(400).json({ error: 'End time must be after start time.' });
      return;
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        imageUrl: imageUrl || null,
        createdBy: req.user!.id,
        performers:       performers?.length       ? JSON.stringify(performers)       : null,
        specialAdditions: specialAdditions?.length ? JSON.stringify(specialAdditions) : null,
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
    const { title, description, startTime, endTime, location, imageUrl, performers, specialAdditions } = req.body;

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
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(performers !== undefined && {
          performers: performers?.length ? JSON.stringify(performers) : null,
        }),
        ...(specialAdditions !== undefined && {
          specialAdditions: specialAdditions?.length ? JSON.stringify(specialAdditions) : null,
        }),
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

    // Get all tier IDs for this event
    const tiers = await prisma.ticketTier.findMany({ where: { eventId: id }, select: { id: true } });
    const tierIds = tiers.map((t) => t.id);

    if (tierIds.length > 0) {
      // Get order IDs linked to these tiers
      const orders = await prisma.order.findMany({ where: { tierId: { in: tierIds } }, select: { id: true } });
      const orderIds = orders.map((o) => o.id);

      if (orderIds.length > 0) {
        // Delete tickets and order items first (child records)
        await prisma.ticket.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      }
    }

    // Now delete the event (cascades to tiers via schema)
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
    const { name, description, price, totalCapacity, features, maxPerPerson, promoDiscountAmount } = req.body;

    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Tier name is required.' });
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0.01) {
      res.status(400).json({ error: 'Price must be at least £0.01.' });
      return;
    }
    const parsedCapacity = parseInt(totalCapacity);
    if (isNaN(parsedCapacity) || parsedCapacity < 1) {
      res.status(400).json({ error: 'Total capacity must be at least 1.' });
      return;
    }
    const parsedMax = parseInt(maxPerPerson) || 1;
    if (parsedMax < 1) {
      res.status(400).json({ error: 'Max per person must be at least 1.' });
      return;
    }

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
        promoDiscountAmount: promoDiscountAmount != null && promoDiscountAmount !== '' ? promoDiscountAmount : null,
      },
    });

    res.status(201).json({ 
      tier: {
        ...tier,
        price: Number(tier.price),
        promoDiscountAmount: tier.promoDiscountAmount ? Number(tier.promoDiscountAmount) : null,
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
    const { name, description, price, totalCapacity, features, maxPerPerson, promoDiscountAmount } = req.body;

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
    if (promoDiscountAmount !== undefined) {
      updateData.promoDiscountAmount = promoDiscountAmount !== null && promoDiscountAmount !== '' ? promoDiscountAmount : null;
    }

    const tier = await prisma.ticketTier.update({
      where: { id },
      data: updateData,
    });

    res.json({ 
      tier: {
        ...tier,
        price: Number(tier.price),
        promoDiscountAmount: tier.promoDiscountAmount ? Number(tier.promoDiscountAmount) : null,
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

    const salesExecResult = await prisma.order.aggregate({
      where: { status: 'PAID', salesExecutiveId: { not: null } },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const salesExecTicketCount = await prisma.ticket.count({
      where: {
        order: { salesExecutiveId: { not: null }, status: 'PAID' },
      },
    });

    // Get sales executive user-wise breakdown
    const salesExecutiveBreakdown = await prisma.order.groupBy({
      by: ['salesExecutiveId'],
      where: { status: 'PAID', salesExecutiveId: { not: null } },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    // Fetch sales executive user details
    const salesExecIds = salesExecutiveBreakdown.map(s => s.salesExecutiveId).filter(Boolean) as string[];
    const salesExecUsers = await prisma.user.findMany({
      where: { id: { in: salesExecIds } },
      select: { id: true, name: true, email: true },
    });

    // Combine and enrich breakdown data
    const enrichedSalesExecBreakdown = await Promise.all(
      salesExecutiveBreakdown.map(async (breakdown) => {
        const user = salesExecUsers.find(u => u.id === breakdown.salesExecutiveId);
        const ticketCount = await prisma.ticket.count({
          where: { order: { salesExecutiveId: breakdown.salesExecutiveId, status: 'PAID' } },
        });
        return {
          userId: breakdown.salesExecutiveId,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || '',
          revenue: Number(breakdown._sum.totalAmount ?? 0),
          orders: breakdown._count.id,
          tickets: ticketCount,
        };
      })
    );

    const totalRevenue = Number(result._sum.totalAmount ?? 0);
    const refundedAmount = Number(refundedResult._sum.totalAmount ?? 0);
    const salesExecRevenue = Number(salesExecResult._sum.totalAmount ?? 0);
    const onlineRevenue = totalRevenue - salesExecRevenue;

    // --- Ticket Breakdown calculations ---
    const allTiers = await prisma.ticketTier.findMany({
      select: { id: true, name: true },
    });

    const salesExecTierCounts = await prisma.ticket.groupBy({
      by: ['ticketTierId'],
      where: {
        order: { status: 'PAID', salesExecutiveId: { not: null } },
      },
      _count: { id: true },
    });

    const onlineTierCounts = await prisma.ticket.groupBy({
      by: ['ticketTierId'],
      where: {
        order: { status: 'PAID', salesExecutiveId: null },
      },
      _count: { id: true },
    });

    const salesExecTiersBreakdown = allTiers.map((tier) => {
      const match = salesExecTierCounts.find((c) => c.ticketTierId === tier.id);
      return {
        tierId: tier.id,
        tierName: tier.name,
        count: match?._count.id ?? 0,
      };
    });

    const onlineTiersBreakdown = allTiers.map((tier) => {
      const match = onlineTierCounts.find((c) => c.ticketTierId === tier.id);
      return {
        tierId: tier.id,
        tierName: tier.name,
        count: match?._count.id ?? 0,
      };
    });

    const totalSalesExecTickets = salesExecTiersBreakdown.reduce((sum, t) => sum + t.count, 0);
    const totalOnlineTickets = onlineTiersBreakdown.reduce((sum, t) => sum + t.count, 0);
    const totalTicketsSold = totalSalesExecTickets + totalOnlineTickets;

    // --- Promo Code Breakdown calculations ---
    const promoGrouped = await prisma.order.groupBy({
      by: ['promoCodeId'],
      where: { status: 'PAID', promoCodeId: { not: null } },
      _sum: { totalAmount: true, quantity: true },
      _count: { id: true },
    });

    const promoCodeIds = promoGrouped.map((pg) => pg.promoCodeId).filter(Boolean) as string[];
    const promoCodeDetails = await prisma.promoCode.findMany({
      where: { id: { in: promoCodeIds } },
      select: { id: true, code: true, influencerName: true },
    });

    const promoCodeBreakdown = promoGrouped.map((group) => {
      const details = promoCodeDetails.find((p) => p.id === group.promoCodeId);
      return {
        promoCodeId: group.promoCodeId,
        code: details?.code || 'Unknown',
        influencerName: details?.influencerName || 'Unknown',
        ticketsSold: group._sum.quantity ?? 0,
        revenueGenerated: Number(group._sum.totalAmount ?? 0),
        ordersCount: group._count.id,
      };
    });

    res.json({
      revenue: {
        totalRevenue,
        paidOrders: result._count.id,
        refundedAmount,
        refundedOrders: refundedResult._count.id,
        netRevenue: totalRevenue - refundedAmount,
        totalOrders: result._count.id + refundedResult._count.id,
        salesExecRevenue,
        salesExecOrders: salesExecResult._count.id,
        salesExecTickets: salesExecTicketCount,
        onlineRevenue,
      },
      salesExecutiveBreakdown: enrichedSalesExecBreakdown,
      recentOrders: recentOrders.map((o) => ({ ...o, totalAmount: Number(o.totalAmount) })),
      ticketBreakdown: {
        totalTickets: totalTicketsSold,
        salesExecTickets: {
          total: totalSalesExecTickets,
          tiers: salesExecTiersBreakdown,
        },
        onlineTickets: {
          total: totalOnlineTickets,
          tiers: onlineTiersBreakdown,
        },
      },
      promoCodeBreakdown,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/users
export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, role, password } = req.body;

    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Name is required.' });
      return;
    }
    if (!email || !String(email).trim()) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }
    if (!['SCANNER', 'SALES_EXECUTIVE'].includes(role)) {
      res.status(400).json({ error: 'Role must be SCANNER or SALES_EXECUTIVE.' });
      return;
    }
    if (!password || String(password).length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        isVerified: true, // Staff accounts are pre-verified
      },
      select: { id: true, name: true, email: true, role: true, isVerified: true, createdAt: true },
    });

    res.status(201).json({ user });
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

    // Issue Stripe refund only if a payment was actually captured
    let stripeRefunded = false;
    if (order.stripePaymentIntent) {
      try {
        const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntent);
        if (pi.status === 'succeeded') {
          await stripe.refunds.create({ payment_intent: order.stripePaymentIntent });
          stripeRefunded = true;
        }
        // If status is anything else (requires_payment_method, processing, etc.)
        // no real charge was captured — skip Stripe refund, just update DB
      } catch (stripeErr: any) {
        // Surface Stripe errors for genuinely captured payments
        if (stripeErr?.code !== 'resource_missing') {
          throw stripeErr;
        }
      }
    }

    // Cancel tickets, restore inventory, mark order REFUNDED
    await prisma.$transaction([
      prisma.order.update({ where: { id }, data: { status: 'REFUNDED' } }),
      prisma.ticket.updateMany({
        where: { orderId: id },
        data: { status: 'CANCELLED' },
      }),
      prisma.ticketTier.update({
        where: { id: order.ticketTier.id },
        data: { availableQty: { increment: order.quantity } },
      }),
    ]);

    res.json({
      message: stripeRefunded
        ? 'Order refunded via Stripe and tickets cancelled.'
        : 'Order marked as refunded and tickets cancelled.',
    });
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
        order: { include: { promoCode: true } },
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
      features: ticket.ticketTier.features ? JSON.parse(ticket.ticketTier.features as string) : undefined,
      performers: ticket.ticketTier.event.performers ? JSON.parse(ticket.ticketTier.event.performers as string) : undefined,
      specialAdditions: ticket.ticketTier.event.specialAdditions ? JSON.parse(ticket.ticketTier.event.specialAdditions as string) : undefined,
    });

    await sendTicketConfirmationEmail(
      ticket.user.email,
      ticket.user.name,
      [{ ticketId: ticket.id, pdfBuffer }],
      {
        orderId: ticket.order.id,
        eventTitle: ticket.ticketTier.event.title,
        tierName: ticket.ticketTier.name,
        eventDate: ticket.ticketTier.event.startTime,
        eventStartTime: ticket.ticketTier.event.startTime,
        eventVenue: ticket.ticketTier.event.location ?? 'TBD',
        quantity: 1,
        unitPrice: Number(ticket.ticketTier.price),
        totalAmount: Number(ticket.order.totalAmount),
        discountAmount: ticket.order.discountAmount ? Number(ticket.order.discountAmount) : undefined,
        promoCode: ticket.order.promoCode?.code,
      }
    );

    res.json({ message: 'Ticket resent successfully.' });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/orders/:id/resend-ticket — resend all tickets for an order
export async function resendOrderTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        tickets: true,
        user: { select: { name: true, email: true } },
        ticketTier: { include: { event: true } },
        promoCode: true,
      },
    });

    if (!order) { res.status(404).json({ error: 'Order not found.' }); return; }
    if (order.status !== 'PAID') { res.status(400).json({ error: 'Can only resend tickets for PAID orders.' }); return; }

    const activeTickets = order.tickets.filter((t) => t.status !== 'CANCELLED');
    if (activeTickets.length === 0) {
      res.status(400).json({ error: 'No active tickets found for this order.' });
      return;
    }

    const pdfBuffers = await Promise.all(
      activeTickets.map((ticket) =>
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
          features: order.ticketTier.features ? JSON.parse(order.ticketTier.features as string) : undefined,
          performers: order.ticketTier.event.performers ? JSON.parse(order.ticketTier.event.performers as string) : undefined,
          specialAdditions: order.ticketTier.event.specialAdditions ? JSON.parse(order.ticketTier.event.specialAdditions as string) : undefined,
        })
      )
    );

    await sendTicketConfirmationEmail(
      order.user.email,
      order.user.name,
      activeTickets.map((t, i) => ({ ticketId: t.id, pdfBuffer: pdfBuffers[i] })),
      {
        orderId: order.id,
        eventTitle: order.ticketTier.event.title,
        tierName: order.ticketTier.name,
        eventDate: order.ticketTier.event.startTime,
        eventStartTime: order.ticketTier.event.startTime,
        eventVenue: order.ticketTier.event.location ?? 'TBD',
        quantity: activeTickets.length,
        unitPrice: Number(order.ticketTier.price),
        totalAmount: Number(order.totalAmount),
        discountAmount: order.discountAmount ? Number(order.discountAmount) : undefined,
        promoCode: order.promoCode?.code,
      }
    );

    res.json({ message: `${activeTickets.length} ticket(s) resent successfully.` });
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
        promoCode: true,
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
          features: tier.features ? JSON.parse(tier.features as string) : undefined,
          performers: tier.event.performers ? JSON.parse(tier.event.performers as string) : undefined,
          specialAdditions: tier.event.specialAdditions ? JSON.parse(tier.event.specialAdditions as string) : undefined,
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
        orderId: order.id,
        eventTitle: order.ticketTier.event.title,
        tierName: order.ticketTier.name,
        eventDate: order.ticketTier.event.startTime,
        eventStartTime: order.ticketTier.event.startTime,
        eventVenue: order.ticketTier.event.location ?? 'TBD',
        quantity: quantity,
        unitPrice: Number(order.ticketTier.price),
        totalAmount: Number(order.totalAmount),
        discountAmount: order.discountAmount ? Number(order.discountAmount) : undefined,
        promoCode: order.promoCode?.code,
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

    if (!['USER', 'ADMIN', 'SCANNER', 'SALES_EXECUTIVE'].includes(role)) {
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

// ─── Promo Codes ──────────────────────────────────────────────────────────────

// GET /api/admin/promo-codes
export async function listPromoCodes(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promoCodes = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        events: {
          include: {
            event: { select: { id: true, title: true } },
          },
        },
        groupPromos: {
          include: {
            ticketTier: { select: { id: true, name: true, price: true } },
          },
        },
        _count: { select: { orders: true } },
      },
    });

    res.json({ promoCodes });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/promo-codes
export async function createPromoCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, influencerName, socialMedia, discountAmount, eventIds, startDate, endDate, isGroupPromo, minTickets, groupDiscounts } = req.body;

    if (!code || !String(code).trim()) {
      res.status(400).json({ error: 'Promo code is required.' });
      return;
    }
    if (!influencerName || !String(influencerName).trim()) {
      res.status(400).json({ error: 'Influencer name is required.' });
      return;
    }
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      res.status(400).json({ error: 'At least one event must be selected.' });
      return;
    }

    const parsedStart = startDate ? new Date(startDate) : null;
    const parsedEnd   = endDate   ? new Date(endDate)   : null;

    if (parsedStart && isNaN(parsedStart.getTime())) {
      res.status(400).json({ error: 'Invalid start date.' });
      return;
    }
    if (parsedEnd && isNaN(parsedEnd.getTime())) {
      res.status(400).json({ error: 'Invalid end date.' });
      return;
    }
    if (parsedStart && parsedEnd && parsedEnd <= parsedStart) {
      res.status(400).json({ error: 'End date must be after start date.' });
      return;
    }

    const normalizedCode = String(code).trim().toUpperCase();

    const existing = await prisma.promoCode.findUnique({ where: { code: normalizedCode } });
    if (existing) {
      res.status(409).json({ error: 'A promo code with this code already exists.' });
      return;
    }

    const parsedDiscount = discountAmount != null && discountAmount !== '' ? Number(discountAmount) : null;
    if (parsedDiscount !== null && (isNaN(parsedDiscount) || parsedDiscount < 0)) {
      res.status(400).json({ error: 'Discount amount must be a positive number.' });
      return;
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        code: normalizedCode,
        influencerName: String(influencerName).trim(),
        socialMedia: socialMedia ? String(socialMedia).trim() : null,
        discountAmount: isGroupPromo ? null : parsedDiscount,
        startDate: parsedStart,
        endDate: parsedEnd,
        events: {
          create: (eventIds as string[]).map((eventId) => ({ eventId })),
        },
      },
      include: {
        events: {
          include: {
            event: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (isGroupPromo && Array.isArray(groupDiscounts)) {
      await prisma.groupPromo.createMany({
        data: groupDiscounts.map((gd) => ({
          promoCodeId: promoCode.id,
          ticketTierId: gd.tierId,
          discountAmount: Number(gd.discountAmount),
          minTickets: minTickets ? parseInt(minTickets) : 10,
        })),
      });
    }

    // Re-fetch to return complete information including Group Promo tiers
    const enrichedPromoCode = await prisma.promoCode.findUnique({
      where: { id: promoCode.id },
      include: {
        events: {
          include: {
            event: { select: { id: true, title: true } },
          },
        },
        groupPromos: {
          include: {
            ticketTier: { select: { id: true, name: true, price: true } },
          },
        },
        _count: { select: { orders: true } },
      },
    });

    // Warn if effective discount >= any tier price (tickets would be free/over-discounted)
    const warnings: string[] = [];

    if (isGroupPromo && Array.isArray(groupDiscounts)) {
      const tiers = await prisma.ticketTier.findMany({
        where: { id: { in: groupDiscounts.map((gd) => gd.tierId) } },
        select: { id: true, name: true, price: true, event: { select: { title: true } } },
      });
      for (const gd of groupDiscounts) {
        const tier = tiers.find((t) => t.id === gd.tierId);
        if (tier && Number(gd.discountAmount) >= Number(tier.price)) {
          warnings.push(
            `"${tier.event.title}" → Tier "${tier.name}": group promo discount £${Number(gd.discountAmount).toFixed(2)} ≥ tier price £${Number(tier.price).toFixed(2)} — tickets will be issued free of charge.`
          );
        }
      }
    } else if (parsedDiscount !== null && parsedDiscount > 0) {
      const tiers = await prisma.ticketTier.findMany({
        where: { eventId: { in: eventIds as string[] } },
        select: { name: true, price: true, event: { select: { title: true } } },
      });
      for (const tier of tiers) {
        if (parsedDiscount >= Number(tier.price)) {
          warnings.push(
            `"${tier.event.title}" → Tier "${tier.name}": promo discount £${parsedDiscount.toFixed(2)} ≥ tier price £${Number(tier.price).toFixed(2)} — tickets will be issued free of charge.`
          );
        }
      }
    } else {
      const tiers = await prisma.ticketTier.findMany({
        where: { eventId: { in: eventIds as string[] }, promoDiscountAmount: { not: null } },
        select: { name: true, price: true, promoDiscountAmount: true, event: { select: { title: true } } },
      });
      for (const tier of tiers) {
        const discount = Number(tier.promoDiscountAmount);
        if (discount >= Number(tier.price)) {
          warnings.push(
            `"${tier.event.title}" → Tier "${tier.name}": promo discount £${discount.toFixed(2)} ≥ tier price £${Number(tier.price).toFixed(2)} — tickets will be issued free of charge.`
          );
        }
      }
    }

    res.status(201).json({ promoCode: enrichedPromoCode, ...(warnings.length > 0 && { warnings }) });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/promo-codes/:id
export async function updatePromoCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { influencerName, socialMedia, discountAmount, eventIds, startDate, endDate, isGroupPromo, minTickets, groupDiscounts } = req.body;

    const existing = await prisma.promoCode.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Promo code not found.' });
      return;
    }

    const parsedStart    = startDate    ? new Date(startDate)    : null;
    const parsedEnd      = endDate      ? new Date(endDate)      : null;
    const parsedDiscount = discountAmount != null && discountAmount !== '' ? Number(discountAmount) : null;

    if (parsedStart && isNaN(parsedStart.getTime())) {
      res.status(400).json({ error: 'Invalid start date.' });
      return;
    }
    if (parsedEnd && isNaN(parsedEnd.getTime())) {
      res.status(400).json({ error: 'Invalid end date.' });
      return;
    }
    if (parsedStart && parsedEnd && parsedEnd <= parsedStart) {
      res.status(400).json({ error: 'End date must be after start date.' });
      return;
    }
    if (parsedDiscount !== null && (isNaN(parsedDiscount) || parsedDiscount < 0)) {
      res.status(400).json({ error: 'Discount amount must be a positive number.' });
      return;
    }

    // Update event associations if provided
    if (Array.isArray(eventIds)) {
      if (eventIds.length === 0) {
        res.status(400).json({ error: 'At least one event must be selected.' });
        return;
      }
      await prisma.promoCodeEvent.deleteMany({ where: { promoCodeId: id } });
      await prisma.promoCodeEvent.createMany({
        data: (eventIds as string[]).map((eventId) => ({ promoCodeId: id, eventId })),
      });
    }

    // Update GroupPromo records
    if (isGroupPromo !== undefined) {
      await prisma.groupPromo.deleteMany({ where: { promoCodeId: id } });
      if (isGroupPromo && Array.isArray(groupDiscounts)) {
        await prisma.groupPromo.createMany({
          data: groupDiscounts.map((gd) => ({
            promoCodeId: id,
            ticketTierId: gd.tierId,
            discountAmount: Number(gd.discountAmount),
            minTickets: minTickets ? parseInt(minTickets) : 10,
          })),
        });
      }
    }

    const updated = await prisma.promoCode.update({
      where: { id },
      data: {
        ...(influencerName !== undefined && { influencerName: String(influencerName).trim() }),
        ...(socialMedia !== undefined && { socialMedia: socialMedia ? String(socialMedia).trim() : null }),
        discountAmount: isGroupPromo ? null : (discountAmount !== undefined ? parsedDiscount : undefined),
        startDate: parsedStart,
        endDate: parsedEnd,
      },
    });

    // Re-fetch to return complete information including Group Promo tiers
    const enrichedPromoCode = await prisma.promoCode.findUnique({
      where: { id: updated.id },
      include: {
        events: { include: { event: { select: { id: true, title: true } } } },
        groupPromos: {
          include: {
            ticketTier: { select: { id: true, name: true, price: true } },
          },
        },
        _count: { select: { orders: true } },
      },
    });

    // Warn if discount >= tier price
    const warnings: string[] = [];
    if (isGroupPromo && Array.isArray(groupDiscounts)) {
      const tiers = await prisma.ticketTier.findMany({
        where: { id: { in: groupDiscounts.map((gd) => gd.tierId) } },
        select: { id: true, name: true, price: true, event: { select: { title: true } } },
      });
      for (const gd of groupDiscounts) {
        const tier = tiers.find((t) => t.id === gd.tierId);
        if (tier && Number(gd.discountAmount) >= Number(tier.price)) {
          warnings.push(
            `"${tier.event.title}" → Tier "${tier.name}": group promo discount £${Number(gd.discountAmount).toFixed(2)} ≥ tier price £${Number(tier.price).toFixed(2)} — tickets will be issued free of charge.`
          );
        }
      }
    } else if (parsedDiscount !== null && parsedDiscount > 0) {
      const ids = Array.isArray(eventIds) ? (eventIds as string[]) : enrichedPromoCode!.events.map((e) => e.eventId);
      const tiers = await prisma.ticketTier.findMany({
        where: { eventId: { in: ids } },
        select: { name: true, price: true, event: { select: { title: true } } },
      });
      for (const tier of tiers) {
        if (parsedDiscount >= Number(tier.price)) {
          warnings.push(
            `"${tier.event.title}" → Tier "${tier.name}": promo discount £${parsedDiscount.toFixed(2)} ≥ tier price £${Number(tier.price).toFixed(2)} — tickets will be issued free of charge.`
          );
        }
      }
    }

    res.json({ promoCode: enrichedPromoCode, ...(warnings.length > 0 && { warnings }) });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/promo-codes/:id/toggle
export async function togglePromoCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await prisma.promoCode.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Promo code not found.' });
      return;
    }

    const updated = await prisma.promoCode.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    res.json({ promoCode: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/promo-codes/:id
export async function deletePromoCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await prisma.promoCode.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Promo code not found.' });
      return;
    }

    await prisma.promoCode.delete({ where: { id } });
    res.json({ message: 'Promo code deleted.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/promo-codes/:id/orders
export async function getPromoCodeOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const promoCode = await prisma.promoCode.findUnique({
      where: { id },
      select: { id: true, code: true, influencerName: true },
    });

    if (!promoCode) {
      res.status(404).json({ error: 'Promo code not found.' });
      return;
    }

    const orders = await prisma.order.findMany({
      where: { promoCodeId: id, status: 'PAID' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        totalAmount: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        tickets: {
          select: {
            id: true,
            attendeeName: true,
            ticketTier: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    res.json({
      promoCode,
      orders: orders.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
      })),
    });
  } catch (err) {
    next(err);
  }
}
