import api from './client';
import type { AuthTokens } from '../types';

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ message: string; userId: string }>('/api/auth/register', data),

  verifyEmail: (data: { email: string; otp: string }) =>
    api.post<{ message: string; accessToken?: string; refreshToken?: string; user?: import('../types').User }>('/api/auth/verify-email', data),

  resendOtp: (email: string) =>
    api.post<{ message: string }>('/api/auth/resend-otp', { email }),

  login: (data: { email: string; password: string }) =>
    api.post<AuthTokens>('/api/auth/login', data),

  logout: (refreshToken: string) =>
    api.post('/api/auth/logout', { refreshToken }),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/api/auth/forgot-password', { email }),

  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post<{ message: string }>('/api/auth/reset-password', data),

  checkEmail: (email: string) =>
    api.post<{ available: boolean }>('/api/auth/check-email', { email }),
};
