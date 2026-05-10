import api from './client';
import type { ScanResponse, Ticket } from '../types';

export const scannerApi = {
  scan: (uuid: string) =>
    api.post<ScanResponse>('/api/scanner/scan', { uuid }),

  search: (query: string) =>
    api.get<{ tickets: Ticket[] }>('/api/scanner/search', { params: { q: query } }),
};
