import { Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authenticate';
import { generateTicketPdf } from '../services/pdf.service';
import { sendTicketConfirmationEmail } from '../services/email.service';

// GET /api/users/me/tickets
export async function getMyTickets(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { userId: req.user!.id, status: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'desc' },
      include: {
        ticketTier: {
          include: { event: { select: { id: true, title: true, startTime: true, endTime: true, location: true } } },
        },
        order: { select: { status: true, totalAmount: true, createdAt: true } },
      },
    });

    // Generate QR code images for each valid ticket
    const ticketsWithQr = await Promise.all(
      tickets.map(async (ticket) => {
        const qrDataUrl = await QRCode.toDataURL(ticket.id, { errorCorrectionLevel: 'H', width: 300 });
        return {
          id: ticket.id,
          status: ticket.status,
          scannedAt: ticket.scannedAt,
          createdAt: ticket.createdAt,
          qrCode: qrDataUrl,
          ticketTier: {
            name: ticket.ticketTier.name,
            price: Number(ticket.ticketTier.price),
          },
          event: ticket.ticketTier.event,
          order: {
            status: ticket.order.status,
            totalAmount: Number(ticket.order.totalAmount),
            createdAt: ticket.order.createdAt,
          },
        };
      })
    );

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
        ticketTier: { select: { name: true, price: true } },
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
export async function downloadTicketPdf(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

    if (ticket.userId !== req.user!.id) {
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
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.id.slice(0, 8)}.pdf"`);
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
