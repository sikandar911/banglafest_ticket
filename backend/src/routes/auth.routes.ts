import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import {
  register,
  verifyEmail,
  resendOtp,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  checkEmail,
} from '../controllers/auth.controller';

const router = Router();

// Strict limit for login — 10 attempts per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP endpoints — 5 requests per 30 min per IP (prevents OTP spam)
const otpLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,
  message: { error: 'Too many requests. Please try again in 30 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account. OTP will be sent to the email for verification.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Minimum 8 characters
 *                 minLength: 8
 *                 example: SecurePassword123
 *     responses:
 *       201:
 *         description: Registration successful - OTP sent to email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Registration successful. Please check your email for the verification code."
 *                 userId:
 *                   type: string
 *                   format: uuid
 *                   example: 550e8400-e29b-41d4-a716-446655440000
 *       409:
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email already in use."
 *       422:
 *         description: Validation error (invalid email, short password, etc)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: email
 *                       message:
 *                         type: string
 *                         example: Valid email is required.
 */
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters.'),
  ],
  validate,
  register
);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email with OTP
 *     description: Complete email verification using the OTP sent during registration. User can then login.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: john@example.com
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP sent to email
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email verified successfully. You can now log in."
 *       400:
 *         description: Invalid, expired, or missing OTP
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid or expired OTP."
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User not found."
 */
router.post(
  '/verify-email',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').trim().notEmpty().withMessage('OTP is required.'),
  ],
  validate,
  verifyEmail
);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP to email
 *     description: Request a new OTP if the previous one expired. Will send a new OTP to the registered email.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: OTP sent if email exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "If that email is registered, a new code has been sent."
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Valid email is required.
 */
router.post(
  '/resend-otp',
  otpLimiter,
  [body('email').isEmail().normalizeEmail()],
  validate,
  resendOtp
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user with email and password. Returns access and refresh tokens.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *                 example: SecurePassword123
 *     responses:
 *       200:
 *         description: Login successful - tokens returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token (valid for 15 minutes)
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNjI2MjkwNDAwLCJleHAiOjE2MjYyOTA5MDB9.signature
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token (valid for 7 days)
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImlhdCI6MTYyNjI5MDQwMCwiZXhwIjoxNjI2ODk1MjAwfQ.signature
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 550e8400-e29b-41d4-a716-446655440000
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: john@example.com
 *                     role:
 *                       type: string
 *                       enum: [USER, ADMIN, SCANNER]
 *                       example: USER
 *       401:
 *         description: Invalid credentials or email not verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid credentials or email not verified."
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Valid email is required.
 */
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').trim().notEmpty(),
  ],
  validate,
  login
);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Get a new access token using a refresh token. Returns new access and refresh tokens.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: JWT refresh token obtained from login
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImlhdCI6MTYyNjI5MDQwMCwiZXhwIjoxNjI2ODk1MjAwfQ.signature
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: New JWT access token
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNjI2MjkwNDAwLCJleHAiOjE2MjYyOTA5MDB9.signature
 *                 refreshToken:
 *                   type: string
 *                   description: New JWT refresh token
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImlhdCI6MTYyNjI5MDQwMCwiZXhwIjoxNjI2ODk1MjAwfQ.signature
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid or expired refresh token."
 */
router.post(
  '/refresh-token',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required.')],
  validate,
  refreshToken
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Invalidate the current session by blacklisting the refresh token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: JWT refresh token to invalidate
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImlhdCI6MTYyNjI5MDQwMCwiZXhwIjoxNjI2ODk1MjAwfQ.signature
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully."
 */
router.post(
  '/logout',
  [body('refreshToken').notEmpty()],
  validate,
  logout
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Send password reset link to the email address. Link expires in 1 hour.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Password reset link sent (if email exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "If that email is registered, a reset link has been sent."
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Valid email is required.
 */
router.post(
  '/forgot-password',
  otpLimiter,
  [body('email').isEmail().normalizeEmail()],
  validate,
  forgotPassword
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     description: Set a new password using the reset token received via email. Token expires in 1 hour.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token from email link
 *                 example: abc123def456ghi789...
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password (minimum 8 characters)
 *                 minLength: 8
 *                 example: NewSecurePassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset successfully. Please log in."
 *       400:
 *         description: Invalid, expired, or missing reset token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid or expired reset token."
 *       422:
 *         description: Validation error (password too short, etc)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Password must be at least 8 characters.
 */
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required.'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters.'),
  ],
  validate,
  resetPassword
);

/**
 * @swagger
 * /api/auth/check-email:
 *   post:
 *     summary: Check if email is available
 *     description: Check if an email address is already registered
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email to check
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Email availability status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                   example: true
 */
router.post(
  '/check-email',
  [body('email').isEmail().normalizeEmail()],
  validate,
  checkEmail
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password (authenticated)
 *     description: Change password for the currently logged-in user. Requires current password verification.
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: Current password
 *                 example: OldPassword123
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password (minimum 8 characters)
 *                 minLength: 8
 *                 example: NewPassword456
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password changed successfully."
 *       400:
 *         description: Invalid password or missing fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Current password is incorrect."
 *       401:
 *         description: Unauthorized - not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized. Please log in."
 */
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').trim().notEmpty().withMessage('Current password is required.'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters.'),
  ],
  validate,
  changePassword
);

export default router;
