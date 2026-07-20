import { useQuery } from '@tanstack/react-query';
import { PoundSterling, ShoppingBag, Users, TrendingUp } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAdminEventFilter } from '../../context/AdminEventFilterContext';

export function AdminOverviewPage() {
  const { selectedEventId } = useAdminEventFilter();

  const revenueQuery = useQuery({
    queryKey: ['admin-revenue', selectedEventId],
    queryFn: () => adminApi.getRevenue({ eventId: selectedEventId || undefined }).then((r) => r.data),
  });
  const usersQuery = useQuery({
    queryKey: ['admin-users', { page: 1, limit: 1 }],
    queryFn: () => adminApi.listUsers({ page: 1, limit: 1 }).then((r) => r.data),
  });
  useQuery({
    queryKey: ['admin-orders', { page: 1, limit: 1, eventId: selectedEventId }],
    queryFn: () => adminApi.listOrders({ page: 1, limit: 1, eventId: selectedEventId || undefined }).then((r) => r.data),
  });

  if (revenueQuery.isLoading) return <PageSpinner />;

  const rev = revenueQuery.data?.revenue;
  const ticketBreakdown = (revenueQuery.data as any)?.ticketBreakdown;

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

      {ticketBreakdown && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Ticket Sales Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Tickets Card */}
            <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Tickets</p>
              <p className="text-3xl font-extrabold text-white mb-4">
                {ticketBreakdown.totalTickets} <span className="text-xs font-normal text-gray-400">tickets</span>
              </p>
              <div className="space-y-2 border-t border-gray-700/50 pt-3">
                {ticketBreakdown.salesExecTickets.tiers.map((t: any) => {
                  const onlineMatch = ticketBreakdown.onlineTickets.tiers.find((o: any) => o.tierId === t.tierId);
                  const combinedCount = t.count + (onlineMatch?.count ?? 0);
                  return (
                    <div key={t.tierId} className="flex justify-between items-center text-sm">
                      <span className="text-gray-300 font-medium">{t.tierName}</span>
                      <span className="text-purple-300 font-semibold">{combinedCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sales Executive Sold Card */}
            <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Sales Executive Sold</p>
              <p className="text-3xl font-extrabold text-purple-400 mb-4">
                {ticketBreakdown.salesExecTickets.total} <span className="text-xs font-normal text-gray-400">tickets</span>
              </p>
              <div className="space-y-2 border-t border-gray-700/50 pt-3">
                {ticketBreakdown.salesExecTickets.tiers.map((t: any) => (
                  <div key={t.tierId} className="flex justify-between items-center text-sm">
                    <span className="text-gray-300 font-medium">{t.tierName}</span>
                    <span className="text-purple-400 font-semibold">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Online Sold Card */}
            <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Online (Stripe) Sold</p>
              <p className="text-3xl font-extrabold text-green-400 mb-4">
                {ticketBreakdown.onlineTickets.total} <span className="text-xs font-normal text-gray-400">tickets</span>
              </p>
              <div className="space-y-2 border-t border-gray-700/50 pt-3">
                {ticketBreakdown.onlineTickets.tiers.map((t: any) => (
                  <div key={t.tierId} className="flex justify-between items-center text-sm">
                    <span className="text-gray-300 font-medium">{t.tierName}</span>
                    <span className="text-green-400 font-semibold">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {rev && (
        <div className="card bg-gray-800/40 border border-gray-700/80 rounded-2xl p-6">
          <h3 className="font-semibold text-white text-lg mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            Live Event Check-in Status
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Checked In Card */}
            <div className="rounded-xl border border-green-500/20 bg-green-950/10 p-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-green-400/80 uppercase tracking-wider mb-1">Checked In Holders</p>
                <p className="text-xs text-gray-400 mb-4">Currently inside the venue / active tickets</p>
              </div>
              <p className="text-4xl font-black text-green-400">
                {rev.checkedIn ?? 0} <span className="text-sm font-normal text-gray-500">active</span>
              </p>
            </div>

            {/* Checked Out Card */}
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-950/10 p-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-yellow-400/80 uppercase tracking-wider mb-1">Checked Out Holders</p>
                <p className="text-xs text-gray-400 mb-4">Scanned but currently checked out</p>
              </div>
              <p className="text-4xl font-black text-yellow-400">
                {rev.checkedOut ?? 0} <span className="text-sm font-normal text-gray-500">out</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
