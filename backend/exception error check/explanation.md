# Scenario Explanation: Failed Ticket Purchase for Abdullah Al Numan

This document details the investigation, root causes, and remediation actions taken for the failed ticket purchase incident involving order ID `b3f5755a-7a51-4e97-a2a8-4a0377a24a4e`.

---

## 1. The Incident
* **Customer Name:** ABDULLAH AL NUMAN (`abdullah212numan@gmail.com`)
* **Purchase Attempted:** 2 tickets for the "General First Floor" tier
* **Price Paid:** £30 (originally £50, reduced by £20 using promo code `STUDENT`)
* **Customer Experience:** Paid successfully via Stripe, but the order status showed `FAILED` in the dashboard, and no tickets were issued to the customer.

---

## 2. Root Cause Analysis
The failure was caused by a combination of three distinct issues:

### A. Order Expiry vs. Payment Delay (Primary Trigger)
When an order is created, the backend sets a tight **10-minute expiry window** (defined in [order.controller.ts](file:///d:/Sikku%20works/Ambrosian/banglafest_ticket/backend/src/controllers/order.controller.ts)). 
1. The order was created at `14:11:23 UTC`.
2. The order was scheduled to expire at `14:21:23 UTC`.
3. Meanwhile, the background cron job ([expireOrders.ts](file:///d:/Sikku%20works/Ambrosian/banglafest_ticket/backend/src/jobs/expireOrders.ts)) runs every minute. Since the customer took slightly over 10 minutes to complete the secure payment process on Stripe, the cron job checked the database, saw the order was still `PENDING` past `14:21:23 UTC`, and automatically marked it as `FAILED`.
4. When the customer's payment finalized and the frontend attempted to confirm the order, the system rejected it because the order was no longer `PENDING`.

### B. Mismatched Stripe Environment Keys (Critical Configuration Bug)
The backend `.env` was configured with a **Stripe Test Mode Key** (`sk_test_...`), whereas the frontend checkout utilized a **Stripe Live Mode Key** (as evidenced by a real charge matching intent `pi_3TsO6c2Moz7hPtBR1HDbI9NB`). 
* Because the backend was using a test environment key, any attempts to programmatically verify/retrieve the payment intent status failed (Stripe API error: `No such payment_intent`).

### C. Placeholder Stripe Webhook Secret (Missing Fallback)
The Stripe webhook secret in the environment file was set to:
```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret_here
```
Because of this, the server was unable to verify the signatures of Stripe webhook events. Even if the customer completed the payment, the automatic background fulfillment webhook (`stripeWebhook` inside [stripe.controller.ts](file:///d:/Sikku%20works/Ambrosian/banglafest_ticket/backend/src/controllers/stripe.controller.ts)) was throwing signature verification errors (`400 Bad Request`) instead of processing the success signal.

---

## 3. Scripts in this Folder

* **[investigate_order.js](file:///d:/Sikku%20works/Ambrosian/banglafest_ticket/backend/exception%20error%20check/investigate_order.js):** Queries the production database using Prisma to view the state of the order, user information, and ticket tier inventory.
* **[check_stripe.js](file:///d:/Sikku%20works/Ambrosian/banglafest_ticket/backend/exception%20error%20check/check_stripe.js):** Verifies the Stripe key compatibility and queries the Stripe API for payment status.
* **[fix_order_abdullah.js](file:///d:/Sikku%20works/Ambrosian/banglafest_ticket/backend/exception%20error%20check/fix_order_abdullah.js):** Fulfills the order in database transaction:
  * Transitions order status from `FAILED` to `PAID`.
  * Deducts 2 tickets from the tier inventory (restored by the cron job).
  * Creates 2 tickets in the database with the proper attendee names.
* **[verify_fix.js](file:///d:/Sikku%20works/Ambrosian/banglafest_ticket/backend/exception%20error%20check/verify_fix.js):** Verifies the final state of the tickets and orders.

---

## 4. Remediation Steps Taken
1. **Manual Database Correction:** Executed `fix_order_abdullah.js` to restore the order to `PAID` state, decrease inventory safely, and generate the 2 tickets.
2. **Next Action Required:** Resend the ticket emails through the admin panel (or trigger `POST /api/admin/orders/b3f5755a-7a51-4e97-a2a8-4a0377a24a4e/resend-ticket`).

---

## 5. Preventative Actions Recommended
* Update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in the production environment settings with live values immediately.
* Increase the order expiration window from 10 minutes to **30 minutes** in `order.controller.ts` to accommodate slow/multi-factor payment flows.
