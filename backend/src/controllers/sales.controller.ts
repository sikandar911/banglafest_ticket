import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authenticate';
import { sendAttendeeOtpEmail, sendTicketConfirmationEmail } from '../services/email.service';
import { generateTicketPdf, generateTicketsPdf, type TicketPdfData } from '../services/pdf.service';

const OTP_EXPIRES_MINUTES = parseInt(process.env.OTP_EXPIRES_IN_MINUTES || '15', 10);

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── POST /api/sales/initiate ────────────────────────────────────────────────
// Sales exec submits attendee name + email; system sends OTP to attendee
export async function initiateSale(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { attendeeName, attendeeEmail } = req.body;

    if (!attendeeName || !String(attendeeName).trim()) {
      res.status(400).json({ error: 'Attendee name is required.' });
      return;
    }
    if (!attendeeEmail || !String(attendeeEmail).trim()) {
      res.status(400).json({ error: 'Attendee email is required.' });
      return;
    }

    const email = String(attendeeEmail).trim().toLowerCase();
    const name = String(attendeeName).trim();

    // Find or create the attendee user record
    let attendee = await prisma.user.findUnique({ where: { email } });
    if (!attendee) {
      // Create a minimal unverified user; they'll be verified after OTP
      attendee = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: '', // No password — attendee account is managed by sales flow
          isVerified: false,
          role: 'USER',
        },
      });
    }

    // Generate and store OTP
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    await prisma.user.update({
      where: { id: attendee.id },
      data: { otpCode: otp, otpExpiresAt },
    });

    await sendAttendeeOtpEmail(email, attendee.name, otp);

    res.json({
      message: `Verification code sent to ${email}.`,
      attendeeId: attendee.id,
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/sales/verify-otp ──────────────────────────────────────────────
// Verify attendee OTP; returns a short-lived sale session token
export async function verifySaleOtp(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { attendeeId, otp } = req.body;
    const salesExecId = req.user!.id;

    if (!attendeeId || !otp) {
      res.status(400).json({ error: 'attendeeId and otp are required.' });
      return;
    }

    const attendee = await prisma.user.findUnique({ where: { id: attendeeId } });
    if (!attendee) {
      res.status(404).json({ error: 'Attendee not found.' });
      return;
    }

    if (!attendee.otpCode || attendee.otpCode !== String(otp).trim()) {
      res.status(400).json({ error: 'Invalid verification code.' });
      return;
    }

    if (!attendee.otpExpiresAt || attendee.otpExpiresAt < new Date()) {
      res.status(400).json({ error: 'Verification code has expired.' });
      return;
    }

    // Mark attendee as verified and clear OTP
    await prisma.user.update({
      where: { id: attendeeId },
      data: { isVerified: true, otpCode: null, otpExpiresAt: null },
    });

    // Issue a short-lived sale session JWT
    const saleToken = jwt.sign(
      { attendeeId, salesExecId, type: 'sale_session' },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '30m' }
    );

    res.json({
      message: 'OTP verified.',
      saleToken,
      attendee: { id: attendee.id, name: attendee.name, email: attendee.email },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/sales/complete ─────────────────────────────────────────────────
// Complete the sale: creates order + tickets, sends confirmation email
export async function completeSale(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { saleToken, tierId, quantity, paymentMethod } = req.body;
    const salesExecId = req.user!.id;

    if (!saleToken) {
      res.status(400).json({ error: 'saleToken is required.' });
      return;
    }
    if (!tierId) {
      res.status(400).json({ error: 'tierId is required.' });
      return;
    }
    if (!['CASH', 'CARD_MACHINE'].includes(paymentMethod)) {
      res.status(400).json({ error: 'paymentMethod must be CASH or CARD_MACHINE.' });
      return;
    }

    const qty = parseInt(quantity) || 1;
    if (qty < 1) {
      res.status(400).json({ error: 'Quantity must be at least 1.' });
      return;
    }

    // Verify the sale session token
    let decoded: { attendeeId: string; salesExecId: string; type: string };
    try {
      decoded = jwt.verify(saleToken, process.env.JWT_ACCESS_SECRET!) as typeof decoded;
    } catch {
      res.status(400).json({ error: 'Sale session has expired or is invalid. Please restart the sale.' });
      return;
    }

    if (decoded.type !== 'sale_session' || decoded.salesExecId !== salesExecId) {
      res.status(403).json({ error: 'Invalid sale session.' });
      return;
    }

    const { attendeeId } = decoded;

    const attendee = await prisma.user.findUnique({ where: { id: attendeeId } });
    if (!attendee) {
      res.status(404).json({ error: 'Attendee not found.' });
      return;
    }

    const tier = await prisma.ticketTier.findUnique({
      where: { id: tierId },
      include: { event: true },
    });
    if (!tier) {
      res.status(404).json({ error: 'Ticket tier not found.' });
      return;
    }

    if (tier.availableQty < qty) {
      res.status(400).json({ error: `Only ${tier.availableQty} tickets remaining.` });
      return;
    }

    const totalAmount = Number(tier.price) * qty;

    // Create order
    const order = await prisma.order.create({
      data: {
        userId: attendeeId,
        tierId,
        quantity: qty,
        totalAmount,
        status: 'PAID',
        isBypassed: true,
        salesExecutiveId: salesExecId,
        paymentMethod: paymentMethod as 'CASH' | 'CARD_MACHINE',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Decrement availability
    await prisma.ticketTier.update({
      where: { id: tierId },
      data: { availableQty: { decrement: qty } },
    });

    // Create tickets
    const ticketData = Array.from({ length: qty }).map(() => ({
      orderId: order.id,
      ticketTierId: tierId,
      userId: attendeeId,
    }));
    await prisma.ticket.createMany({ data: ticketData });

    const tickets = await prisma.ticket.findMany({ where: { orderId: order.id } });

    // Generate PDFs and send email (best-effort)
    const pdfBuffers = await Promise.all(
      tickets.map((ticket) =>
        generateTicketPdf({
          ticketId: ticket.id,
          userName: attendee.name,
          userEmail: attendee.email,
          eventTitle: tier.event.title,
          tierName: tier.name,
          eventDate: tier.event.startTime,
          location: tier.event.location ?? '',
          orderId: order.id,
          createdAt: ticket.createdAt,
          features: tier.features ? JSON.parse(tier.features as string) : undefined,
          performers: tier.event.performers ? JSON.parse(tier.event.performers as string) : undefined,
          specialAdditions: tier.event.specialAdditions ? JSON.parse(tier.event.specialAdditions as string) : undefined,
        })
      )
    );

    sendTicketConfirmationEmail(
      attendee.email,
      attendee.name,
      tickets.map((t, i) => ({ ticketId: t.id, pdfBuffer: pdfBuffers[i] })),
      { eventTitle: tier.event.title, tierName: tier.name, eventDate: tier.event.startTime }
    ).catch((err) => console.error('[completeSale] Failed to send ticket email:', err));

    res.status(201).json({
      message: `${qty} ticket(s) sold successfully.`,
      order: { ...order, totalAmount: Number(order.totalAmount) },
      tickets: tickets.map((t) => ({
        id: t.id,
        orderId: t.orderId,
        status: t.status,
        createdAt: t.createdAt,
      })),
      attendee: { id: attendee.id, name: attendee.name, email: attendee.email },
      event: { title: tier.event.title, location: tier.event.location, startTime: tier.event.startTime },
      tier: { name: tier.name, price: Number(tier.price) },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/sales/customers ─────────────────────────────────────────────────
// Returns all customers (attendees) whose tickets were sold by this sales exec
export async function getSalesCustomers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const salesExecId = req.user!.id;

    const orders = await prisma.order.findMany({
      where: { salesExecutiveId: salesExecId, status: 'PAID' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        ticketTier: {
          include: { event: { select: { id: true, title: true, startTime: true, location: true } } },
        },
        tickets: {
          select: { id: true, status: true, scannedAt: true, createdAt: true },
        },
      },
    });

    // Group by attendee email
    const customerMap = new Map<string, {
      attendeeId: string;
      attendeeName: string;
      attendeeEmail: string;
      orders: typeof orders;
    }>();

    for (const order of orders) {
      const key = order.user.email;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          attendeeId: order.user.id,
          attendeeName: order.user.name,
          attendeeEmail: order.user.email,
          orders: [],
        });
      }
      customerMap.get(key)!.orders.push(order);
    }

    const customers = Array.from(customerMap.values()).map((c) => ({
      attendeeId: c.attendeeId,
      attendeeName: c.attendeeName,
      attendeeEmail: c.attendeeEmail,
      totalTickets: c.orders.reduce((sum, o) => sum + o.tickets.length, 0),
      totalSpent: c.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
      orders: c.orders.map((o) => ({
        id: o.id,
        quantity: o.quantity,
        totalAmount: Number(o.totalAmount),
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt,
        event: o.ticketTier.event,
        tier: { id: o.ticketTier.id, name: o.ticketTier.name, price: Number(o.ticketTier.price) },
        tickets: o.tickets,
      })),
    }));

    res.json({ customers });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/sales/events ────────────────────────────────────────────────────
// Returns available events with tiers for the sales exec to pick from
export async function getSalesEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const events = await prisma.event.findMany({
      orderBy: { startTime: 'asc' },
      include: {
        ticketTiers: {
          where: { availableQty: { gt: 0 } },
          select: {
            id: true,
            name: true,
            price: true,
            availableQty: true,
            maxPerPerson: true,
            description: true,
            features: true,
          },
        },
      },
    });

    res.json({
      events: events
        .filter((e) => e.ticketTiers.length > 0)
        .map((e) => ({
          ...e,
          ticketTiers: e.ticketTiers.map((t) => ({
            ...t,
            price: Number(t.price),
            features: t.features ? JSON.parse(t.features as string) : [],
          })),
        })),
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/sales/customers/:attendeeId/print-tickets ─────────────────────
// Sales exec downloads all tickets for a customer as a single PDF
export async function printCustomerTickets(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const salesExecId = req.user!.id;
    const { attendeeId } = req.params;

    // Find all PAID orders for this attendee by this sales exec
    const orders = await prisma.order.findMany({
      where: {
        userId: attendeeId,
        salesExecutiveId: salesExecId,
        status: 'PAID',
      },
      include: {
        tickets: {
          where: { status: { not: 'CANCELLED' } },
        },
        ticketTier: {
          include: {
            event: true,
          },
        },
        user: true, // Include the attendee user to get their name
      },
    });

    if (orders.length === 0) {
      res.status(404).json({ error: 'No tickets found for this customer.' });
      return;
    }

    // Flatten all tickets and build TicketPdfData array
    const ticketDataList: TicketPdfData[] = [];
    for (const order of orders) {
      const attendee = order.user;
      for (const ticket of order.tickets) {
        ticketDataList.push({
          ticketId: ticket.id,
          userName: attendee.name,
          userEmail: attendee.email,
          eventTitle: order.ticketTier.event.title,
          location: order.ticketTier.event.location || '',
          eventDate: order.ticketTier.event.startTime,
          tierName: order.ticketTier.name,
          orderId: order.id,
          createdAt: order.createdAt,
          performers: order.ticketTier.event.performers ? JSON.parse(order.ticketTier.event.performers as string) : [],
          specialAdditions: order.ticketTier.event.specialAdditions ? JSON.parse(order.ticketTier.event.specialAdditions as string) : [],
        });
      }
    }

    if (ticketDataList.length === 0) {
      res.status(400).json({ error: 'No valid tickets to print.' });
      return;
    }

    // Generate combined PDF
    const pdfBuffer = await generateTicketsPdf(ticketDataList);

    // Send as downloadable file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="banglafest-customer-tickets.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}
