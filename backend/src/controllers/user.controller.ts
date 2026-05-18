import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authenticate';
import { generateTicketPdf } from '../services/pdf.service';

// GET /api/users/me/tickets
export async function getMyTickets(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { userId: req.user!.id, status: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'desc' },
      include: {
        ticketTier: {
          include: { event: true },
        },
        order: { select: { id: true, status: true, totalAmount: true, isBypassed: true, createdAt: true } },
      },
    });

    const ticketsWithQr = tickets.map((ticket) => ({
      id: ticket.id,
      status: ticket.status,
      scannedAt: ticket.scannedAt,
      createdAt: ticket.createdAt,
      // QR code from external API — no package
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ticket.id)}&ecc=H&margin=5`,
      event: {
        id: ticket.ticketTier.event.id,
        title: ticket.ticketTier.event.title,
        startTime: ticket.ticketTier.event.startTime,
        endTime: ticket.ticketTier.event.endTime,
        location: ticket.ticketTier.event.location,
        imageUrl: ticket.ticketTier.event.imageUrl,
      },
      tier: {
        name: ticket.ticketTier.name,
        price: Number(ticket.ticketTier.price),
        description: ticket.ticketTier.description,
        features: ticket.ticketTier.features ? JSON.parse(ticket.ticketTier.features) : [],
      },
      order: {
        id: ticket.order.id,
        status: ticket.order.status,
        totalAmount: Number(ticket.order.totalAmount),
        isBypassed: ticket.order.isBypassed,
        createdAt: ticket.order.createdAt,
      },
    }));

    res.json({ tickets: ticketsWithQr });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/me/orders
export async function getMyOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        ticketTier: {
          include: { event: { select: { id: true, title: true, startTime: true } } },
        },
        tickets: { select: { id: true, status: true } },
      },
    });

    res.json({
      orders: orders.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        ticketTier: { ...o.ticketTier, price: Number(o.ticketTier.price) },
      })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/me/tickets/:ticketId/pdf
// Supports auth via Authorization header OR ?token= query param (for direct browser downloads)
export async function downloadTicketPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Resolve user from either Authorization header or ?token= query param
    let userId: string | undefined = (req as AuthRequest).user?.id;
    if (!userId && req.query.token) {
      try {
        const decoded = jwt.verify(
          req.query.token as string,
          process.env.JWT_ACCESS_SECRET!
        ) as { id: string };
        userId = decoded.id;
      } catch {
        res.status(401).json({ error: 'Invalid or expired token.' });
        return;
      }
    }
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

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

    if (ticket.userId !== userId) {
      res.status(403).json({ error: 'Access denied.' });
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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="banglafest-ticket-${ticket.id.slice(0, 8)}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-store');
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

// GET /api/users/me (profile)
export async function getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
