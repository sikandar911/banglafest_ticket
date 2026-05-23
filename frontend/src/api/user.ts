import api from './client';
import type { User, Order } from '../types';

// Type for ticket response from /api/users/me/tickets
interface TicketResponse {
  id: string;
  status: 'VALID' | 'CHECKED_IN' | 'CANCELLED';
  scannedAt?: string;
  createdAt: string;
  attendeeName: string | null;
  qrCode: string;
  serialNumber?: number;
  event: { id: string; title: string; startTime: string; endTime: string; location?: string; imageUrl?: string };
  tier: { name: string; price: number; description?: string; features?: string[] };
  order: { id: string; status: string; totalAmount: number; isBypassed?: boolean; createdAt: string };
}

export const userApi = {
  getProfile: () => api.get<{ user: User }>('/api/users/me'),

  getMyTickets: () => api.get<{ tickets: TicketResponse[] }>('/api/users/me/tickets'),

  getMyOrders: () => api.get<{ orders: Order[] }>('/api/users/me/orders'),

  downloadTicketPdf: (ticketId: string) =>
    api.get(`/api/users/me/tickets/${ticketId}/pdf`, { responseType: 'blob' }),

  downloadAllTicketsPdf: () =>
    api.get('/api/users/me/tickets/print-all', { responseType: 'blob' }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/api/auth/change-password', {
      currentPassword,
      newPassword,
    }),
};
