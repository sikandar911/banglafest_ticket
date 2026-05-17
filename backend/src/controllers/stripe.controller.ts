import { Response, NextFunction, Request } from 'express';
import Stripe from 'stripe';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authenticate';
import {
  sendTicketConfirmationEmail,
  sendOrderExpiredEmail,
} from '../services/email.service';
import { generateTicketPdf } from '../services/pdf.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

// POST /api/stripe/create-payment-intent
export async function createPaymentIntent(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ error: 'orderId is required.' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { email: true, name: true } },
        ticketTier: { include: { event: { select: { title: true } } } },
      },
    });

    if (!order) { res.status(404).json({ error: 'Order not found.' }); return; }
    if (order.userId !== req.user!.id) { res.status(403).json({ error: 'Access denied.' }); return; }
    if (order.status !== 'PENDING') { res.status(400).json({ error: 'Order is no longer pending.' }); return; }
    if (order.expiresAt < new Date()) { res.status(400).json({ error: 'Order has expired. Please start a new checkout.' }); return; }

    // Reuse existing payment intent if one already exists for this order
    if (order.stripePaymentIntent) {
      const existing = await stripe.paymentIntents.retrieve(order.stripePaymentIntent);
      if (existing.status === 'requires_payment_method' || existing.status === 'requires_confirmation') {
        res.json({ clientSecret: existing.client_secret });
        return;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(order.totalAmount) * 100),
      currency: 'gbp',
      description: `[${order.id.slice(0, 8).toUpperCase()}] ${order.ticketTier.event.title} — ${order.ticketTier.name} × ${order.quantity}`,
      receipt_email: order.user.email,
      metadata: {
        order_id: order.id,
        event_title: order.ticketTier.event.title,
        tier_name: order.ticketTier.name,
        quantity: String(order.quantity),
        customer_name: order.user.name,
        customer_email: order.user.email,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntent: paymentIntent.id },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    next(err);
  }
}

// POST /api/stripe/webhook
export async function stripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed.';
    res.status(400).json({ error: message });
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, ticketTier: { include: { event: true } } },
  });

  // Idempotent: if frontend already confirmed the order, skip
  if (!order || order.status !== 'PENDING') return;

  await fulfillOrder(order);
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, ticketTier: { include: { event: true } } },
  });
  if (!order || order.status !== 'PENDING') return;

  await fulfillOrder(order, session.payment_intent as string);
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true } },
      ticketTier: { include: { event: { select: { title: true } } } },
    },
  });
  if (!order || order.status !== 'PENDING') return;

  await prisma.$transaction([
    prisma.ticketTier.update({
      where: { id: order.tierId },
      data: { availableQty: { increment: order.quantity } },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { status: 'FAILED' },
    }),
  ]);

  await sendOrderExpiredEmail(order.user.email, order.user.name, {
    eventTitle: order.ticketTier.event.title,
    tierName: order.ticketTier.name,
    quantity: order.quantity,
  });
}

// Shared fulfillment logic used by both webhook and confirmOrder
async function fulfillOrder(
  order: Awaited<ReturnType<typeof prisma.order.findUnique>> & {
    user: { name: string; email: string };
    ticketTier: { name: string; event: { title: string; startTime: Date; location: string | null } };
  },
  paymentIntentId?: string
): Promise<void> {
  const ticketData = Array.from({ length: order!.quantity }).map(() => ({
    orderId: order!.id,
    ticketTierId: order!.tierId,
    userId: order!.userId,
    status: 'VALID' as const,
  }));

  const tickets = await prisma.$transaction(async (tx) => {
    // Atomic PENDING → PAID transition prevents duplicate ticket creation
    // when both the webhook and the frontend confirmOrder fire concurrently
    const transitioned = await tx.order.updateMany({
      where: { id: order!.id, status: 'PENDING' },
      data: {
        status: 'PAID',
        ...(paymentIntentId && { stripePaymentIntent: paymentIntentId }),
      },
    });
    if (transitioned.count === 0) return null; // already fulfilled — skip

    const created = await Promise.all(ticketData.map((d) => tx.ticket.create({ data: d })));
    return created;
  });

  if (!tickets) return; // idempotent — already processed

  const pdfBuffers = await Promise.all(
    tickets.map((ticket) =>
      generateTicketPdf({
        ticketId: ticket.id,
        userName: order!.user.name,
        userEmail: order!.user.email,
        eventTitle: order!.ticketTier.event.title,
        tierName: order!.ticketTier.name,
        eventDate: order!.ticketTier.event.startTime,
        location: order!.ticketTier.event.location ?? '',
        orderId: order!.id,
        createdAt: ticket.createdAt,
      })
    )
  );

  await sendTicketConfirmationEmail(
    order!.user.email,
    order!.user.name,
    tickets.map((t, i) => ({ ticketId: t.id, pdfBuffer: pdfBuffers[i] })),
    {
      eventTitle: order!.ticketTier.event.title,
      tierName: order!.ticketTier.name,
      eventDate: order!.ticketTier.event.startTime,
    }
  );
}
