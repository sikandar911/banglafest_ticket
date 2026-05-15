import { useQuery } from '@tanstack/react-query';
import { PoundSterling, ShoppingBag, Users, TrendingUp } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { PageSpinner } from '../../components/ui/Spinner';

export function AdminOverviewPage() {
  const revenueQuery = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: () => adminApi.getRevenue().then((r) => r.data),
  });
  const usersQuery = useQuery({
    queryKey: ['admin-users', { page: 1, limit: 1 }],
    queryFn: () => adminApi.listUsers({ page: 1, limit: 1 }).then((r) => r.data),
  });
  useQuery({
    queryKey: ['admin-orders', { page: 1, limit: 1 }],
    queryFn: () => adminApi.listOrders({ page: 1, limit: 1 }).then((r) => r.data),
  });

  if (revenueQuery.isLoading) return <PageSpinner />;

  const rev = revenueQuery.data?.revenue;

  const stats = [
    {
      label: 'Total Revenue',
      value: `£${(rev?.totalRevenue ?? 0).toFixed(2)}`,
      icon: PoundSterling,
      color: 'text-green-400',
      bg: 'bg-green-900/30',
    },
    {
      label: 'Net Revenue',
      value: `£${(rev?.netRevenue ?? 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-blue-400',
      bg: 'bg-blue-900/30',
    },
    {
      label: 'Total Orders',
      value: rev?.totalOrders ?? 0,
      icon: ShoppingBag,
      color: 'text-purple-400',
      bg: 'bg-purple-900/30',
    },
    {
      label: 'Total Users',
      value: usersQuery.data?.total ?? '—',
      icon: Users,
      color: 'text-yellow-400',
      bg: 'bg-yellow-900/30',
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`${bg} p-3 rounded-xl`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-400">{label}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {rev && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Order Breakdown</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-400">{rev.paidOrders}</p>
              <p className="text-sm text-gray-400">Paid</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">{rev.totalOrders - rev.paidOrders - rev.refundedOrders}</p>
              <p className="text-sm text-gray-400">Pending/Failed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{rev.refundedOrders}</p>
              <p className="text-sm text-gray-400">Refunded</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
