import { useQuery } from '@tanstack/react-query';
import { PoundSterling, TrendingUp, AlertCircle, Users, X, Tag } from 'lucide-react';
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

  const { data: promoData, isLoading: isPromoLoading, isError: isPromoError, refetch: refetchPromos } = useQuery({
    queryKey: ['admin', 'promo-codes'],
    queryFn: () => adminApi.listPromoCodes().then((r) => r.data),
  });

  const [selectedPromoForModal, setSelectedPromoForModal] = useState<string | null>(null);

  const { data: promoOrdersData, isLoading: isPromoOrdersLoading } = useQuery({
    queryKey: ['promo-code-orders', selectedPromoForModal],
    queryFn: () => selectedPromoForModal ? adminApi.getPromoCodeOrders(selectedPromoForModal).then((r) => r.data) : null,
    enabled: !!selectedPromoForModal,
  });

  if (isLoading || isPromoLoading) return <PageSpinner />;

  if (isError || isPromoError) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Revenue</h2>
        <div className="card flex flex-col items-center py-12 gap-4">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-gray-400">Failed to load revenue data.</p>
          <button className="btn-secondary text-sm" onClick={() => { refetch(); refetchPromos(); }}>Retry</button>
        </div>
      </div>
    );
  }

  const rev = data?.revenue;
  const salesExecBreakdown = data?.salesExecutiveBreakdown ?? [];

  const promoCodesList = promoData?.promoCodes ?? [];
  const apiBreakdown = data?.promoCodeBreakdown ?? [];

  const combinedPromoBreakdown: any[] = promoCodesList.map((pc) => {
    const matched = apiBreakdown.find((p) => p.promoCodeId === pc.id);
    return {
      promoCodeId: pc.id,
      code: pc.code,
      influencerName: pc.influencerName,
      ticketsSold: matched?.ticketsSold ?? 0,
      revenueGenerated: matched?.revenueGenerated ?? 0,
      ordersCount: matched?.ordersCount ?? 0,
    };
  });

  // Append any deleted/historical promo codes that have performance records but are not in the current active list
  apiBreakdown.forEach((p) => {
    if (!combinedPromoBreakdown.some((item) => item.promoCodeId === p.promoCodeId)) {
      combinedPromoBreakdown.push(p);
    }
  });

  // Sort: highest revenue generated first
  combinedPromoBreakdown.sort((a, b) => b.revenueGenerated - a.revenueGenerated);

  console.log('Revenue data:', rev);
  console.log('Sales Executive Breakdown:', salesExecBreakdown);
  console.log('Combined Promo Breakdown:', combinedPromoBreakdown);

  if (!rev) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Revenue</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <PoundSterling className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Gross Revenue</span>
          </div>
          <p className="text-2xl font-bold text-white">£{rev.totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">From {rev.paidOrders} paid orders</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">Online Sales</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">£{(rev.onlineRevenue ?? 0).toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Customer Stripe purchases</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-orange-400" />
            <span className="text-sm text-gray-400">Sales Executive</span>
          </div>
          <p className="text-2xl font-bold text-orange-400">£{(rev.salesExecRevenue ?? 0).toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">From {rev.salesExecTickets ?? 0} tickets</p>
        </div>
        <div className="card border-primary-800">
          <div className="flex items-center gap-3 mb-2">
            <PoundSterling className="w-5 h-5 text-primary-400" />
            <span className="text-sm text-gray-400">Net Revenue</span>
          </div>
          <p className="text-2xl font-bold text-primary-400">£{rev.netRevenue.toFixed(2)}</p>
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
            <h3 className="text-base font-semibold text-white">Sales Executive Sales Details</h3>
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

      {/* Promo Code Performance */}
      <div className="card">
        <h3 className="text-base font-semibold text-white mb-4">Promo Code Performance</h3>
        {combinedPromoBreakdown.length === 0 ? (
          <p className="text-sm text-gray-500 italic py-4 text-center">No promo codes configured.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-800 text-gray-300 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Promo Code</th>
                  <th className="px-4 py-3 font-semibold">Influencer</th>
                  <th className="px-4 py-3 text-center font-semibold">Tickets Sold</th>
                  <th className="px-4 py-3 text-center font-semibold">Orders Count</th>
                  <th className="px-4 py-3 text-right font-semibold">Revenue Generated</th>
                  <th className="px-4 py-3 text-right font-semibold">Avg. Order Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {combinedPromoBreakdown.map((promo: any) => (
                  <tr key={promo.promoCodeId} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-purple-300">
                      <button
                        onClick={() => setSelectedPromoForModal(promo.promoCodeId)}
                        className="hover:text-purple-100 hover:underline focus:outline-none transition-all text-left"
                      >
                        {promo.code}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {promo.influencerName}
                    </td>
                    <td className="px-4 py-3 text-center text-white font-medium">
                      {promo.ticketsSold}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {promo.ordersCount}
                    </td>
                    <td className="px-4 py-3 text-right text-green-400 font-semibold">
                      £{promo.revenueGenerated.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      £{(promo.revenueGenerated / (promo.ordersCount || 1)).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-gray-800/60 font-bold border-t border-gray-700">
                  <td className="px-4 py-3 text-white" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-center text-white">
                    {combinedPromoBreakdown.reduce((sum: number, p: any) => sum + p.ticketsSold, 0)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400">
                    {combinedPromoBreakdown.reduce((sum: number, p: any) => sum + p.ordersCount, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-400">
                    £{combinedPromoBreakdown.reduce((sum: number, p: any) => sum + p.revenueGenerated, 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    £{(
                      combinedPromoBreakdown.reduce((sum: number, p: any) => sum + p.revenueGenerated, 0) /
                      (combinedPromoBreakdown.reduce((sum: number, p: any) => sum + p.ordersCount, 0) || 1)
                    ).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

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

      {/* Promo Code Orders Details Modal */}
      {selectedPromoForModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <Tag className="w-5 h-5 text-purple-400" />
                  Promo Code Orders Detail
                </h2>
                {promoOrdersData?.promoCode && (
                  <p className="text-sm text-gray-400 mt-1">
                    Code: <span className="font-mono font-semibold text-purple-300">{promoOrdersData.promoCode.code}</span> · Influencer: <span className="text-white font-medium">{promoOrdersData.promoCode.influencerName}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedPromoForModal(null)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 min-h-[200px]">
              {isPromoOrdersLoading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-3">
                  <PageSpinner />
                  <p className="text-sm text-gray-500">Loading orders...</p>
                </div>
              ) : !promoOrdersData?.orders || promoOrdersData.orders.length === 0 ? (
                <div className="text-center py-12 text-gray-500 italic">
                  No paid orders have been placed using this promo code yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {promoOrdersData.orders.map((order) => (
                    <div key={order.id} className="border border-gray-800 rounded-lg p-4 bg-gray-950/20 hover:border-gray-700/80 transition-all">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-800/60 pb-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 font-mono">Order ID: {order.id.split('-')[0]}...</p>
                          <h4 className="font-semibold text-white mt-0.5">{order.user.name}</h4>
                          <p className="text-xs text-purple-300 font-mono">{order.user.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Total Amount</p>
                          <p className="text-base font-bold text-green-400">£{order.totalAmount.toFixed(2)}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tickets</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {order.tickets.map((ticket) => (
                            <div key={ticket.id} className="flex flex-col justify-center bg-gray-800/40 rounded px-3 py-2 border border-gray-800">
                              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">{ticket.ticketTier.name}</span>
                              <span className="text-sm font-medium text-white truncate">{ticket.attendeeName || order.user.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedPromoForModal(null)}
                className="btn-secondary px-6"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
