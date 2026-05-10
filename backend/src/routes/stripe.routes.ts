import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { createCheckoutSession, stripeWebhook } from '../controllers/stripe.controller';

const router = Router();

/**
 * @swagger
 * /api/stripe/webhook:
 *   post:
 *     summary: Stripe webhook handler
 *     description: Receives and processes Stripe events (checkout.session.completed, checkout.session.expired). Signature verified server-side.
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 example: evt_1234567890
 *               object:
 *                 type: string
 *                 example: event
 *               type:
 *                 type: string
 *                 enum: [checkout.session.completed, checkout.session.expired]
 *               data:
 *                 type: object
 *                 properties:
 *                   object:
 *                     type: object
 *     responses:
 *       200:
 *         description: Webhook received and processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid signature or malformed request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid signature.
 */
router.post('/webhook', stripeWebhook);

/**
 * @swagger
 * /api/stripe/create-session:
 *   post:
 *     summary: Create Stripe Checkout Session
 *     description: Create a Stripe Checkout Session for payment. Redirects user to Stripe hosted checkout page. Session expires when order expires (10 minutes).
 *     tags: [Payment]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *                 description: Order ID from create order endpoint
 *                 example: 770e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 checkoutUrl:
 *                   type: string
 *                   format: url
 *                   description: URL to redirect user to Stripe checkout
 *                   example: "https://checkout.stripe.com/pay/cs_live_..."
 *                 sessionId:
 *                   type: string
 *                   description: Stripe session ID for reference
 *                   example: cs_live_...
 *       400:
 *         description: Invalid order (expired, already paid, not found)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Order has expired or invalid status.
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Stripe API error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to create checkout session.
 */
router.post('/create-session', authenticate, createCheckoutSession);

export default router;
