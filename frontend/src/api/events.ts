import api from './client';
import type { Event } from '../types';

export const eventsApi = {
  list: () => api.get<{ events: Event[] }>('/api/events'),
  get: (id: string) => api.get<{ event: Event }>(`/api/events/${id}`),
};
