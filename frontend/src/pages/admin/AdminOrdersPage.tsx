import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { PageSpinner } from '../../components/ui/Spinner';
import { OrderStatusBadge } from '../../components/ui/Badge';

const STATUSES = ['', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'];

export function AdminOrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [showBypassForm, setShowBypassForm] = useState(false);
  const [bypassForm, setBypassForm] = useState({ userId: '', tierId: '', quantity: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', { page, status }],
    queryFn: () => adminApi.listOrders({ page, limit: 20, status: status || undefined }).then((r) => r.data),
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events-for-bypass'],
    queryFn: () => adminApi.getRevenue().then(() => null), // Placeholder
  });

  const refundMutation = useMutation({
    mutationFn: (orderId: string) => adminApi.refundOrder(orderId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Order refunded'); },
  });

  const resendMutation = useMutation({
    mutationFn: (orderId: string) => adminApi.resendTicket(orderId),
    onSuccess: () => toast.success('Ticket email resent'),
  });

  const bypassMutation = useMutation({
    mutationFn: () => adminApi.bypassBookTicket(bypassForm),
    onSuccess: () => {
      toast.success('Bypass ticket booked successfully!');
      setBypassForm({ userId: '', tierId: '', quantity: 1 });
      setShowBypassForm(false);
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to bypass ticket');
    },
  });

  if (isLoading) return <PageSpinner />;
  const orders = data?.orders ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-white">Orders</h2>
        <div className="flex gap-2">
          <button
            className="btn-primary text-sm py-1.5 flex items-center gap-2"
            onClick={() => setShowBypassForm(!showBypassForm)}
          >
            <Lock className="w-4 h-4" /> Bypass Ticket
          </button>
          <select
            className="input w-auto text-sm"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </select>
        </div>
      </div>

      {/* Bypass Form */}
      {showBypassForm && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-white">Admin Bypass - Book Tickets Without Payment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">User Email</label>
              <input
                type="email"
                className="input text-sm"
                placeholder="user@example.com"
                value={bypassForm.userId}
                onChange={(e) => setBypassForm({ ...bypassForm, userId: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Enter user ID (You'll need a user selection component)</p>
            </div>
            <div>
              <label className="label">Tier ID</label>
              <input
                type="text"
                className="input text-sm"
                placeholder="Ticket tier ID"
                value={bypassForm.tierId}
                onChange={(e) => setBypassForm({ ...bypassForm, tierId: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                className="input text-sm"
                placeholder="1"
                min="1"
                value={bypassForm.quantity}
                onChange={(e) => setBypassForm({ ...bypassForm, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary text-sm py-1.5"
              onClick={() => bypassMutation.mutate()}
              disabled={!bypassForm.userId || !bypassForm.tierId || bypassMutation.isPending}
            >
              {bypassMutation.isPending ? 'Processing...' : 'Confirm Bypass'}
            </button>
            <button
              className="btn-secondary text-sm py-1.5"
              onClick={() => {
                setShowBypassForm(false);
                setBypassForm({ userId: '', tierId: '', quantity: 1 });
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="card text-center py-10 text-gray-500">No orders found.</div>
        ) : orders.map((order) => (
          <div key={order.id} className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white text-sm font-mono">{order.id.split('-')[0]}...</p>
                  <OrderStatusBadge status={order.status} />
                  {order.isBypassed && (
                    <span className="badge bg-orange-900 text-orange-200 text-xs font-semibold">
                      🔐 Admin Bypass
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">{order.tier?.name} × {order.quantity}</p>
                  {order.tier?.description && (
                    <p className="text-xs text-gray-500 italic">{order.tier?.description}</p>
                  )}
                  {order.tier?.features && order.tier?.features.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {order.tier.features.map((feature, idx) => (
                        <span key={idx} className="badge badge-primary text-xs">
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">{format(new Date(order.createdAt), 'MMM d, yyyy â€¢ h:mm a')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-white">${Number(order.totalAmount).toFixed(2)}</p>
                {order.status === 'PAID' && (
                  <>
                    <button
                      className="btn-secondary py-1.5 text-xs"
                      onClick={() => resendMutation.mutate(order.id)}
                      disabled={resendMutation.isPending}
                    >
                      Resend
                    </button>
                    <button
                      className="btn-danger py-1.5 text-xs"
                      onClick={() => { if (confirm('Refund this order?')) refundMutation.mutate(order.id); }}
                      disabled={refundMutation.isPending}
                    >
                      Refund
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className="btn-secondary text-sm py-1.5" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
          <button className="btn-secondary text-sm py-1.5" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
