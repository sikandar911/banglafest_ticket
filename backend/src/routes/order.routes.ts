import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createOrder, getOrder, confirmOrder } from '../controllers/order.controller';

const router = Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create order and reserve tickets
 *     description: Create a new order to reserve tickets for a specific tier. Tickets are reserved for 10 minutes. Must proceed to checkout within this time.
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tierId
 *               - quantity
 *             properties:
 *               tierId:
 *                 type: string
 *                 format: uuid
 *                 description: Ticket tier ID from event details
 *                 example: 660e8400-e29b-41d4-a716-446655440001
 *               quantity:
 *                 type: integer
 *                 description: Number of tickets to reserve (minimum 1)
 *                 minimum: 1
 *                 example: 2
 *     responses:
 *       201:
 *         description: Order created successfully - tickets reserved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orderId:
 *                   type: string
 *                   format: uuid
 *                   example: 770e8400-e29b-41d4-a716-446655440000
 *                 totalAmount:
 *                   type: number
 *                   format: decimal
 *                   example: 100.00
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   description: Order expires in 10 minutes
 *                   example: "2026-05-11T14:35:00Z"
 *                 tier:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                       example: General Admission
 *                     price:
 *                       type: number
 *                       format: decimal
 *                       example: 50.00
 *       400:
 *         description: Invalid request (negative quantity, invalid tier, etc)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Quantity must be at least 1.
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: No token provided.
 *       409:
 *         description: Not enough tickets available
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Not enough tickets available.
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.post(
  '/',
  authenticate,
  [
    body('tierId').notEmpty().withMessage('tierId is required.'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
  ],
  validate,
  createOrder
);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order details
 *     description: Retrieve detailed information about a specific order including associated tickets. Users can only view their own orders, admins can view any order.
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *         example: 770e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 770e8400-e29b-41d4-a716-446655440000
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                       example: 550e8400-e29b-41d4-a716-446655440000
 *                     totalAmount:
 *                       type: number
 *                       format: decimal
 *                       example: 100.00
 *                     status:
 *                       type: string
 *                       enum: [PENDING, PAID, FAILED, REFUNDED]
 *                       example: PENDING
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-11T14:35:00Z"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-11T14:25:00Z"
 *                     tickets:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       403:
 *         description: Access denied - Cannot view other user's orders
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
 */
router.get('/:id', authenticate, getOrder);
router.post('/:id/confirm', authenticate, confirmOrder);

export default router;
