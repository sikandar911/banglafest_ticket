import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { scanTicket, searchTickets, toggleInStatus } from '../controllers/scanner.controller';

const router = Router();

// SCANNER and ADMIN roles can access
router.use(authenticate, authorize('SCANNER', 'ADMIN'));

/**
 * @swagger
 * /api/scanner/scan:
 *   post:
 *     summary: Scan ticket QR code
 *     description: Validate and check-in a ticket by scanning its QR code (UUID). Returns entry status and holder details. Prevents duplicate scans.
 *     tags: [Scanner]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticketId
 *             properties:
 *               ticketId:
 *                 type: string
 *                 format: uuid
 *                 description: Ticket UUID from QR code scan
 *                 example: 880e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Valid ticket - entry granted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 reason:
 *                   type: string
 *                   enum: [VALID, ALREADY_USED, CANCELLED]
 *                   example: VALID
 *                 message:
 *                   type: string
 *                   example: "✅ VALID — Entry granted."
 *                 ticket:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     holder:
 *                       type: string
 *                       example: John Doe
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: john@example.com
 *                     tier:
 *                       type: string
 *                       example: General Admission
 *                     event:
 *                       type: string
 *                       example: Banglafest 2026
 *                     eventDate:
 *                       type: string
 *                       format: date-time
 *                     location:
 *                       type: string
 *                       example: Central Park, NYC
 *                     checkedInAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       400:
 *         description: Invalid or cancelled ticket
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: false
 *                 reason:
 *                   type: string
 *                   example: CANCELLED
 *                 message:
 *                   type: string
 *                   example: "This ticket has been cancelled."
 *       401:
 *         description: Unauthorized - Invalid or missing token / insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Ticket not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Ticket not found.
 *       409:
 *         description: Ticket already scanned (duplicate scan)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: false
 *                 reason:
 *                   type: string
 *                   example: ALREADY_USED
 *                 message:
 *                   type: string
 *                   example: "⚠️ ALREADY USED — This ticket was already scanned."
 */
router.post('/scan', scanTicket);

/**
 * @swagger
 * /api/scanner/search:
 *   get:
 *     summary: Search tickets by email or name
 *     description: Find all tickets for a user by searching their email address or name. Minimum 2 characters required. Case-insensitive search.
 *     tags: [Scanner]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query - email or name (minimum 2 characters)
 *         example: john
 *     responses:
 *       200:
 *         description: Search results found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ticketId:
 *                         type: string
 *                         format: uuid
 *                         example: 880e8400-e29b-41d4-a716-446655440000
 *                       holder:
 *                         type: string
 *                         example: John Doe
 *                       email:
 *                         type: string
 *                         format: email
 *                         example: john@example.com
 *                       tier:
 *                         type: string
 *                         example: General Admission
 *                       event:
 *                         type: string
 *                         example: Banglafest 2026
 *                       eventDate:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                         enum: [VALID, CHECKED_IN, CANCELLED]
 *                         example: VALID
 *                       scannedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         example: null
 *                 count:
 *                   type: integer
 *                   description: Number of matching tickets
 *                   example: 2
 *       400:
 *         description: Search query too short (minimum 2 characters)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Search query must be at least 2 characters.
 *       401:
 *         description: Unauthorized - Invalid token or insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/search', searchTickets);

/**
 * @swagger
 * /api/scanner/toggle-in-status:
 *   post:
 *     summary: Toggle ticket in/out status
 *     description: Toggle the in/out status of a checked-in ticket. Can be used to mark ticket holders as checked out.
 *     tags: [Scanner]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticketId
 *             properties:
 *               ticketId:
 *                 type: string
 *                 format: uuid
 *                 description: Ticket ID
 *     responses:
 *       200:
 *         description: In/out status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 inStatus:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Ticket checked out"
 *       400:
 *         description: Invalid request or ticket not checked in
 *       404:
 *         description: Ticket not found
 */
router.post('/toggle-in-status', toggleInStatus);

export default router;
