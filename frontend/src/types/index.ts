// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SCANNER';
  isVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ─── Events ───────────────────────────────────────────────────────────────────
export type AvailabilityStatus = 'AVAILABLE' | 'SELLING_FAST' | 'ONLY_A_FEW_LEFT' | 'SOLD_OUT';

export interface TicketTier {
  id: string;
  name: string;
  price: number;
  totalCapacity: number;
  availableQty: number;
  availabilityStatus: AvailabilityStatus;
  description?: string;
  eventId: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  imageUrl?: string;
  ticketTiers: TicketTier[];
  createdAt: string;
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Order {
  id: string;
  userId: string;
  tierId: string;
  quantity: number;
  totalAmount: number;
  status: OrderStatus;
  expiresAt: string;
  createdAt: string;
  stripeSessionId?: string;
  tier?: TicketTier & { event: Event };
  tickets?: Ticket[];
  _count?: { tickets: number };
}

// ─── Tickets ──────────────────────────────────────────────────────────────────
export interface Ticket {
  id: string;
  uuid: string;
  orderId: string;
  userId: string;
  holderName?: string;
  scannedAt?: string;
  createdAt: string;
  order?: {
    id: string;
    quantity: number;
    totalAmount: number;
    tier: TicketTier & { event: Event };
  };
  qrDataUrl?: string;
}

// ─── Admin ────────────────────────────────────────────────────────────────────
export interface RevenueData {
  totalRevenue: number;
  netRevenue: number;
  refundedAmount: number;
  totalOrders: number;
  paidOrders: number;
  refundedOrders: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SCANNER';
  isVerified: boolean;
  createdAt: string;
  _count?: { orders: number; tickets: number };
}

// ─── Scanner ──────────────────────────────────────────────────────────────────
export type ScanResult = 'VALID' | 'ALREADY_USED' | 'CANCELLED' | 'NOT_FOUND';

export interface ScanResponse {
  result: ScanResult;
  message: string;
  ticket?: {
    id: string;
    uuid: string;
    holderName?: string;
    event: string;
    tier: string;
    scannedAt?: string;
  };
}

// ─── API Pagination ───────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  error?: string;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}
