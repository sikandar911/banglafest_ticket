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

// ─── Send Welcome Email ───────────────────────────────────────────────────────
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to Banglafest — you\'re all set! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">🎟️ Banglafest</h1>
          <p style="margin: 8px 0 0; opacity: 0.8;">Your account is verified!</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1a1a2e;">Welcome, ${name}! 🎉</h2>
          <p>Your email has been verified and your Banglafest account is ready to go.</p>
          <p>You can now browse events, purchase tickets, and manage your orders from your dashboard.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/events"
               style="background: #e94560; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Browse Events
            </a>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you did not create this account, please contact us immediately.
          </p>
        </div>
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

// ─── Send Refund Confirmation Email ───────────────────────────────────────────
export async function sendRefundConfirmationEmail(
  email: string,
  name: string,
  refundInfo: {
    orderId: string;
    amount: number;
    eventTitle: string;
    tierName: string;
    quantity: number;
  }
): Promise<void> {
  const formattedAmount = refundInfo.amount.toFixed(2);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Your Banglafest refund of $${formattedAmount} has been processed`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">🎟️ Banglafest</h1>
          <p style="margin: 8px 0 0; opacity: 0.8;">Refund Confirmation</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Your refund has been successfully processed. Here are the details:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 0; color: #666;">Order ID</td>
              <td style="padding: 10px 0; font-weight: bold; text-align: right;">${refundInfo.orderId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 0; color: #666;">Event</td>
              <td style="padding: 10px 0; font-weight: bold; text-align: right;">${refundInfo.eventTitle}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 0; color: #666;">Ticket Tier</td>
              <td style="padding: 10px 0; font-weight: bold; text-align: right;">${refundInfo.tierName} × ${refundInfo.quantity}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #666;">Refund Amount</td>
              <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #e94560; font-size: 18px;">$${formattedAmount}</td>
            </tr>
          </table>
          <p>The refund will appear on your original payment method within <strong>5–10 business days</strong> depending on your bank.</p>
          <p>Your tickets for this order have been cancelled and are no longer valid.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Questions? Visit your account at <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a>.
          </p>
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

// ─── Send Ticket Confirmation Email ───────────────────────────────────────────
export async function sendTicketConfirmationEmail(
  email: string,
  name: string,
  tickets: Array<{ ticketId: string; pdfBuffer: Buffer }>,
  eventInfo: {
    eventTitle: string;
    tierName: string;
    eventDate: Date;
  }
): Promise<void> {
  const attachments = tickets.map((t, i) => ({
    filename: `banglafest-ticket-${i + 1}.pdf`,
    content: t.pdfBuffer,
    contentType: 'application/pdf',
  }));

  const ticketCount = tickets.length;
  const eventDateStr = eventInfo.eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Your Banglafest Ticket${ticketCount > 1 ? 's are' : ' is'} confirmed! 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">🎟️ Banglafest</h1>
          <p style="margin: 8px 0 0; opacity: 0.8;">Your ticket${ticketCount > 1 ? 's are' : ' is'} confirmed!</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Thank you for your purchase! Your ${ticketCount} x <strong>${eventInfo.tierName}</strong> ticket${ticketCount > 1 ? 's' : ''} for <strong>${eventInfo.eventTitle}</strong> on <strong>${eventDateStr}</strong> ${ticketCount > 1 ? 'are' : 'is'} attached as PDF${ticketCount > 1 ? 's' : ''} to this email.</p>
          <p>Please present the QR code at the gate for entry.</p>
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <strong>⚠️ Important:</strong> Each QR code is unique and can only be scanned once.
          </div>
          <p>See you at the festival! 🎉</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Lost your ticket? Log in to your account at <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a> to re-download it.
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
          <h1 style="margin: 0;">🎟️ Banglafest</h1>
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

// ─── Send Staff Welcome Email ─────────────────────────────────────────────────
export async function sendStaffWelcomeEmail(
  email: string,
  name: string,
  role: string,
  tempPassword: string
): Promise<void> {
  const roleLabel = role === 'SALES_EXECUTIVE' ? 'Sales Executive' : 'Scanner';
  const loginUrl = `${process.env.FRONTEND_URL}/login`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `You've been added to Banglafest as a ${roleLabel}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">🎟️ Banglafest</h1>
          <p style="margin: 8px 0 0; opacity: 0.8;">Staff Account Created</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1a1a2e;">Welcome, ${name}!</h2>
          <p>An admin has created a <strong>${roleLabel}</strong> account for you on Banglafest.</p>
          <p>Here are your login credentials:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 0; color: #666;">Email</td>
              <td style="padding: 10px 0; font-weight: bold;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #666;">Password</td>
              <td style="padding: 10px 0; font-weight: bold; color: #f26522;">${tempPassword}</td>
            </tr>
          </table>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}"
               style="background: #f26522; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Log In Now
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">For security, please change your password after your first login.</p>
        </div>
      </div>
    `,
  });
}
