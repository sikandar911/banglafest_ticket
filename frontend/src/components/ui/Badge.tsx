import type { AvailabilityStatus } from '../../types';

const map: Record<AvailabilityStatus, { label: string; cls: string }> = {
  AVAILABLE: { label: 'Available', cls: 'badge-available' },
  SELLING_FAST: { label: 'Selling Fast', cls: 'badge-selling-fast' },
  ONLY_A_FEW_LEFT: { label: 'Only a Few Left', cls: 'badge-few-left' },
  SOLD_OUT: { label: 'Sold Out', cls: 'badge-sold-out' },
};

export function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  const { label, cls } = map[status] ?? map.SOLD_OUT;
  return <span className={cls}>{label}</span>;
}

const statusMap: Record<string, string> = {
  PENDING: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900 text-yellow-300',
  PAID: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300',
  FAILED: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-300',
  REFUNDED: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400',
};

export function OrderStatusBadge({ status }: { status: string }) {
  return <span className={statusMap[status] ?? statusMap.FAILED}>{status}</span>;
}

const roleMap: Record<string, string> = {
  USER: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-300',
  ADMIN: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900 text-purple-300',
  SCANNER: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-900 text-teal-300',
  SALES_EXECUTIVE: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-900 text-orange-300',
};

export function RoleBadge({ role }: { role: string }) {
  return <span className={roleMap[role] ?? roleMap.USER}>{role}</span>;
}
