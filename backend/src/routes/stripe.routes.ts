import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { createPaymentIntent, stripeWebhook } from '../controllers/stripe.controller';

const router = Router();

router.post('/webhook', stripeWebhook);
router.post('/create-payment-intent', authenticate, createPaymentIntent);
export default router;
