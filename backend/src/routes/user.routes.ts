import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getMyTickets, getMyOrders, downloadTicketPdf, downloadAllTicketsPdf, getProfile } from '../controllers/user.controller';

const router = Router();

// Specific routes MUST come before parameterized routes in Express
// /print-all must be before /:ticketId/pdf to match correctly
router.get('/me/tickets/print-all', downloadAllTicketsPdf);
router.get('/me/tickets/:ticketId/pdf', downloadTicketPdf);

router.use(authenticate);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve authenticated user's profile information including name, email, role, and account creation date.
 *     tags: [User Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 550e8400-e29b-41d4-a716-446655440000
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: john@example.com
 *                     role:
 *                       type: string
 *                       enum: [USER, ADMIN, SCANNER]
 *                       example: USER
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-01T10:00:00Z"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/me', getProfile);

/**
 * @swagger
 * /api/users/me/tickets:
 *   get:
 *     summary: Get user's tickets with QR codes
 *     description: Retrieve all non-cancelled tickets purchased by the user. Includes QR code images as Base64 for scanning.
 *     tags: [User Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User's tickets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tickets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         description: Ticket UUID (QR code payload)
 *                         example: 880e8400-e29b-41d4-a716-446655440000
 *                       status:
 *                         type: string
 *                         enum: [VALID, CHECKED_IN, CANCELLED]
 *                         example: VALID
 *                       scannedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         example: null
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-05-11T14:28:00Z"
 *                       qrCode:
 *                         type: string
 *                         description: Base64 encoded PNG QR code image
 *                         example: "data:image/png;base64,iVBORw0KGgo..."
 *                       ticketTier:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: General Admission
 *                           price:
 *                             type: number
 *                             format: decimal
 *                             example: 50.00
 *                       event:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           title:
 *                             type: string
 *                             example: Banglafest 2026
 *                           startTime:
 *                             type: string
 *                             format: date-time
 *                           endTime:
 *                             type: string
 *                             format: date-time
 *                           location:
 *                             type: string
 *                             example: Central Park, NYC
 *                       order:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                           totalAmount:
 *                             type: number
 *                             format: decimal
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/me/tickets', getMyTickets);

/**
 * @swagger
 * /api/users/me/orders:
 *   get:
 *     summary: Get user's orders
 *     description: Retrieve all orders placed by the authenticated user with ticket counts and amounts.
 *     tags: [User Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User's orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: 770e8400-e29b-41d4-a716-446655440000
 *                       userId:
 *                         type: string
 *                         format: uuid
 *                       totalAmount:
 *                         type: number
 *                         format: decimal
 *                         example: 100.00
 *                       status:
 *                         type: string
 *                         enum: [PENDING, PAID, FAILED, REFUNDED]
 *                         example: PAID
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       ticketTier:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           price:
 *                             type: number
 *                             format: decimal
 *                       tickets:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             status:
 *                               type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/me/orders', getMyOrders);

/**
 * @swagger
 * /api/users/me/tickets/{ticketId}/pdf:
 *   get:
 *     summary: Download ticket as PDF
 *     description: Download a styled PDF ticket with embedded QR code, event details, and holder information. PDF format is A5 size.
 *     tags: [User Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ticket ID
 *         example: 880e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: PDF ticket file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Cannot download other user's tickets
 *       404:
 *         description: Ticket not found
 */
export default router;
