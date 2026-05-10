# Banglafest Ticketing API - Complete Documentation

## API Base URL
- **Development**: `http://localhost:5000`
- **API Docs**: `http://localhost:5000/api-docs`

---

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_access_token>
```

---

## Endpoints

### 1. AUTH MODULE

#### 1.1 Register User
- **Method**: `POST`
- **Endpoint**: `/api/auth/register`
- **Auth Required**: No
- **Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```
- **Response** (201):
```json
{
  "message": "Registration successful. Please check your email for the verification code.",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 1.2 Verify Email with OTP
- **Method**: `POST`
- **Endpoint**: `/api/auth/verify-email`
- **Auth Required**: No
- **Request Body**:
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```
- **Response** (200):
```json
{
  "message": "Email verified successfully. You can now log in."
}
```

#### 1.3 Resend OTP
- **Method**: `POST`
- **Endpoint**: `/api/auth/resend-otp`
- **Auth Required**: No
- **Request Body**:
```json
{
  "email": "john@example.com"
}
```
- **Response** (200):
```json
{
  "message": "If that email is registered, a new code has been sent."
}
```

#### 1.4 Login
- **Method**: `POST`
- **Endpoint**: `/api/auth/login`
- **Auth Required**: No
- **Request Body**:
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```
- **Response** (200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

#### 1.5 Refresh Access Token
- **Method**: `POST`
- **Endpoint**: `/api/auth/refresh-token`
- **Auth Required**: No
- **Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Response** (200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 1.6 Logout
- **Method**: `POST`
- **Endpoint**: `/api/auth/logout`
- **Auth Required**: No
- **Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Response** (200):
```json
{
  "message": "Logged out successfully."
}
```

#### 1.7 Forgot Password
- **Method**: `POST`
- **Endpoint**: `/api/auth/forgot-password`
- **Auth Required**: No
- **Request Body**:
```json
{
  "email": "john@example.com"
}
```
- **Response** (200):
```json
{
  "message": "If that email is registered, a reset link has been sent."
}
```

#### 1.8 Reset Password
- **Method**: `POST`
- **Endpoint**: `/api/auth/reset-password`
- **Auth Required**: No
- **Request Body**:
```json
{
  "token": "abc123def456...",
  "newPassword": "NewSecurePassword123"
}
```
- **Response** (200):
```json
{
  "message": "Password reset successfully. Please log in."
}
```

---

### 2. EVENTS MODULE (Public)

#### 2.1 List All Events
- **Method**: `GET`
- **Endpoint**: `/api/events`
- **Auth Required**: No
- **Query Parameters**: None
- **Response** (200):
```json
{
  "events": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Banglafest 2026",
      "description": "Annual festival celebration",
      "startTime": "2026-06-15T18:00:00Z",
      "endTime": "2026-06-15T23:00:00Z",
      "location": "Central Park, NYC",
      "ticketTiers": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "name": "General Admission",
          "price": 50.00,
          "totalCapacity": 1000,
          "availableQty": 850,
          "availabilityStatus": "SELLING_FAST"
        },
        {
          "id": "660e8400-e29b-41d4-a716-446655440002",
          "name": "VIP",
          "price": 150.00,
          "totalCapacity": 200,
          "availableQty": 5,
          "availabilityStatus": "ONLY_A_FEW_LEFT"
        }
      ]
    }
  ]
}
```

#### 2.2 Get Single Event Details
- **Method**: `GET`
- **Endpoint**: `/api/events/:id`
- **Auth Required**: No
- **Response** (200):
```json
{
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Banglafest 2026",
    "description": "Annual festival celebration",
    "startTime": "2026-06-15T18:00:00Z",
    "endTime": "2026-06-15T23:00:00Z",
    "location": "Central Park, NYC",
    "ticketTiers": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "General Admission",
        "price": 50.00,
        "totalCapacity": 1000,
        "availableQty": 850,
        "availabilityStatus": "SELLING_FAST"
      }
    ]
  }
}
```

---

### 3. ORDERS & CHECKOUT MODULE

#### 3.1 Create Order (Reserve Tickets)
- **Method**: `POST`
- **Endpoint**: `/api/orders`
- **Auth Required**: Yes (USER, ADMIN)
- **Request Body**:
```json
{
  "tierId": "660e8400-e29b-41d4-a716-446655440001",
  "quantity": 2
}
```
- **Response** (201):
```json
{
  "orderId": "770e8400-e29b-41d4-a716-446655440000",
  "totalAmount": 100.00,
  "expiresAt": "2026-05-11T14:35:00Z",
  "tier": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "General Admission",
    "price": 50.00
  }
}
```

#### 3.2 Get Order Details
- **Method**: `GET`
- **Endpoint**: `/api/orders/:id`
- **Auth Required**: Yes
- **Response** (200):
```json
{
  "order": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "totalAmount": 100.00,
    "status": "PENDING",
    "expiresAt": "2026-05-11T14:35:00Z",
    "createdAt": "2026-05-11T14:25:00Z",
    "tickets": []
  }
}
```

---

### 4. STRIPE PAYMENT MODULE

#### 4.1 Create Checkout Session
- **Method**: `POST`
- **Endpoint**: `/api/stripe/create-session`
- **Auth Required**: Yes (USER, ADMIN)
- **Request Body**:
```json
{
  "orderId": "770e8400-e29b-41d4-a716-446655440000"
}
```
- **Response** (200):
```json
{
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_live_...",
  "sessionId": "cs_live_..."
}
```

#### 4.2 Stripe Webhook (Internal)
- **Method**: `POST`
- **Endpoint**: `/api/stripe/webhook`
- **Auth Required**: No (Stripe signature verification)
- **Triggers**:
  - `checkout.session.completed` - Creates tickets and sends confirmation email
  - `checkout.session.expired` - Restores inventory

---

### 5. USER DASHBOARD MODULE

#### 5.1 Get User Profile
- **Method**: `GET`
- **Endpoint**: `/api/users/me`
- **Auth Required**: Yes
- **Response** (200):
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "createdAt": "2026-05-01T10:00:00Z"
  }
}
```

#### 5.2 Get My Tickets
- **Method**: `GET`
- **Endpoint**: `/api/users/me/tickets`
- **Auth Required**: Yes
- **Response** (200):
```json
{
  "tickets": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "status": "VALID",
      "scannedAt": null,
      "createdAt": "2026-05-11T14:28:00Z",
      "qrCode": "data:image/png;base64,iVBORw0KGgo...",
      "ticketTier": {
        "name": "General Admission",
        "price": 50.00
      },
      "event": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Banglafest 2026",
        "startTime": "2026-06-15T18:00:00Z",
        "endTime": "2026-06-15T23:00:00Z",
        "location": "Central Park, NYC"
      },
      "order": {
        "status": "PAID",
        "totalAmount": 50.00,
        "createdAt": "2026-05-11T14:25:00Z"
      }
    }
  ]
}
```

#### 5.3 Get My Orders
- **Method**: `GET`
- **Endpoint**: `/api/users/me/orders`
- **Auth Required**: Yes
- **Response** (200):
```json
{
  "orders": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "totalAmount": 100.00,
      "status": "PAID",
      "expiresAt": "2026-05-11T14:35:00Z",
      "createdAt": "2026-05-11T14:25:00Z",
      "ticketTier": {
        "name": "General Admission",
        "price": 50.00
      },
      "tickets": [
        {
          "id": "880e8400-e29b-41d4-a716-446655440000",
          "status": "VALID"
        }
      ]
    }
  ]
}
```

#### 5.4 Download Ticket PDF
- **Method**: `GET`
- **Endpoint**: `/api/users/me/tickets/:ticketId/pdf`
- **Auth Required**: Yes
- **Response** (200): PDF file stream

---

### 6. ADMIN PANEL MODULE

#### 6.1 Create Event
- **Method**: `POST`
- **Endpoint**: `/api/admin/events`
- **Auth Required**: Yes (ADMIN only)
- **Request Body**:
```json
{
  "title": "Banglafest 2026",
  "description": "Annual festival celebration",
  "startTime": "2026-06-15T18:00:00Z",
  "endTime": "2026-06-15T23:00:00Z",
  "location": "Central Park, NYC"
}
```
- **Response** (201):
```json
{
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Banglafest 2026",
    "description": "Annual festival celebration",
    "startTime": "2026-06-15T18:00:00Z",
    "endTime": "2026-06-15T23:00:00Z",
    "location": "Central Park, NYC",
    "createdBy": "550e8400-e29b-41d4-a716-446655440001",
    "createdAt": "2026-05-11T14:25:00Z"
  }
}
```

#### 6.2 Update Event
- **Method**: `PUT`
- **Endpoint**: `/api/admin/events/:id`
- **Auth Required**: Yes (ADMIN only)
- **Request Body**: (partial update)
```json
{
  "title": "Banglafest 2026 Updated",
  "location": "Madison Square Garden"
}
```
- **Response** (200): Updated event object

#### 6.3 Delete Event
- **Method**: `DELETE`
- **Endpoint**: `/api/admin/events/:id`
- **Auth Required**: Yes (ADMIN only)
- **Response** (200):
```json
{
  "message": "Event deleted."
}
```

#### 6.4 Create Ticket Tier
- **Method**: `POST`
- **Endpoint**: `/api/admin/events/:id/tiers`
- **Auth Required**: Yes (ADMIN only)
- **Request Body**:
```json
{
  "name": "VIP",
  "price": 150.00,
  "totalCapacity": 200
}
```
- **Response** (201):
```json
{
  "tier": {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "VIP",
    "price": 150.00,
    "totalCapacity": 200,
    "availableQty": 200
  }
}
```

#### 6.5 Update Ticket Tier
- **Method**: `PUT`
- **Endpoint**: `/api/admin/tiers/:id`
- **Auth Required**: Yes (ADMIN only)
- **Request Body**:
```json
{
  "name": "Premium VIP",
  "price": 200.00
}
```
- **Response** (200): Updated tier object

#### 6.6 Get Revenue Dashboard
- **Method**: `GET`
- **Endpoint**: `/api/admin/revenue`
- **Auth Required**: Yes (ADMIN only)
- **Response** (200):
```json
{
  "totalRevenue": 5000.00,
  "paidOrderCount": 25,
  "totalRefunded": 500.00,
  "refundedOrderCount": 2,
  "netRevenue": 4500.00,
  "recentOrders": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "totalAmount": 100.00,
      "status": "PAID",
      "createdAt": "2026-05-11T14:25:00Z",
      "user": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "ticketTier": {
        "name": "General Admission"
      }
    }
  ]
}
```

#### 6.7 List All Users
- **Method**: `GET`
- **Endpoint**: `/api/admin/users`
- **Auth Required**: Yes (ADMIN only)
- **Response** (200):
```json
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "isVerified": true,
      "createdAt": "2026-05-01T10:00:00Z",
      "orders": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440000",
          "totalAmount": 100.00,
          "createdAt": "2026-05-11T14:25:00Z"
        }
      ]
    }
  ]
}
```

#### 6.8 List All Orders
- **Method**: `GET`
- **Endpoint**: `/api/admin/orders?status=PAID&page=1&limit=20`
- **Auth Required**: Yes (ADMIN only)
- **Query Parameters**:
  - `status` (optional): PENDING, PAID, FAILED, REFUNDED
  - `page` (optional, default: 1)
  - `limit` (optional, default: 20)
- **Response** (200):
```json
{
  "orders": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "totalAmount": 100.00,
      "status": "PAID",
      "createdAt": "2026-05-11T14:25:00Z",
      "user": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "ticketTier": {
        "name": "General Admission"
      },
      "tickets": [
        {
          "id": "880e8400-e29b-41d4-a716-446655440000",
          "status": "VALID"
        }
      ]
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 5
}
```

#### 6.9 Refund Order
- **Method**: `POST`
- **Endpoint**: `/api/admin/orders/:id/refund`
- **Auth Required**: Yes (ADMIN only)
- **Response** (200):
```json
{
  "message": "Order refunded and tickets cancelled successfully."
}
```

#### 6.10 Resend Ticket Email
- **Method**: `POST`
- **Endpoint**: `/api/admin/tickets/:ticketId/resend`
- **Auth Required**: Yes (ADMIN only)
- **Response** (200):
```json
{
  "message": "Ticket resent successfully."
}
```

#### 6.11 Update User Role
- **Method**: `PATCH`
- **Endpoint**: `/api/admin/users/:id/role`
- **Auth Required**: Yes (ADMIN only)
- **Request Body**:
```json
{
  "role": "SCANNER"
}
```
- **Response** (200):
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "SCANNER"
  }
}
```

---

### 7. SCANNER MODULE

#### 7.1 Scan Ticket QR Code
- **Method**: `POST`
- **Endpoint**: `/api/scanner/scan`
- **Auth Required**: Yes (SCANNER, ADMIN)
- **Request Body**:
```json
{
  "ticketId": "880e8400-e29b-41d4-a716-446655440000"
}
```
- **Response on Valid Ticket** (200):
```json
{
  "valid": true,
  "reason": "VALID",
  "message": "✅ VALID — Entry granted.",
  "ticket": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "holder": "John Doe",
    "email": "john@example.com",
    "tier": "General Admission",
    "event": "Banglafest 2026",
    "eventDate": "2026-06-15T18:00:00Z",
    "location": "Central Park, NYC",
    "checkedInAt": "2026-05-11T19:30:45Z"
  }
}
```

- **Response on Already Used** (409):
```json
{
  "valid": false,
  "reason": "ALREADY_USED",
  "message": "⚠️ ALREADY USED — This ticket was already scanned.",
  "ticket": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "holder": "John Doe",
    "tier": "General Admission",
    "event": "Banglafest 2026",
    "scannedAt": "2026-05-11T19:15:00Z"
  }
}
```

- **Response on Cancelled** (400):
```json
{
  "valid": false,
  "reason": "CANCELLED",
  "message": "This ticket has been cancelled.",
  "ticket": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "holder": "John Doe",
    "tier": "General Admission",
    "event": "Banglafest 2026"
  }
}
```

#### 7.2 Search Tickets by Email/Name
- **Method**: `GET`
- **Endpoint**: `/api/scanner/search?q=john`
- **Auth Required**: Yes (SCANNER, ADMIN)
- **Query Parameters**:
  - `q` (required, min 2 chars): Search query (email or name)
- **Response** (200):
```json
{
  "results": [
    {
      "ticketId": "880e8400-e29b-41d4-a716-446655440000",
      "holder": "John Doe",
      "email": "john@example.com",
      "tier": "General Admission",
      "event": "Banglafest 2026",
      "eventDate": "2026-06-15T18:00:00Z",
      "status": "VALID",
      "scannedAt": null
    }
  ],
  "count": 1
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request or missing required fields"
}
```

### 401 Unauthorized
```json
{
  "error": "No token provided. or Invalid or expired token."
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions."
}
```

### 404 Not Found
```json
{
  "error": "Resource not found."
}
```

### 409 Conflict
```json
{
  "error": "Email already in use. or Not enough tickets available."
}
```

### 422 Unprocessable Entity
```json
{
  "errors": [
    {
      "type": "field",
      "value": "invalid_email",
      "msg": "Valid email is required.",
      "path": "email",
      "location": "body"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error."
}
```

---

## Data Models

### User
```typescript
{
  id: UUID,
  name: string,
  email: string (unique),
  passwordHash: string,
  isVerified: boolean,
  role: 'USER' | 'ADMIN' | 'SCANNER',
  createdAt: DateTime
}
```

### Event
```typescript
{
  id: UUID,
  title: string,
  description?: string,
  startTime: DateTime,
  endTime: DateTime,
  location?: string,
  createdBy?: UUID (User ID),
  createdAt: DateTime
}
```

### TicketTier
```typescript
{
  id: UUID,
  eventId: UUID,
  name: string,
  price: Decimal,
  totalCapacity: number,
  availableQty: number
}
```

### Order
```typescript
{
  id: UUID,
  userId: UUID,
  tierId: UUID,
  quantity: number,
  totalAmount: Decimal,
  stripeSessionId?: string,
  stripePaymentIntent?: string,
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED',
  expiresAt: DateTime (PENDING orders expire after 10 mins),
  createdAt: DateTime
}
```

### Ticket
```typescript
{
  id: UUID (This is the QR code payload),
  orderId: UUID,
  ticketTierId: UUID,
  userId: UUID,
  status: 'VALID' | 'CHECKED_IN' | 'CANCELLED',
  scannedAt?: DateTime,
  createdAt: DateTime
}
```

---

## Implementation Notes

### Security
- All passwords are hashed with bcryptjs (12 rounds)
- JWT tokens: Access (15min), Refresh (7 days)
- OTP emails expire after 15 minutes
- Password reset tokens expire after 1 hour
- Stripe webhook signatures are verified server-side
- RBAC enforced on all protected routes

### Concurrency
- Ticket inventory is decremented atomically in a Prisma transaction
- Orders that expire automatically restore inventory via cron job (every minute)
- Duplicate scan detection prevents double-entry

### Email
- HTML-formatted transactional emails
- PDF tickets attached to confirmation emails
- All emails include QR codes for scanning

### QR Codes
- Ticket UUID (v4) is the secure QR payload
- Each ticket's QR code is unique and cryptographically secure
- QR codes are Base64-encoded in API responses

---

## Testing the API

### Quick Start
1. Register: `POST /api/auth/register`
2. Verify email: `POST /api/auth/verify-email` (check console for OTP in dev)
3. Login: `POST /api/auth/login`
4. Get events: `GET /api/events`
5. Create order: `POST /api/orders`
6. Create checkout session: `POST /api/stripe/create-session`
7. Use Stripe test card: `4242 4242 4242 4242` (any future date, any CVC)

### Stripe Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

