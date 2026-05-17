import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { validatePromoCode } from '../controllers/promo.controller';

const router = Router();

router.post(
  '/validate',
  [
    body('code').trim().notEmpty().withMessage('Promo code is required.'),
    body('tierId').trim().notEmpty().withMessage('tierId is required.'),
  ],
  validate,
  validatePromoCode
);

export default router;
