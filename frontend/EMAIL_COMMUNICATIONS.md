# Banglafest Email Communications Documentation

## Overview
This document outlines all emails sent by the Banglafest ticketing system to customers, users, and staff members. It provides details about when each email is triggered, its purpose, content, and key information included.

**Email Service Provider:** Hostinger SMTP  
**From Address:** `connect@ambrosianuk.com`  
**System Name:** Banglafest Ticketing System

---

## Table of Contents
1. [Customer Registration & Onboarding Emails](#customer-registration--onboarding-emails)
2. [Account Management Emails](#account-management-emails)
3. [Ticket Purchase & Order Emails](#ticket-purchase--order-emails)
4. [Sales Executive Emails](#sales-executive-emails)

---

## Customer Registration & Onboarding Emails

### 1. Email Verification Code Email

**Trigger:** User completes registration form with email and password  
**To:** New user's email address  
**Subject:** `Verify your Banglafest account`

**Purpose:**  
Sends a 6-digit OTP (One-Time Password) for email verification during the registration process.

**Content Includes:**
- Personalized greeting with user's name
- 6-digit verification code in large, bold text
- Code expiration time (default: 15 minutes, configurable)
- Security notice: "If you did not request this, please ignore this email"

**When Sent:**
- After user submits registration form
- When user clicks "Resend Code" on verification page

**Example Flow:**
```
User Registration → Form Submitted → OTP Email Sent → User Enters Code → Email Verified
```

---

## Account Management Emails

### 3. Password Reset Email

**Trigger:** User clicks "Forgot Password" and enters their email  
**To:** User's registered email address  
**Subject:** `Reset your Banglafest password`

**Purpose:**  
Provides a secure link for users to reset their forgotten password.

**Content Includes:**
- Personalized greeting
- Password reset button with unique token link
- Link expiration time: 1 hour
- Security notice for unintended requests

**Link Format:**
```
{FRONTEND_URL}/reset-password?token={UNIQUE_RESET_TOKEN}
```

**When Sent:**
- When user submits email via "Forgot Password" form
- Sent immediately after request

**Security Features:**
- Token-based link (single-use)
- 1-hour expiration
- Cannot be accessed multiple times

---

### 4. Password Changed Confirmation Email

**Trigger:** User successfully changes their password (old password verified)  
**To:** User's email address  
**Subject:** `Your Banglafest password has been changed`

**Purpose:**  
Confirms password change and alerts user if the change was unauthorized.

**Content Includes:**
- Confirmation message
- Security warning box in yellow/orange
- "Wasn't you?" prompt with urgent action
- Link to reset password immediately
- Timestamp of change (implicit in email date)

**When Sent:**
- Immediately after password change is successful
- Only if change was made from authenticated account

**Security Features:**
- Alerts user of account changes
- Provides immediate action link if unauthorized
- Encourages immediate password reset if suspicious

---

## Ticket Purchase & Order Emails

### 5. Ticket Confirmation Email (With PDF Attachments & Invoice)

**Trigger:** Payment is successful and ticket PDF is generated  
**To:** Customer's email address  
**Subject:** `Your Banglafest Ticket(s) are confirmed! 🎉` (pluralized based on quantity)

**Purpose:**  
Delivers purchased tickets as PDF attachments with QR codes, event details, and HTML invoice.

**Content Includes:**

**1. HTML Invoice Section:**
- Invoice header with order number and date
- Customer name and email
- Event details table:
  - Event title (dynamic)
  - Event date and time (dynamic)
  - Event start time (dynamic)
  - Event venue location (dynamic)
  - Ticket tier name
  - Number of tickets purchased
  - Unit price per ticket
  - Total amount
- Payment method: "Paid via Stripe"
- Order status: "Completed"

**2. Entry Instructions:**
- "You can bring this ticket in two ways:"
  - **1. Printed Copy:** Print this email or attached PDF and present at entry
  - **2. Digital Copy:** Show QR code on your mobile phone at entry
- **Event Details:**
  - Event Name: [Dynamic]
  - Event Date: [Dynamic]
  - Start Time: [Dynamic]
  - Venue: [Dynamic venue address/location]
- **Lost Ticket Notice:**
  - "If you lose your ticket on event day, please speak to the Entry Managing Team at the venue."
  - "We will need your registered email address to verify your ticket in our system."
  - "Registered Email: [Customer's email]"

**3. QR Code Section:**
- Unique QR code for each ticket (scannable once at entry)
- Ticket ID reference
- **Important warning:** "Each QR code is unique and can only be scanned once. Do not share your QR code with others."

**Attachments:**
- PDF files (one per ticket): `banglafest-ticket-{number}.pdf`
- Each PDF contains:
  - Unique QR code (scannable at entry)
  - Event details with dynamic data
  - Ticket tier and pricing information
  - Ticket ID
  - Entry instructions (print or digital)
  - Entry managing team contact info

**When Sent:**
- After Stripe payment confirmation
- After ticket PDF generation is complete
- Within minutes of purchase

**Example Flow:**
```
User Completes Payment → Payment Processed → PDF Generated → Email Sent with Invoice & Attachments
```

**Dynamic Data Required:**
- Event title, date, time, start time
- Event venue/location
- Ticket tier name and quantity
- Unit price and total amount paid
- Unique QR code per ticket
- Customer email address

**Important Notes:**
- QR code is scannable ONLY ONCE (prevents duplicate entry)
- Each ticket is unique and personalized
- Invoice provides clear pricing breakdown
- Lost ticket recovery uses email verification
- Users can present either printed or digital copy

---

### 6. Order Expiration Email

**Trigger:** User abandons checkout (order expires after 10 minutes without payment)  
**To:** Customer's email address  
**Subject:** `Your Banglafest ticket reservation has expired`

**Purpose:**  
Notifies user that their ticket reservation has been released back to inventory due to incomplete checkout.

**Content Includes:**
- Event title and ticket details (tier, quantity)
- Expiration reason: "checkout not completed within 10 minutes"
- Message that tickets are released back to availability
- Encouragement to make a new purchase
- Call-to-action button: "View Available Tickets"

**When Sent:**
- 10 minutes after order is created (if not completed)
- Automatically by background job/cron task

**Example Scenario:**
```
1. Customer adds 2 VIP tickets to cart
2. Starts checkout but doesn't complete payment
3. After 10 minutes, order is marked as "expired"
4. Reservation removed, tickets released to general pool
5. Email sent notifying customer of expiration
```

---

## Sales Executive Emails

### 8. Attendee OTP Email (Sales Flow)

**Trigger:** Sales executive initiates a ticket purchase on behalf of customer  
**To:** Customer's email address (provided by sales executive)  
**Subject:** `Your Banglafest ticket purchase verification code`

**Purpose:**  
Sends OTP to customer for verification during sales executive-assisted purchase flow.

**Content Includes:**
- Explanation that sales executive is purchasing on their behalf
- Request to share verification code with sales executive
- 6-digit code in large, bold text
- Code expiration: 15 minutes (configurable)
- Security notice about ignoring if unsolicited

**When Sent:**
- During sales executive ticket purchase flow
- When OTP is generated for attendee verification
- Customer must provide code to complete purchase

**Example Flow:**
```
Sales Exec → Customer Email → OTP Sent → Customer Shares Code → Sales Exec Enters Code → Purchase Complete
```



---

## Email Configuration & Settings

### SMTP Configuration
```
Host: smtp.hostinger.com
Port: 465 (SSL/TLS)
User: connect@ambrosianuk.com
From: "Banglafest Tickets <connect@ambrosianuk.com>"
```

### Timing & Retry Logic
- **Immediate Emails:** Verification, welcome, password reset, ticket confirmation
- **Delayed Emails:** Order expiration (10 minutes), staff emails
- **Retry Policy:** Standard nodemailer retry on SMTP failures

### Environment Variables Required
```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=connect@ambrosianuk.com
SMTP_PASS=[PASSWORD]
EMAIL_FROM="Banglafest Tickets <connect@ambrosianuk.com>"
OTP_EXPIRES_IN_MINUTES=15
FRONTEND_URL=http://localhost:5173 (or production URL)
```

---

## Email Template Design Standards

### Consistent Elements Across All Emails
1. **Header:** Dark background (#1a1a2e) with Banglafest logo and tagline
2. **Main Content:** White/light background (#f9f9f9) for readability
3. **Buttons:** Brand color (#e94560) with hover effect
4. **Warnings:** Yellow background (#fff3cd) with border for security notices
5. **Footer:** Links to account dashboard and company contact

### Typography
- **Headings:** Bold, color #1a1a2e
- **Body Text:** Color #666 for secondary text
- **Emphasis:** Bold for important information
- **Links:** Brand color (#e94560 or #f26522) with underline

### Responsive Design
- Max-width: 500–600px for readability
- Mobile-friendly padding and spacing
- Large touch-friendly buttons (14px padding minimum)

---

## Customer Data Privacy in Emails

All emails comply with **UK GDPR and Data Protection Act 2018:**

### Data Handling
- No unnecessary personal data in subject lines
- Sensitive data (passwords, tokens) only in email body
- Links contain unique tokens, not user IDs or emails
- PDF attachments include unique QR codes (personal identifiers)

### Unsubscribe & Contact
- All transactional emails include support contact
- No unsubscribe link (transactional emails are mandatory)
- Customer support: connect@ambrosianuk.com

---

## Troubleshooting & Support

### Common Issues
| Issue | Cause | Solution |
|-------|-------|----------|
| OTP not received | SMTP failure | Check SMTP credentials in .env |
| Links not working | Incorrect FRONTEND_URL | Verify FRONTEND_URL in environment |
| Attachments missing | PDF generation failed | Check PDF service and disk space |
| Emails marked as spam | Email reputation | Use authenticated domain with SPF/DKIM |

### Testing Emails
To test email functionality:
1. Create a test account with development email
2. Trigger registration flow
3. Check inbox and spam folder
4. Verify all links are functional
5. Test PDF attachment download

---

## Summary Table

| Email Type | When Sent | Key Purpose | Attachments |
|-----------|-----------|------------|------------|
| Verification Code | User registers | Account activation | None |
| Password Reset | Forgot password | Reset link | None |
| Password Changed | User changes password | Confirmation & security alert | None |
| Ticket Confirmation | Payment successful | Deliver tickets with invoice | PDF ticket(s) with QR codes & invoice |
| Order Expired | 10 min after order creation | Notify reservation lapsed | None |
| Attendee OTP | Sales exec initiates purchase | Verification code | None |

---

## Contact & Support

**Email Support:** connect@ambrosianuk.com  
**Platform:** Banglafest Ticketing System  
**Last Updated:** May 21, 2026  
**Document Version:** 1.0
