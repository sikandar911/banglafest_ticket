import { useQuery } from '@tanstack/react-query';
import { PoundSterling, TrendingDown, AlertCircle, Users } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { PageSpinner } from '../../components/ui/Spinner';

export function AdminRevenuePage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: () => adminApi.getRevenue().then((r) => r.data),
  });

  if (isLoading) return <PageSpinner />;

  if (isError) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Revenue</h2>
        <div className="card flex flex-col items-center py-12 gap-4">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-gray-400">Failed to load revenue data.</p>
          <button className="btn-secondary text-sm" onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    );
  }

  const rev = data?.revenue;
  if (!rev) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Revenue</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <PoundSterling className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Gross Revenue</span>
          </div>
          <p className="text-3xl font-bold text-white">£{rev.totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">From {rev.paidOrders} paid orders</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <span className="text-sm text-gray-400">Refunded</span>
          </div>
          <p className="text-3xl font-bold text-white">£{rev.refundedAmount.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">From {rev.refundedOrders} refunded orders</p>
        </div>
        <div className="card border-primary-800">
          <div className="flex items-center gap-3 mb-2">
            <PoundSterling className="w-5 h-5 text-primary-400" />
            <span className="text-sm text-gray-400">Net Revenue</span>
          </div>
          <p className="text-3xl font-bold text-primary-400">£{rev.netRevenue.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">After refunds</p>
        </div>
      </div>

      {/* Sales Executive Breakdown */}
      {(rev.salesExecOrders ?? 0) > 0 && (
        <div className="card border-orange-800">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-orange-400" />
            <h3 className="text-base font-semibold text-white">Sales Executive Sales</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400">Revenue via Sales Execs</p>
              <p className="text-2xl font-bold text-orange-400">£{(rev.salesExecRevenue ?? 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Orders via Sales Execs</p>
              <p className="text-2xl font-bold text-white">{rev.salesExecOrders}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Tickets via Sales Execs</p>
              <p className="text-2xl font-bold text-white">{rev.salesExecTickets}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
