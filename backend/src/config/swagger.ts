import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

// Resolve correct paths based on whether we're in dist folder (production) or src folder (development)
const isProduction = __dirname.includes('dist') || process.env.NODE_ENV === 'production';
const apiPaths = isProduction
  ? [
      path.resolve(__dirname, '../routes/*.js'),
      path.resolve(__dirname, '../controllers/*.js'),
    ]
  : [
      path.resolve(__dirname, '../routes/*.ts'),
      path.resolve(__dirname, '../controllers/*.ts'),
    ];

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Banglafest Ticketing API',
      version: '1.0.0',
      description:
        'Complete API for the Banglafest ticketing system with user authentication, ticket management, Stripe payment integration, and admin dashboard.',
      contact: {
        name: 'Banglafest Support',
        email: 'support@banglafest.com',
      },
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:5000',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from login endpoint',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['USER', 'ADMIN', 'SCANNER'] },
            isVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            location: { type: 'string' },
            ticketTiers: {
              type: 'array',
              items: { $ref: '#/components/schemas/TicketTier' },
            },
          },
        },
        TicketTier: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            price: { type: 'number', format: 'decimal' },
            totalCapacity: { type: 'integer' },
            availableQty: { type: 'integer' },
            availabilityStatus: {
              type: 'string',
              enum: ['AVAILABLE', 'SELLING_FAST', 'ONLY_A_FEW_LEFT', 'SOLD_OUT'],
            },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            tierId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer' },
            totalAmount: { type: 'number', format: 'decimal' },
            status: { type: 'string', enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] },
            expiresAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'This UUID is the QR code payload' },
            orderId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['VALID', 'CHECKED_IN', 'CANCELLED'] },
            scannedAt: { type: 'string', format: 'date-time', nullable: true },
            qrCode: { type: 'string', description: 'Base64 encoded QR code image' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  apis: apiPaths,
};

export const swaggerSpec = swaggerJsdoc(options);
