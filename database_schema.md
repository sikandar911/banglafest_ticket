# Database Schema for Ticketing System
*Recommended Database: PostgreSQL*

This schema is designed to handle concurrency (preventing overselling), secure ticket validation, and integration with Stripe.

## 1. `users` Table
Stores authentication and profile data. Role-based access dictates what they can do.

| Column | Type | Constraints / Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `name` | VARCHAR | |
| `email` | VARCHAR | UNIQUE, NOT NULL |
| `password_hash` | VARCHAR | NOT NULL |
| `is_verified` | BOOLEAN | Default: FALSE |
| `role` | ENUM | 'USER', 'ADMIN', 'SCANNER'. Default: 'USER' |
| `created_at` | TIMESTAMP | Default: NOW() |

## 2. `events` Table
Stores details about the annual events.

| Column | Type | Constraints / Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `title` | VARCHAR | NOT NULL |
| `description` | TEXT | |
| `start_time` | TIMESTAMP | NOT NULL |
| `end_time` | TIMESTAMP | NOT NULL |
| `location` | VARCHAR | |
| `created_by` | UUID | Foreign Key -> `users.id` |
| `created_at` | TIMESTAMP | Default: NOW() |

## 3. `ticket_tiers` Table
Defines the types of tickets available for an event (e.g., VIP, General Admission) and manages inventory.

| Column | Type | Constraints / Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `event_id` | UUID | Foreign Key -> `events.id` |
| `name` | VARCHAR | e.g., "Early Bird", "VIP" |
| `price` | DECIMAL | e.g., 50.00 |
| `total_capacity`| INTEGER | Total tickets initially available |
| `available_qty` | INTEGER | Current availability (Updated securely via transactions) |

## 4. `orders` Table
Tracks checkout sessions and Stripe payment status.

| Column | Type | Constraints / Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `user_id` | UUID | Foreign Key -> `users.id` |
| `total_amount` | DECIMAL | Total amount billed |
| `stripe_session_id`| VARCHAR | Stripe Checkout Session ID |
| `stripe_payment_intent`| VARCHAR| Stripe Payment Intent ID (for refunds) |
| `status` | ENUM | 'PENDING', 'PAID', 'FAILED', 'REFUNDED' |
| `expires_at` | TIMESTAMP | When the cart lock expires (e.g., created_at + 10 mins) |
| `created_at` | TIMESTAMP | Default: NOW() |

## 5. `tickets` Table
The actual instances of tickets purchased. **The `id` here is what gets turned into a QR code.**

| Column | Type | Constraints / Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key (This is the secure string for the QR Code) |
| `order_id` | UUID | Foreign Key -> `orders.id` |
| `ticket_tier_id`| UUID | Foreign Key -> `ticket_tiers.id` |
| `user_id` | UUID | Foreign Key -> `users.id` |
| `status` | ENUM | 'VALID', 'CHECKED_IN', 'CANCELLED' |
| `scanned_at` | TIMESTAMP | NULL until scanned at the gate |
| `created_at` | TIMESTAMP | Default: NOW() |

---
### Key Relationship Notes for Development:
1. **Concurrency Control:** When an order is created (`PENDING`), you must decrement `available_qty` in `ticket_tiers`. If the `orders.expires_at` time passes without the order status turning to `PAID`, a background job (or trigger) must release those tickets back to `available_qty`.
2. **QR Code Security:** The `id` in the `tickets` table uses UUID (v4) which generates a cryptographically secure 36-character string. This string is embedded directly into the QR code. When scanned, the backend queries `SELECT status FROM tickets WHERE id = [QR_DATA]`.
