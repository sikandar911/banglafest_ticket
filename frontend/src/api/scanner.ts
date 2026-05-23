import api from './client';
import type { ScanResponse } from '../types';

export type SearchResult = {
  ticketId: string;
  holder: string;
  email: string;
  tier: string;
  event: string;
  eventDate: string;
  isBypassed: boolean;
  status: 'VALID' | 'CHECKED_IN' | 'CANCELLED';
  scannedAt: string | null;
};

export const scannerApi = {
  scan: (ticketId: string) =>
    api.post<ScanResponse>('/api/scanner/scan', { ticketId }),

  search: (query: string) =>
    api.get<{ results: SearchResult[]; count: number }>('/api/scanner/search', { params: { q: query } }),

  toggleInStatus: (ticketId: string) =>
    api.post<{ success: boolean; inStatus: boolean; message: string }>('/api/scanner/toggle-in-status', { ticketId }),
};
