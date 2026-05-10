import api from './client';

export const stripeApi = {
  createCheckoutSession: (orderId: string) =>
    api.post<{ checkoutUrl: string; sessionId: string }>('/api/stripe/create-session', { orderId }),
};
