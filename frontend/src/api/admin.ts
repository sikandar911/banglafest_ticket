import api from './client';
import type { Event, TicketTier, AdminUser, Order, RevenueData } from '../types';

export const adminApi = {
  // Events
  createEvent: (data: Partial<Event>) =>
    api.post<{ event: Event }>('/api/admin/events', data),

  updateEvent: (id: string, data: Partial<Event>) =>
    api.put<{ event: Event }>(`/api/admin/events/${id}`, data),

  deleteEvent: (id: string) =>
    api.delete(`/api/admin/events/${id}`),

  // Tiers
  createTier: (eventId: string, data: Partial<TicketTier>) =>
    api.post<{ tier: TicketTier }>(`/api/admin/events/${eventId}/tiers`, data),

  updateTier: (tierId: string, data: Partial<TicketTier>) =>
    api.put<{ tier: TicketTier }>(`/api/admin/tiers/${tierId}`, data),

  // Revenue
  getRevenue: () => api.get<{ revenue: RevenueData }>('/api/admin/revenue'),

  // Users
  listUsers: (params?: { page?: number; limit?: number }) =>
    api.get<{ users: AdminUser[]; total: number }>('/api/admin/users', { params }),

  updateUserRole: (userId: string, role: string) =>
    api.put(`/api/admin/users/${userId}/role`, { role }),

  // Orders
  listOrders: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{ orders: Order[]; total: number; totalPages: number }>('/api/admin/orders', { params }),

  refundOrder: (orderId: string) =>
    api.post(`/api/admin/orders/${orderId}/refund`),

  resendTicket: (orderId: string) =>
    api.post(`/api/admin/orders/${orderId}/resend-ticket`),

  // Bypass - Book tickets without payment
  bypassBookTicket: (data: { userId: string; tierId: string; quantity: number }) =>
    api.post<{ order: Order; tickets: any[]; message: string }>('/api/admin/bypass', data),
};
