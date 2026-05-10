import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import { PageSpinner } from '../../components/ui/Spinner';
import { OrderStatusBadge } from '../../components/ui/Badge';

const STATUSES = ['', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'];

export function AdminOrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', { page, status }],
    queryFn: () => adminApi.listOrders({ page, limit: 20, status: status || undefined }).then((r) => r.data),
  });

  const refundMutation = useMutation({
    mutationFn: (orderId: string) => adminApi.refundOrder(orderId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Order refunded'); },
  });

  const resendMutation = useMutation({
    mutationFn: (orderId: string) => adminApi.resendTicket(orderId),
    onSuccess: () => toast.success('Ticket email resent'),
  });

  if (isLoading) return <PageSpinner />;
  const orders = data?.orders ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-white">Orders</h2>
        <select
          className="input w-auto text-sm"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="card text-center py-10 text-gray-500">No orders found.</div>
        ) : orders.map((order) => (
          <div key={order.id} className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white text-sm font-mono">{order.id.split('-')[0]}...</p>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="text-sm text-gray-400">{order.tier?.name} × {order.quantity}</p>
                <p className="text-xs text-gray-500">{format(new Date(order.createdAt), 'MMM d, yyyy • h:mm a')}</p>
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
