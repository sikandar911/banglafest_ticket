import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authenticate';
import { generateTicketPdf, generateTicketPng, generateTicketsPdf } from '../services/pdf.service';

function safeParseJsonArray<T>(value: unknown): T[] | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : undefined;
  } catch {
    return undefined;
  }
}

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
      attendeeName: ticket.attendeeName ?? null,
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
        features: safeParseJsonArray<string>(ticket.ticketTier.features) ?? [],
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

function resolveToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const queryToken = req.query.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }

  return undefined;
}

async function resolveTicketOwnerId(req: Request): Promise<string | null> {
  const token = resolveToken(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, isVerified: true },
    });

    if (!user || !user.isVerified) return null;
    return user.id;
  } catch {
    return null;
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
    const userId = await resolveTicketOwnerId(req);
    if (!userId) {
      res.status(401).json({ error: 'No token provided.' });
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
      attendeeName: ticket.attendeeName ?? undefined,
      userName: ticket.user.name,
      userEmail: ticket.user.email,
      eventTitle: ticket.ticketTier.event.title,
      tierName: ticket.ticketTier.name,
      eventDate: ticket.ticketTier.event.startTime,
      location: ticket.ticketTier.event.location ?? '',
      orderId: ticket.order.id,
      createdAt: ticket.createdAt,
      features: safeParseJsonArray<string>(ticket.ticketTier.features),
      performers: safeParseJsonArray<{ name: string; ticketDisplayName: string }>(ticket.ticketTier.event.performers),
      specialAdditions: safeParseJsonArray<{ name: string; description: string; ticketDisplayText: string }>(ticket.ticketTier.event.specialAdditions),
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

// GET /api/users/me/tickets/:ticketId/png
// Downloads a single ticket QR image as PNG.
export async function downloadTicketPng(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await resolveTicketOwnerId(req);
    if (!userId) {
      res.status(401).json({ error: 'No token provided.' });
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

    const pngBuffer = await generateTicketPng({
      ticketId: ticket.id,
      attendeeName: ticket.attendeeName ?? undefined,
      userName: ticket.user.name,
      userEmail: ticket.user.email,
      eventTitle: ticket.ticketTier.event.title,
      tierName: ticket.ticketTier.name,
      eventDate: ticket.ticketTier.event.startTime,
      location: ticket.ticketTier.event.location ?? '',
      orderId: ticket.order.id,
      createdAt: ticket.createdAt,
      features: safeParseJsonArray<string>(ticket.ticketTier.features),
      performers: safeParseJsonArray<{ name: string; ticketDisplayName: string }>(ticket.ticketTier.event.performers),
      specialAdditions: safeParseJsonArray<{ name: string; description: string; ticketDisplayText: string }>(ticket.ticketTier.event.specialAdditions),
    });

    const safeTier = ticket.ticketTier.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'ticket';

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="banglafest-${safeTier}-${ticket.id.slice(0, 8)}.png"`);
    res.setHeader('Content-Length', pngBuffer.length);
    res.setHeader('Cache-Control', 'no-store');
    res.send(pngBuffer);
  } catch (err) {
    next(err);
  }
}

// GET /api/users/me/tickets/print-all
// Returns a single multi-page PDF containing all non-cancelled tickets.
export async function downloadAllTicketsPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await resolveTicketOwnerId(req);
    if (!userId) {
      res.status(401).json({ error: 'No token provided.' });
      return;
    }

    const tickets = await prisma.ticket.findMany({
      where: { userId, status: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        ticketTier: { include: { event: true } },
        order: { select: { id: true } },
      },
    });

    if (tickets.length === 0) {
      res.status(404).json({ error: 'No tickets found.' });
      return;
    }

    const pdfBuffer = await generateTicketsPdf(
      tickets.map((ticket) => ({
        ticketId: ticket.id,
        attendeeName: ticket.attendeeName ?? undefined,
        userName: ticket.user.name,
        userEmail: ticket.user.email,
        eventTitle: ticket.ticketTier.event.title,
        tierName: ticket.ticketTier.name,
        eventDate: ticket.ticketTier.event.startTime,
        location: ticket.ticketTier.event.location ?? '',
        orderId: ticket.order.id,
        createdAt: ticket.createdAt,
        features: safeParseJsonArray<string>(ticket.ticketTier.features),
        performers: safeParseJsonArray<{ name: string; ticketDisplayName: string }>(ticket.ticketTier.event.performers),
        specialAdditions: safeParseJsonArray<{ name: string; description: string; ticketDisplayText: string }>(ticket.ticketTier.event.specialAdditions),
      }))
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="banglafest-all-tickets.pdf"');
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
