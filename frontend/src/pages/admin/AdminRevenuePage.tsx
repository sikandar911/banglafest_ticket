import { useQuery } from '@tanstack/react-query';
import { PoundSterling, TrendingUp, AlertCircle, Users, X } from 'lucide-react';
import { useState } from 'react';
import { adminApi } from '../../api/admin';
import { PageSpinner } from '../../components/ui/Spinner';

export function AdminRevenuePage() {
  const [showSalesModal, setShowSalesModal] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: () => adminApi.getRevenue().then((r) => {
      console.log('Revenue API Response:', r.data);
      return r.data;
    }),
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
  const salesExecBreakdown = data?.salesExecutiveBreakdown ?? [];

  console.log('Revenue data:', rev);
  console.log('Sales Executive Breakdown:', salesExecBreakdown);

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
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">Online Sales</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">£{(rev.onlineRevenue ?? 0).toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Customer ticket purchases</p>
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
        <button
          onClick={() => setShowSalesModal(true)}
          className="w-full card border-orange-800 hover:border-orange-700 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-orange-400" />
            <h3 className="text-base font-semibold text-white">Sales Executive Sales</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
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
          <p className="text-xs text-gray-400 mt-4">Click to view sales executive breakdown</p>
        </button>
      )}

      {/* Sales Executive Breakdown Modal */}
      {showSalesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Users className="w-5 h-5 text-orange-400" />
                Sales Executive Breakdown
              </h2>
              <button
                onClick={() => setShowSalesModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {salesExecBreakdown.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No sales executive data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {salesExecBreakdown.map((exec) => (
                  <div key={exec.userId} className="border border-gray-700 rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Sales Executive</p>
                        <p className="font-semibold text-white">{exec.userName}</p>
                        <p className="text-xs text-gray-500">{exec.userEmail}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Revenue</p>
                        <p className="text-xl font-bold text-orange-400">£{exec.revenue.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Orders</p>
                        <p className="text-xl font-bold text-white">{exec.orders}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Tickets Sold</p>
                        <p className="text-xl font-bold text-white">{exec.tickets}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Avg per Order</p>
                        <p className="text-xl font-bold text-blue-400">£{(exec.revenue / exec.orders).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Summary Footer */}
                <div className="border-t border-gray-700 pt-4 mt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Total Sales Execs</p>
                      <p className="text-2xl font-bold text-white">{salesExecBreakdown.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-orange-400">
                        £{salesExecBreakdown.reduce((sum, exec) => sum + exec.revenue, 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Total Orders</p>
                      <p className="text-2xl font-bold text-white">
                        {salesExecBreakdown.reduce((sum, exec) => sum + exec.orders, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Total Tickets</p>
                      <p className="text-2xl font-bold text-white">
                        {salesExecBreakdown.reduce((sum, exec) => sum + exec.tickets, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowSalesModal(false)}
              className="mt-6 w-full btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
