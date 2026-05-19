// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SCANNER' | 'SALES_EXECUTIVE';
  isVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ─── Events ───────────────────────────────────────────────────────────────────
export interface Performer {
  name: string;
  ticketDisplayName: string;
}

export interface SpecialAddition {
  name: string;
  description: string;
  ticketDisplayText: string;
}

export type AvailabilityStatus = 'AVAILABLE' | 'SELLING_FAST' | 'ONLY_A_FEW_LEFT' | 'SOLD_OUT';

export interface TicketTier {
  id: string;
  name: string;
  price: number;
  totalCapacity: number;
  availableQty: number;
  availabilityStatus: AvailabilityStatus;
  description?: string;
  features?: string[];
  maxPerPerson: number;
  eventId: string;
  promoDiscountAmount?: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  imageUrl?: string;
  performers?: Performer[];
  specialAdditions?: SpecialAddition[];
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
  isBypassed?: boolean;
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
  salesExecRevenue?: number;
  salesExecOrders?: number;
  salesExecTickets?: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SCANNER' | 'SALES_EXECUTIVE';
  isVerified: boolean;
  createdAt: string;
  _count?: { orders: number; tickets: number };
}

// ─── Promo Codes ─────────────────────────────────────────────────────────────
export interface PromoCode {
  id: string;
  code: string;
  influencerName: string;
  socialMedia?: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  events?: Array<{
    event: { id: string; title: string };
  }>;
  _count?: { orders: number };
}

// ─── Scanner ──────────────────────────────────────────────────────────────────
export interface ScanResponse {
  valid: boolean;
  reason: 'VALID' | 'ALREADY_USED' | 'CANCELLED' | 'INVALID_TICKET';
  message: string;
  ticket?: {
    id?: string;
    holder?: string;
    email?: string;
    tier?: string;
    event?: string;
    isBypassed?: boolean;
    scannedAt?: string;
    checkedInAt?: string;
    eventDate?: string;
    location?: string;
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

// ─── Sales Executive ──────────────────────────────────────────────────────────
export type PaymentMethod = 'ONLINE' | 'CASH' | 'CARD_MACHINE';

export interface SaleTicket {
  id: string;
  orderId: string;
  status: string;
  scannedAt?: string;
  createdAt: string;
}

export interface SaleOrder {
  id: string;
  quantity: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  event: { id: string; title: string; startTime: string; location?: string };
  tier: { id: string; name: string; price: number };
  tickets: SaleTicket[];
}

export interface SalesCustomer {
  attendeeId: string;
  attendeeName: string;
  attendeeEmail: string;
  totalTickets: number;
  totalSpent: number;
  orders: SaleOrder[];
}
