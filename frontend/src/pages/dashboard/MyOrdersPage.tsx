import { useQuery } from '@tanstack/react-query';
import { ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { userApi } from '../../api/user';
import { PageSpinner } from '../../components/ui/Spinner';
import { OrderStatusBadge } from '../../components/ui/Badge';

export function MyOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => userApi.getMyOrders().then((r) => r.data),
  });

  if (isLoading) return <PageSpinner />;
  const orders = data?.orders ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">My Orders</h2>

      {orders.length === 0 ? (
        <div className="card text-center py-12">
          <ShoppingBag className="w-12 h-12 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">
                    {order.tier?.event?.title ?? 'Order'}
                  </p>
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
              <div className="text-right">
                <p className="text-lg font-bold text-white">${Number(order.totalAmount).toFixed(2)}</p>
                {order._count && (
                  <p className="text-xs text-gray-500">{order._count.tickets} ticket(s)</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
