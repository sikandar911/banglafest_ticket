import { Response, NextFunction, Request } from 'express';
import Stripe from 'stripe';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authenticate';
import { sendTicketConfirmationEmail } from '../services/email.service';
import { generateTicketPdf } from '../services/pdf.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

// POST /api/stripe/create-session
export async function createCheckoutSession(
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
        ticketTier: { select: { name: true, price: true, event: { select: { title: true } } } },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (order.userId !== req.user!.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    if (order.status !== 'PENDING') {
      res.status(400).json({ error: 'Order is no longer pending.' });
      return;
    }

    if (order.expiresAt < new Date()) {
      res.status(400).json({ error: 'Order has expired. Please start a new checkout.' });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: order.user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${order.ticketTier.event.title} — ${order.ticketTier.name}`,
            },
            unit_amount: Math.round(Number(order.ticketTier.price) * 100),
          },
          quantity: order.quantity,
        },
      ],
      metadata: { orderId: order.id },
      success_url: `${process.env.FRONTEND_URL}/checkout/success?orderId=${order.id}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel?orderId=${order.id}`,
      expires_at: Math.floor(order.expiresAt.getTime() / 1000),
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    res.json({ checkoutUrl: session.url, sessionId: session.id });
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

async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, ticketTier: { include: { event: true } } },
  });
  if (!order || order.status !== 'PENDING') return;

  const ticketData = Array.from({ length: order.quantity }).map(() => ({
    orderId: order.id,
    ticketTierId: order.tierId,
    userId: order.userId,
    status: 'VALID' as const,
  }));

  const tickets = await prisma.$transaction(async (tx) => {
    const created = await Promise.all(
      ticketData.map((data) => tx.ticket.create({ data }))
    );
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        stripePaymentIntent: session.payment_intent as string,
      },
    });
    return created;
  });

  const pdfBuffers = await Promise.all(
    tickets.map((ticket) =>
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
      })
    )
  );

  await sendTicketConfirmationEmail(
    order.user.email,
    order.user.name,
    tickets.map((t, i) => ({ ticketId: t.id, pdfBuffer: pdfBuffers[i] })),
    {
      eventTitle: order.ticketTier.event.title,
      tierName: order.ticketTier.name,
      eventDate: order.ticketTier.event.startTime,
    }
  );
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
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
}
