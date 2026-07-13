import api from './client';
import type { SalesCustomer, Event } from '../types';

export const salesApi = {
  // Get available events for sale
  getEvents: () => api.get<{ events: Event[] }>('/api/sales/events'),

  // Step 1: Send OTP to attendee
  initiateSale: (data: { attendeeName: string; attendeeEmail: string }) =>
    api.post<{ message: string; attendeeId: string }>('/api/sales/initiate', data),

  // Step 2: Verify OTP
  verifyOtp: (data: { attendeeId: string; otp: string }) =>
    api.post<{
      message: string;
      saleToken: string;
      attendee: { id: string; name: string; email: string };
    }>('/api/sales/verify-otp', data),

  // Step 3: Complete sale
  completeSale: (data: {
    saleToken: string;
    tierId: string;
    quantity: number;
    paymentMethod: 'CASH' | 'CARD_MACHINE';
  }) =>
    api.post<{
      message: string;
      order: any;
      tickets: any[];
      attendee: { id: string; name: string; email: string };
      event: { title: string; location?: string; startTime: string };
      tier: { name: string; price: number };
    }>('/api/sales/complete', data),

  // Get customers list
  getCustomers: () => api.get<{ customers: SalesCustomer[] }>('/api/sales/customers'),

  // Download all tickets for a customer (or specific order) as PDF
  downloadCustomerTicketsPdf: (attendeeId: string, orderId?: string) =>
    api.get<Blob>(`/api/sales/customers/${attendeeId}/print-tickets`, {
      params: orderId ? { orderId } : undefined,
      responseType: 'blob',
    }),

  // Set attendee names for each ticket in an order (sales executive flow)
  setAttendeeNames: (orderId: string, names: string[]) =>
    api.patch<{ message: string }>(`/api/orders/${orderId}/attendee-names`, { names }),
};
