import { Router } from 'express';
import { listEvents, getEvent } from '../controllers/event.controller';

const router = Router();

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: List all events
 *     description: Retrieve a list of all available events with their ticket tiers and availability status
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: List of all events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: 550e8400-e29b-41d4-a716-446655440000
 *                       title:
 *                         type: string
 *                         example: Banglafest 2026
 *                       description:
 *                         type: string
 *                         example: Annual festival celebration
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-06-15T18:00:00Z"
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-06-15T23:00:00Z"
 *                       location:
 *                         type: string
 *                         example: Central Park, NYC
 *                       ticketTiers:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             name:
 *                               type: string
 *                               example: General Admission
 *                             price:
 *                               type: number
 *                               format: decimal
 *                               example: 50.00
 *                             totalCapacity:
 *                               type: integer
 *                               example: 1000
 *                             availableQty:
 *                               type: integer
 *                               example: 850
 *                             availabilityStatus:
 *                               type: string
 *                               enum: [AVAILABLE, SELLING_FAST, ONLY_A_FEW_LEFT, SOLD_OUT]
 *                               example: SELLING_FAST
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error.
 */
router.get('/', listEvents);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get single event details
 *     description: Retrieve detailed information about a specific event including all ticket tiers
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Event ID
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Event details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 550e8400-e29b-41d4-a716-446655440000
 *                     title:
 *                       type: string
 *                       example: Banglafest 2026
 *                     description:
 *                       type: string
 *                       example: Annual festival celebration
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-06-15T18:00:00Z"
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-06-15T23:00:00Z"
 *                     location:
 *                       type: string
 *                       example: Central Park, NYC
 *                     ticketTiers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           price:
 *                             type: number
 *                             format: decimal
 *                           totalCapacity:
 *                             type: integer
 *                           availableQty:
 *                             type: integer
 *                           availabilityStatus:
 *                             type: string
 *                             enum: [AVAILABLE, SELLING_FAST, ONLY_A_FEW_LEFT, SOLD_OUT]
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Event not found.
 */
router.get('/:id', getEvent);

export default router;
