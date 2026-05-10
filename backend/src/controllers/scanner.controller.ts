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
          scannedAt: ticket.scannedAt,
        },
      });
      return;
    }

    // Mark as CHECKED_IN
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'CHECKED_IN', scannedAt: new Date() },
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
        eventDate: ticket.ticketTier.event.startTime,
        location: ticket.ticketTier.event.location,
        checkedInAt: updated.scannedAt,
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

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q.trim(), mode: 'insensitive' } },
          { name: { contains: q.trim(), mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        tickets: {
          where: { status: { not: 'CANCELLED' } },
          include: {
            ticketTier: {
              include: { event: { select: { title: true, startTime: true } } },
            },
          },
        },
      },
    });

    const results = users.flatMap((user) =>
      user.tickets.map((ticket) => ({
        ticketId: ticket.id,
        holder: user.name,
        email: user.email,
        tier: ticket.ticketTier.name,
        event: ticket.ticketTier.event.title,
        eventDate: ticket.ticketTier.event.startTime,
        status: ticket.status,
        scannedAt: ticket.scannedAt,
      }))
    );

    res.json({ results, count: results.length });
  } catch (err) {
    next(err);
  }
}
