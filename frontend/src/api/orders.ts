import api from './client';
import type { Order } from '../types';

export const ordersApi = {
  create: (data: { tierId: string; quantity: number; promoCode?: string }) =>
    api.post<{ orderId: string; totalAmount: number; discountAmount?: number; expiresAt: string }>('/api/orders', data),

  confirm: (orderId: string) =>
    api.post<{ orderId: string }>(`/api/orders/${orderId}/confirm`),

  get: (id: string) => api.get<{ order: Order }>(`/api/orders/${id}`),

  setAttendeeNames: (orderId: string, names: string[]) =>
    api.patch<{ message: string }>(`/api/orders/${orderId}/attendee-names`, { names }),
};
