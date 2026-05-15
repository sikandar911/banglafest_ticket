import api from './client';

export const stripeApi = {
  createPaymentIntent: (orderId: string) =>
    api.post<{ clientSecret: string }>('/api/stripe/create-payment-intent', { orderId }),

  createCheckoutSession: (orderId: string) =>
    api.post<{ checkoutUrl: string; sessionId: string }>('/api/stripe/create-session', { orderId }),
};
