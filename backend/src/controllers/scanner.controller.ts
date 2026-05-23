import { Response, NextFunction, Request } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authenticate';

// POST /api/scanner/scan
export async function scanTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ticketId } = req.body;

    if (!ticketId) {
      res.status(400).json({ error: 'ticketId is required.' });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { isBypassed: true } },
        ticketTier: {
          include: { event: { select: { title: true, startTime: true, endTime: true, location: true } } },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({
        valid: false,
        reason: 'INVALID_TICKET',
        message: 'Ticket not found. This QR code is invalid.',
      });
      return;
    }

    if (ticket.status === 'CANCELLED') {
      res.status(400).json({
        valid: false,
        reason: 'CANCELLED',
        message: 'This ticket has been cancelled.',
        ticket: {
          id: ticket.id,
          holder: ticket.user.name,
          tier: ticket.ticketTier.name,
          event: ticket.ticketTier.event.title,
          isBypassed: ticket.order?.isBypassed,
        },
      });
      return;
    }

    if (ticket.status === 'CHECKED_IN') {
      res.status(409).json({
        valid: false,
        reason: 'ALREADY_USED',
        message: '⚠️ ALREADY USED — This ticket was already scanned.',
        ticket: {
          id: ticket.id,
          holder: ticket.user.name,
          tier: ticket.ticketTier.name,
          event: ticket.ticketTier.event.title,
          isBypassed: ticket.order?.isBypassed,
          scannedAt: ticket.scannedAt,
          inStatus: ticket.inStatus,
        },
      });
      return;
    }

    // Mark as CHECKED_IN and set inStatus to true
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'CHECKED_IN', scannedAt: new Date(), inStatus: true },
    });

    res.json({
      valid: true,
      reason: 'VALID',
      message: '✅ VALID — Entry granted.',
      ticket: {
        id: updated.id,
        holder: ticket.user.name,
        email: ticket.user.email,
        tier: ticket.ticketTier.name,
        event: ticket.ticketTier.event.title,
        isBypassed: ticket.order?.isBypassed,
        eventDate: ticket.ticketTier.event.startTime,
        location: ticket.ticketTier.event.location,
        checkedInAt: updated.scannedAt,
        inStatus: updated.inStatus,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/scanner/search?q=
export async function searchTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q } = req.query as { q?: string };

    if (!q || q.trim().length < 2) {
      res.status(400).json({ error: 'Search query must be at least 2 characters.' });
      return;
    }

    // Query orders with PAID status or bypassed, then get tickets from those orders
    const orders = await prisma.order.findMany({
      where: {
        // Only PAID orders or bypassed orders
        OR: [
          { status: 'PAID' },
          { isBypassed: true },
        ],
        // AND user must match search query
        user: {
          OR: [
            { email: { contains: q.trim(), mode: 'insensitive' } },
            { name: { contains: q.trim(), mode: 'insensitive' } },
          ],
        },
      },
      include: {
        user: { select: { name: true, email: true } },
        tickets: {
          where: { status: { not: 'CANCELLED' } },
        },
        ticketTier: {
          include: { event: { select: { title: true, startTime: true } } },
        },
      },
    });

    // Flatten results: each ticket becomes a result object
    const results = orders.flatMap((order) =>
      order.tickets.map((ticket) => ({
        ticketId: ticket.id,
        holder: order.user.name,
        email: order.user.email,
        tier: order.ticketTier.name,
        event: order.ticketTier.event.title,
        eventDate: order.ticketTier.event.startTime,
        isBypassed: order.isBypassed,
        status: ticket.status,
        scannedAt: ticket.scannedAt,
      }))
    );

    res.json({ results, count: results.length });
  } catch (err) {
    next(err);
  }
}

// POST /api/scanner/toggle-in-status
export async function toggleInStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ticketId } = req.body;

    if (!ticketId) {
      res.status(400).json({ error: 'ticketId is required.' });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }

    if (ticket.status !== 'CHECKED_IN') {
      res.status(400).json({ error: 'Only checked-in tickets can be toggled.' });
      return;
    }

    // Toggle inStatus
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { inStatus: !ticket.inStatus },
    });

    res.json({
      success: true,
      inStatus: updated.inStatus,
      message: updated.inStatus ? 'Ticket checked in' : 'Ticket checked out',
    });
  } catch (err) {
    next(err);
  }
}
