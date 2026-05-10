# Ticketing System Feature Specification

## Phase 1: Core System Modules

### 1. Authentication & User Profile Module
* **User Registration & Login:** Sign up with Name, Email, and Password.
* **Email Verification:** Magic link or OTP sent to email to verify identity before allowing purchase. Customer User also will get a notification after purchasing ticktet from the application to his given email.
* **Account Recovery:** Forgot/Reset Password flow.

### 2. Event & Ticket Discovery Module (Public)
* **Event Listing:** Landing page displaying current and upcoming annual events.
* **Ticket Tier Display:** Show available ticket types (e.g., General Admission, VIP) and current availability status.

### 3. Checkout & Payment Module
* **Ticket Selection:** Users choose the ticket type and quantity.
* **Stripe Integration:** Secure payment processing using Stripe Checkout or Elements.
* **Order Confirmation:** Automatic redirect to a success page and the user's ticket dashboard.

### 4. User Dashboard Module
* **My Tickets:** View all purchased tickets with unique IDs and QR codes.
* **Downloadable Assets:** Ability to download tickets as PDFs.
* **Billing & Invoices:** View and download payment receipts.

### 5. Admin: Event Management Module
* **Event Builder:** Create and edit events (Name, Date, Location, Description).
* **Ticket Configuration:** Set ticket types, pricing, and total available capacity for each tier.

### 6. Admin: Finance & Reporting Module
* **Financial Dashboard:** View total revenue, synchronized with Stripe payout data.
* **User & Order Directory:** View lists of registered users, their purchase history, and order statuses.

### 7. Admin: On-Site Operations Module
* **QR Code Scanner:** A mobile-friendly web module (or separate app) to scan and validate ticket QR codes at the gate.
* **Manual Override:** Search for a user's ticket by their email address or name if they lose their QR code.

---

## Phase 2: Security, Safety & Smoothness

### 1. Inventory & Concurrency Protection
* **Ticket Reservation Lock:** "Lock" selected tickets for a short period (e.g., 10 minutes) during checkout to prevent overselling.
* **Real-Time Availability:** Display urgency indicators like "Selling Fast!" or "Only 5 Left!".

### 2. Advanced Security & Anti-Fraud Measures
* **Cryptographic QR Codes:** Use securely hashed strings (e.g., UUIDs) for ticket IDs instead of sequential numbers.
* **Duplicate Scan Prevention:** Immediate "Checked In" status upon first scan; flash "ALREADY USED" warning for subsequent scans.
* **Stripe Webhook Security:** Backend verification of Stripe Webhook Signatures to prevent fake payment signals.

### 3. Role-Based Access Control (RBAC)
* **Super Admin:** Full access to events, finances, users, and settings.
* **Scanner / Event Staff:** Restricted access to only the QR scanning module and manual ticket search.

### 4. Automated Communication
* **Transactional Emails:** Automated emails containing PDF tickets and invoices immediately after successful Stripe payment.

### 5. Order Management & Support
* **Refunds & Cancellations:** Trigger refunds via Stripe API directly from the admin dashboard (automatically invalidates the ticket).
* **Resend Ticket Button:** Quick action to re-email a ticket to a user.
