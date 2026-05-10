import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service';

const OTP_EXPIRES_MINUTES = parseInt(process.env.OTP_EXPIRES_IN_MINUTES || '15', 10);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signAccessToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'],
  });
}

function signRefreshToken(payload: { id: string }): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email already in use.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, otpCode: otp, otpExpiresAt },
    });

    await sendVerificationEmail(user.email, user.name, otp);

    res.status(201).json({
      message: 'Registration successful. Please check your email for the verification code.',
      userId: user.id,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Verify Email ─────────────────────────────────────────────────────────────

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, otp } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ error: 'Email already verified.' });
      return;
    }

    if (!user.otpCode || user.otpCode !== otp) {
      res.status(400).json({ error: 'Invalid OTP.' });
      return;
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      return;
    }

    await prisma.user.update({
      where: { email },
      data: { isVerified: true, otpCode: null, otpExpiresAt: null },
    });

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

// ─── Resend OTP ───────────────────────────────────────────────────────────────

export async function resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether user exists
      res.json({ message: 'If that email is registered, a new code has been sent.' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ error: 'Email already verified.' });
      return;
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    await prisma.user.update({ where: { email }, data: { otpCode: otp, otpExpiresAt } });
    await sendVerificationEmail(user.email, user.name, otp);

    res.json({ message: 'If that email is registered, a new code has been sent.' });
  } catch (err) {
    next(err);
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ error: 'Email not verified. Please verify your email first.' });
      return;
    }

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id });

    // Store hashed refresh token
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashedRefresh } });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      res.status(401).json({ error: 'No refresh token provided.' });
      return;
    }

    let decoded: { id: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: string };
    } catch {
      res.status(401).json({ error: 'Invalid or expired refresh token.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.refreshToken) {
      res.status(401).json({ error: 'Refresh token not found.' });
      return;
    }

    const tokenMatch = await bcrypt.compare(token, user.refreshToken);
    if (!tokenMatch) {
      res.status(401).json({ error: 'Refresh token mismatch.' });
      return;
    }

    const newAccessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const newRefreshToken = signRefreshToken({ id: user.id });
    const hashedRefresh = await bcrypt.hash(newRefreshToken, 10);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashedRefresh } });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken: token } = req.body;
    if (token) {
      let decoded: { id: string };
      try {
        decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: string };
        await prisma.user.update({ where: { id: decoded.id }, data: { refreshToken: null } });
      } catch {
        // Token invalid — still return success (token already unusable)
      }
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return same message to prevent user enumeration
    if (!user) {
      res.json({ message: 'If that email is registered, a reset link has been sent.' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { email },
      data: { resetToken, resetTokenExpiresAt },
    });

    await sendPasswordResetEmail(user.email, user.name, resetToken);

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, newPassword } = req.body;

    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiresAt: { gt: new Date() } },
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired reset token.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiresAt: null, refreshToken: null },
    });

    res.json({ message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    next(err);
  }
}
