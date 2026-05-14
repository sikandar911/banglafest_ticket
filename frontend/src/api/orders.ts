import api from './client';
import type { Order } from '../types';

export const ordersApi = {
  create: (data: { tierId: string; quantity: number }) =>
    api.post<{ orderId: string; totalAmount: number; expiresAt: string }>('/api/orders', data),

  confirm: (orderId: string) =>
    api.post<{ orderId: string }>(`/api/orders/${orderId}/confirm`),

  get: (id: string) => api.get<{ order: Order }>(`/api/orders/${id}`),
};
