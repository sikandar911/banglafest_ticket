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
