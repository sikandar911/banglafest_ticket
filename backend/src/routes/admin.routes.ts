import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  createTier,
  updateTier,
  getRevenue,
  listUsers,
  listOrders,
  refundOrder,
  resendTicket,
  resendOrderTickets,
  bypassBookTicket,
  updateUserRole,
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, authorize('ADMIN'));

/**
 * @swagger
 * /api/admin/events:
 *   post:
 *     summary: Create new event
 *     tags: [Admin - Events]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Event created
 */
router.post(
  '/events',
  [
    body('title').trim().notEmpty().withMessage('Title is required.'),
    body('startTime').isISO8601().withMessage('startTime must be a valid ISO date.'),
    body('endTime').isISO8601().withMessage('endTime must be a valid ISO date.'),
  ],
  validate,
  createEvent
);

/**
 * @swagger
 * /api/admin/events/{id}:
 *   put:
 *     summary: Update event
 *     tags: [Admin - Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event updated
 */
router.put('/events/:id', updateEvent);

/**
 * @swagger
 * /api/admin/events/{id}:
 *   delete:
 *     summary: Delete event
 *     tags: [Admin - Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted
 */
router.delete('/events/:id', deleteEvent);

/**
 * @swagger
 * /api/admin/events/{id}/tiers:
 *   post:
 *     summary: Create ticket tier
 *     tags: [Admin - Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               totalCapacity:
 *                 type: integer
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               maxPerPerson:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Ticket tier created
 */
router.post(
  '/events/:id/tiers',
  [
    body('name').trim().notEmpty().withMessage('Tier name is required.'),
    body('description').optional().trim(),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number.'),
    body('totalCapacity').isInt({ min: 1 }).withMessage('Total capacity must be at least 1.'),
    body('features').optional().isArray().withMessage('Features must be an array.'),
    body('maxPerPerson').optional().isInt({ min: 1 }).withMessage('Max per person must be at least 1.'),
  ],
  validate,
  createTier
);

/**
 * @swagger
 * /api/admin/tiers/{id}:
 *   put:
 *     summary: Update ticket tier
 *     tags: [Admin - Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tier updated
 */
router.put(
  '/tiers/:id',
  [
    body('name').optional().trim(),
    body('description').optional().trim(),
    body('price').optional().isFloat({ min: 0 }),
    body('totalCapacity').optional().isInt({ min: 1 }),
    body('features').optional().isArray(),
    body('maxPerPerson').optional().isInt({ min: 1 }),
  ],
  validate,
  updateTier
);

/**
 * @swagger
 * /api/admin/revenue:
 *   get:
 *     summary: Get revenue dashboard
 *     tags: [Admin - Finance]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue statistics
 */
router.get('/revenue', getRevenue);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all users
 *     tags: [Admin - Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', listUsers);

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: List all orders
 *     tags: [Admin - Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, FAILED, REFUNDED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get(
  '/orders',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1 })],
  validate,
  listOrders
);

/**
 * @swagger
 * /api/admin/orders/{id}/refund:
 *   post:
 *     summary: Refund order
 *     tags: [Admin - Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order refunded
 */
router.post('/orders/:id/refund', refundOrder);
router.post('/orders/:id/resend-ticket', resendOrderTickets);

/**
 * @swagger
 * /api/admin/tickets/{ticketId}/resend:
 *   post:
 *     summary: Resend ticket email
 *     tags: [Admin - Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket resent
 */
router.post('/tickets/:ticketId/resend', resendTicket);

/**
 * @swagger
 * /api/admin/bypass:
 *   post:
 *     summary: Admin bypass - Book tickets without payment
 *     tags: [Admin - Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               tierId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Bypass tickets booked successfully
 */
router.post(
  '/bypass',
  [
    body('userId').notEmpty().withMessage('userId is required.'),
    body('tierId').notEmpty().withMessage('tierId is required.'),
    body('quantity').isInt({ min: 1 }).withMessage('quantity must be at least 1.'),
  ],
  validate,
  bypassBookTicket
);

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   patch:
 *     summary: Update user role
 *     tags: [Admin - Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN, SCANNER]
 *     responses:
 *       200:
 *         description: User role updated
 */
router.patch(
  '/users/:id/role',
  [body('role').isIn(['USER', 'ADMIN', 'SCANNER']).withMessage('Invalid role.')],
  validate,
  updateUserRole
);

export default router;
