import api from './client';
import type { Event, TicketTier, AdminUser, Order, RevenueData, PromoCode, SalesExecutiveBreakdown, TicketBreakdown, PromoBreakdown } from '../types';

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
  getRevenue: () => api.get<{
    revenue: RevenueData;
    salesExecutiveBreakdown: SalesExecutiveBreakdown[];
    ticketBreakdown?: TicketBreakdown;
    promoCodeBreakdown?: PromoBreakdown[];
  }>('/api/admin/revenue'),

  // Users
  listUsers: (params?: { page?: number; limit?: number }) =>
    api.get<{ users: AdminUser[]; total: number }>('/api/admin/users', { params }),

  createUser: (data: { name: string; email: string; role: string; password: string }) =>
    api.post<{ user: AdminUser }>('/api/admin/users', data),

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

  // Promo Codes
  listPromoCodes: () =>
    api.get<{ promoCodes: PromoCode[] }>('/api/admin/promo-codes'),

  createPromoCode: (data: {
    code: string;
    influencerName: string;
    socialMedia?: string;
    discountAmount?: number | null;
    eventIds: string[];
    startDate?: string | null;
    endDate?: string | null;
    isGroupPromo?: boolean;
    minTickets?: number;
    groupDiscounts?: Array<{ tierId: string; discountAmount: number }>;
  }) =>
    api.post<{ promoCode: PromoCode; warnings?: string[] }>('/api/admin/promo-codes', data),

  updatePromoCode: (id: string, data: {
    influencerName?: string;
    socialMedia?: string | null;
    discountAmount?: number | null;
    eventIds?: string[];
    startDate?: string | null;
    endDate?: string | null;
    isGroupPromo?: boolean;
    minTickets?: number;
    groupDiscounts?: Array<{ tierId: string; discountAmount: number }>;
  }) =>
    api.patch<{ promoCode: PromoCode; warnings?: string[] }>(`/api/admin/promo-codes/${id}`, data),

  togglePromoCode: (id: string) =>
    api.patch<{ promoCode: PromoCode }>(`/api/admin/promo-codes/${id}/toggle`),

  deletePromoCode: (id: string) =>
    api.delete(`/api/admin/promo-codes/${id}`),

  getPromoCodeOrders: (id: string) =>
    api.get<{
      promoCode: { id: string; code: string; influencerName: string };
      orders: Array<{
        id: string;
        createdAt: string;
        totalAmount: number;
        user: { name: string; email: string };
        tickets: Array<{
          id: string;
          attendeeName: string | null;
          ticketTier: { name: string };
        }>;
      }>;
    }>(`/api/admin/promo-codes/${id}/orders`),
};
