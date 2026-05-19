import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  initiateSale,
  verifySaleOtp,
  completeSale,
  getSalesCustomers,
  getSalesEvents,
  printCustomerTickets,
} from '../controllers/sales.controller';

const router = Router();

// All sales routes require authentication + SALES_EXECUTIVE role
router.use(authenticate, authorize('SALES_EXECUTIVE'));

// GET /api/sales/events — available events/tiers to sell
router.get('/events', getSalesEvents);

// POST /api/sales/initiate — step 1: send OTP to attendee
router.post('/initiate', initiateSale);

// POST /api/sales/verify-otp — step 2: verify attendee OTP
router.post('/verify-otp', verifySaleOtp);

// POST /api/sales/complete — step 3: create order + tickets
router.post('/complete', completeSale);

// GET /api/sales/customers — list my sold tickets grouped by customer
router.get('/customers', getSalesCustomers);

router.get('/customers/:attendeeId/print-tickets', printCustomerTickets);

export default router;
