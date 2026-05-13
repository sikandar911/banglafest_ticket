import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

// GET /api/events
export async function listEvents(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const events = await prisma.event.findMany({
      orderBy: { startTime: 'asc' },
      include: {
        ticketTiers: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            totalCapacity: true,
            availableQty: true,
            features: true,
            maxPerPerson: true,
          },
        },
      },
    });

    const eventsWithAvailability = events.map((event) => ({
      ...event,
      ticketTiers: event.ticketTiers.map((tier) => ({
        ...tier,
        price: Number(tier.price),
        features: tier.features ? JSON.parse(tier.features) : [],
        availabilityStatus: getAvailabilityStatus(tier.availableQty, tier.totalCapacity),
      })),
    }));

    res.json({ events: eventsWithAvailability });
  } catch (err) {
    next(err);
  }
}

// GET /api/events/:id
export async function getEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        ticketTiers: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            totalCapacity: true,
            availableQty: true,
            features: true,
            maxPerPerson: true,
          },
        },
      },
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }

    res.json({
      event: {
        ...event,
        ticketTiers: event.ticketTiers.map((tier) => ({
          ...tier,
          price: Number(tier.price),
          features: tier.features ? JSON.parse(tier.features) : [],
          availabilityStatus: getAvailabilityStatus(tier.availableQty, tier.totalCapacity),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

function getAvailabilityStatus(available: number, total: number): string {
  if (available === 0) return 'SOLD_OUT';
  if (available <= 5) return 'ONLY_A_FEW_LEFT';
  if (available / total < 0.2) return 'SELLING_FAST';
  return 'AVAILABLE';
}
