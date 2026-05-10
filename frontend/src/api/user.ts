import api from './client';
import type { User, Ticket, Order } from '../types';

export const userApi = {
  getProfile: () => api.get<{ user: User }>('/api/users/me'),

  getMyTickets: () => api.get<{ tickets: Ticket[] }>('/api/users/me/tickets'),

  getMyOrders: () => api.get<{ orders: Order[] }>('/api/users/me/orders'),

  downloadTicketPdf: (ticketId: string) =>
    api.get(`/api/users/me/tickets/${ticketId}/pdf`, { responseType: 'blob' }),
};
