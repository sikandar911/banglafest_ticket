import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

// POST /api/promo/validate
// Public endpoint: validate a promo code for a given event/tier
export async function validatePromoCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, tierId } = req.body;

    if (!code || !tierId) {
      res.status(400).json({ error: 'code and tierId are required.' });
      return;
    }

    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        events: {
          include: {
            event: {
              include: { ticketTiers: true },
            },
          },
        },
      },
    });

    if (!promoCode || !promoCode.isActive) {
      res.status(404).json({ valid: false, message: 'Invalid or inactive promo code.' });
      return;
    }

    const now = new Date();
    if (promoCode.startDate && now < promoCode.startDate) {
      res.status(400).json({ valid: false, message: `This promo code is not yet active. It starts on ${promoCode.startDate.toDateString()}.` });
      return;
    }
    if (promoCode.endDate && now > promoCode.endDate) {
      res.status(400).json({ valid: false, message: 'This promo code has expired.' });
      return;
    }

    // Check if this promo code applies to the event containing the requested tier
    const appliesToTier = promoCode.events.some((pe) =>
      pe.event.ticketTiers.some((t) => t.id === tierId)
    );

    if (!appliesToTier) {
      res.status(400).json({ valid: false, message: 'This promo code is not valid for this event.' });
      return;
    }

    // Get the discount amount from the specific tier
    const tier = await prisma.ticketTier.findUnique({
      where: { id: tierId },
    });

    if (!tier) {
      res.status(404).json({ valid: false, message: 'Ticket tier not found.' });
      return;
    }

    // Promo-level discount takes precedence; tier-level is the fallback
    const discountAmount =
      promoCode.discountAmount != null
        ? Number(promoCode.discountAmount)
        : tier.promoDiscountAmount
          ? Number(tier.promoDiscountAmount)
          : 0;

    res.json({
      valid: true,
      promoCodeId: promoCode.id,
      code: promoCode.code,
      discountAmount,
      influencerName: promoCode.influencerName,
      message: discountAmount > 0
        ? `Promo applied! £${discountAmount.toFixed(2)} off per ticket.`
        : 'Promo code applied!',
    });
  } catch (err) {
    next(err);
  }
}
