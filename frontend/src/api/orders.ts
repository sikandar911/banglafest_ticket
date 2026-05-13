import api from './client';
import type { Order } from '../types';

export const ordersApi = {
  create: (data: { tierId?: string; quantity?: number; tiers?: Record<string, number> }) =>
    api.post<{ order: Order }>('/api/orders', data),

  get: (id: string) => api.get<{ order: Order }>(`/api/orders/${id}`),
};
