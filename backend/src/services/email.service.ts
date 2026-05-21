import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Send OTP Verification Email ──────────────────────────────────────────────
export async function sendVerificationEmail(
  email: string,
  name: string,
  otp: string
): Promise<void> {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify your Banglafest account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Welcome to Banglafest, ${name}!</h2>
        <p>Please use the following verification code to activate your account:</p>
        <div style="background: #f4f4f4; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #e94560;">${otp}</span>
        </div>
        <p>This code expires in ${process.env.OTP_EXPIRES_IN_MINUTES || 15} minutes.</p>
        <p style="color: #666; font-size: 12px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
}

// ─── Send Password Reset Email ────────────────────────────────────────────────
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset your Banglafest password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Password Reset Request</h2>
        <p>Hi ${name}, we received a request to reset your password.</p>
        <p>Click the button below to reset it. This link expires in 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: #e94560; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
      </div>
    `,
  });
}

// ─── Send Password Changed Confirmation Email ─────────────────────────────────
export async function sendPasswordChangedEmail(email: string, name: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your Banglafest password has been changed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">🎟️ Banglafest</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1a1a2e;">Password Changed</h2>
          <p>Hi ${name},</p>
          <p>Your Banglafest account password was successfully changed.</p>
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <strong>⚠️ Wasn't you?</strong> If you did not make this change, reset your password immediately using the link below.
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/forgot-password"
               style="background: #e94560; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Reset Password
            </a>
          </div>
        </div>
      </div>
    `,
  });
}

// ─── Send Order Expired Email ─────────────────────────────────────────────────
export async function sendOrderExpiredEmail(
  email: string,
  name: string,
  expiredInfo: {
    eventTitle: string;
    tierName: string;
    quantity: number;
  }
): Promise<void> {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your Banglafest ticket reservation has expired',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">🎟️ Banglafest</h1>
          <p style="margin: 8px 0 0; opacity: 0.8;">Reservation Expired</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Your reservation for <strong>${expiredInfo.quantity} × ${expiredInfo.tierName}</strong> ticket${expiredInfo.quantity > 1 ? 's' : ''} for <strong>${expiredInfo.eventTitle}</strong> has expired because the checkout was not completed within 10 minutes.</p>
          <p>The held tickets have been released back to general availability. If you still want to attend, you're welcome to start a new checkout.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/events"
               style="background: #e94560; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              View Available Tickets
            </a>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Tickets are limited — don't wait too long next time!
          </p>
        </div>
      </div>
    `,
  });
}

// ─── Send Ticket Confirmation Email with Invoice ────────────────────────────
export async function sendTicketConfirmationEmail(
  email: string,
  name: string,
  tickets: Array<{ ticketId: string; pdfBuffer: Buffer }>,
  orderInfo: {
    orderId: string;
    eventTitle: string;
    tierName: string;
    eventDate: Date;
    eventStartTime: Date;
    eventVenue: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }
): Promise<void> {
  const attachments = tickets.map((t, i) => ({
    filename: `banglafest-ticket-${i + 1}.pdf`,
    content: t.pdfBuffer,
    contentType: 'application/pdf',
  }));

  const ticketCount = tickets.length;
  const eventDateStr = orderInfo.eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const eventTimeStr = orderInfo.eventStartTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const invoiceDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Your Banglafest Ticket${ticketCount > 1 ? 's are' : ' is'} confirmed! 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <!-- Header -->
        <div style="background: #1a1a2e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <img src="${process.env.FRONTEND_URL}/banglafest%20logo.png" alt="Banglafest Logo" style="max-width: 120px; height: auto; margin-bottom: 15px;">
          <h1 style="margin: 0;">Banglafest</h1>
          <p style="margin: 8px 0 0; opacity: 0.8;">Your ticket${ticketCount > 1 ? 's are' : ' is'} confirmed!</p>
        </div>

        <!-- Content -->
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Thank you for your purchase! Your order details are below.</p>

          <!-- Invoice Section -->
          <div style="background: white; border: 1px solid #ddd; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #e94560;">
              <div>
                <p style="margin: 0; color: #666; font-size: 12px;">ORDER NUMBER</p>
                <p style="margin: 5px 0 0; font-weight: bold; font-size: 13px; color: #1a1a2e;">${orderInfo.orderId}</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; color: #666; font-size: 12px;">ORDER DATE</p>
                <p style="margin: 5px 0 0; font-weight: bold; color: #1a1a2e;">${invoiceDate}</p>
              </div>
            </div>

            <!-- Customer Info -->
            <div style="margin-bottom: 20px;">
              <p style="margin: 0; color: #666; font-size: 12px;">BILL TO:</p>
              <p style="margin: 5px 0 0; font-weight: bold; color: #1a1a2e;">${name}</p>
              <p style="margin: 3px 0 0; color: #666; font-size: 14px;">${email}</p>
            </div>

            <!-- Event Details -->
            <div style="background: #f0f0f0; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #1a1a2e; font-size: 14px;">EVENT DETAILS</p>
              <table style="width: 100%; font-size: 14px;">
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 8px 0; color: #666;">Event:</td>
                  <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #1a1a2e;">${orderInfo.eventTitle}</td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 8px 0; color: #666;">Date:</td>
                  <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #1a1a2e;">${eventDateStr}</td>
                </tr>
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 8px 0; color: #666;">Start Time:</td>
                  <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #1a1a2e;">${eventTimeStr}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Venue:</td>
                  <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #1a1a2e;">${orderInfo.eventVenue || 'TBD'}</td>
                </tr>
              </table>
            </div>

            <!-- Ticket Summary Table -->
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #1a1a2e; color: white;">
                  <th style="padding: 12px; text-align: left;">Description</th>
                  <th style="padding: 12px; text-align: center;">Qty</th>
                  <th style="padding: 12px; text-align: right;">Unit Price</th>
                  <th style="padding: 12px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 12px; color: #1a1a2e;">${orderInfo.tierName} Ticket${ticketCount > 1 ? 's' : ''}</td>
                  <td style="padding: 12px; text-align: center; color: #1a1a2e;">${orderInfo.quantity}</td>
                  <td style="padding: 12px; text-align: right; color: #1a1a2e;">£${orderInfo.unitPrice.toFixed(2)}</td>
                  <td style="padding: 12px; text-align: right; color: #1a1a2e;">£${(orderInfo.unitPrice * orderInfo.quantity).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <!-- Total Amount -->
            <div style="text-align: right; padding-top: 15px; border-top: 2px solid #e94560;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">TOTAL AMOUNT</p>
              <p style="margin: 0; font-size: 28px; font-weight: bold; color: #e94560;">£${orderInfo.totalAmount.toFixed(2)}</p>
              <p style="margin: 5px 0 0; color: #666; font-size: 12px;">Order Status: <strong>Completed</strong></p>
            </div>
          </div>

          <!-- Entry Instructions -->
          <div style="background: #e8f4f8; border: 1px solid #0066cc; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #0066cc; font-size: 16px;">✓ Entry Instructions</h3>
            <p style="margin: 0 0 12px 0; color: #1a1a2e;">You can bring this ticket in two ways:</p>
            <ol style="margin: 0 0 15px 0; padding-left: 20px; color: #1a1a2e;">
              <li style="margin-bottom: 8px;"><strong>Printed Copy</strong> — Print this email or the attached PDF and present at entry</li>
              <li><strong>Digital Copy</strong> — Show the QR code on your mobile phone at entry</li>
            </ol>
            <p style="margin: 12px 0; color: #666; font-size: 14px;"><strong>Each QR code is unique and can only be scanned once.</strong> Do not share your QR code with others.</p>
          </div>

          <!-- Event Day Info -->
          <div style="background: #f0f0f0; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #1a1a2e;">📍 On Event Day</p>
            <p style="margin: 0 0 8px 0; color: #666;"><strong>Date:</strong> ${eventDateStr}</p>
            <p style="margin: 0 0 8px 0; color: #666;"><strong>Start Time:</strong> ${eventTimeStr}</p>
            <p style="margin: 0; color: #666;"><strong>Venue:</strong> ${orderInfo.eventVenue || 'Location TBD'}</p>
          </div>

          <!-- Lost Ticket Notice -->
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #856404;">⚠️ Lost Your Ticket?</p>
            <p style="margin: 0 0 8px 0; color: #856404; font-size: 14px;">If you lose your ticket on event day, please speak to the <strong>Entry Managing Team</strong> at the venue.</p>
            <p style="margin: 0 0 8px 0; color: #856404; font-size: 14px;">We will need your <strong>registered email address</strong> to verify your ticket in our system:</p>
            <p style="margin: 0; color: #856404; font-weight: bold; font-size: 14px;">Email: <strong>${email}</strong></p>
          </div>

          <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
            See you at the festival! 🎉
          </p>
        </div>
      </div>
    `,
    attachments,
  });
}

// ─── Send Attendee OTP Email (Sales flow) ─────────────────────────────────────
export async function sendAttendeeOtpEmail(
  email: string,
  name: string,
  otp: string
): Promise<void> {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your Banglafest ticket purchase verification code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <img src="${process.env.FRONTEND_URL}/banglafest%20logo.png" alt="Banglafest Logo" style="max-width: 100px; height: auto; margin-bottom: 15px;">
          <h1 style="margin: 0;">Banglafest</h1>
          <p style="margin: 8px 0 0; opacity: 0.8;">Ticket Purchase Verification</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1a1a2e;">Hi ${name},</h2>
          <p>A Banglafest sales executive is purchasing tickets on your behalf. Please share the verification code below with them:</p>
          <div style="background: #f4f4f4; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f26522;">${otp}</span>
          </div>
          <p>This code expires in ${process.env.OTP_EXPIRES_IN_MINUTES || 15} minutes.</p>
          <p style="color: #666; font-size: 12px;">If you did not request this, please ignore this email.</p>
        </div>
      </div>
    `,
  });
}


