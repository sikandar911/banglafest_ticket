import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Lock, Search, ChevronDown, AlertTriangle, X } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { eventsApi } from '../../api/events';
import { PageSpinner } from '../../components/ui/Spinner';
import { OrderStatusBadge } from '../../components/ui/Badge';



export function AdminOrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [showBypassForm, setShowBypassForm] = useState(false);
  const [refundTarget, setRefundTarget] = useState<{ id: string; name: string; amount: number; event: string } | null>(null);

  // Bypass form state
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedTierId, setSelectedTierId] = useState('');
  const [bypassQty, setBypassQty] = useState(1);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', { page, status }],
    queryFn: () => adminApi.listOrders({ page, limit: 20, status: status || undefined }).then((r) => r.data),
  });

  const { data: promoCodesData } = useQuery({
    queryKey: ['admin-promo-codes'],
    queryFn: () => adminApi.listPromoCodes().then((r) => r.data),
  });

  const promoMap = useMemo(() => {
    const map = new Map<string, string>();
    (promoCodesData?.promoCodes ?? []).forEach((p: any) => {
      map.set(p.id, p.code);
    });
    return map;
  }, [promoCodesData]);

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-bypass', userSearch],
    queryFn: () => adminApi.listUsers().then((r) => r.data),
    enabled: showBypassForm,
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events-bypass'],
    queryFn: () => eventsApi.list().then((r) => r.data),
    enabled: showBypassForm,
  });

  const filteredUsers = (usersData?.users ?? []).filter((u: any) =>
    userSearch.trim().length < 2 ? false :
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const selectedEvent = (eventsData?.events ?? []).find((e: any) => e.id === selectedEventId);
  const tiers = selectedEvent?.ticketTiers ?? [];

  const refundMutation = useMutation({
    mutationFn: (orderId: string) => adminApi.refundOrder(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Order refunded — inventory restored');
      setRefundTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Refund failed'),
  });

  const resendMutation = useMutation({
    mutationFn: (orderId: string) => adminApi.resendTicket(orderId),
    onSuccess: () => toast.success('Ticket email resent'),
    onError: (err: any) => toast.error(err.response?.data?.error || 'Resend failed'),
  });

  const bypassMutation = useMutation({
    mutationFn: () => adminApi.bypassBookTicket({ userId: selectedUser!.id, tierId: selectedTierId, quantity: bypassQty }),
    onSuccess: () => {
      toast.success('Bypass ticket booked!');
      setSelectedUser(null);
      setUserSearch('');
      setSelectedEventId('');
      setSelectedTierId('');
      setBypassQty(1);
      setShowBypassForm(false);
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to book bypass ticket'),
  });

  const resetBypass = () => {
    setShowBypassForm(false);
    setSelectedUser(null);
    setUserSearch('');
    setSelectedEventId('');
    setSelectedTierId('');
    setBypassQty(1);
  };

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
            <Lock className="w-4 h-4" /> Book Free Ticket
          </button>
          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
            {[
              { label: 'All', value: '' },
              { label: 'Paid', value: 'PAID' },
              { label: 'Failed', value: 'FAILED' }
            ].map((f) => (
              <button
                key={f.label}
                onClick={() => { setStatus(f.value); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  status === f.value
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bypass Form ──────────────────────────────────────── */}
      {showBypassForm && (
        <div className="card space-y-5 border-primary-800">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary-400" /> Book Ticket Without Payment
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User search */}
            <div>
              <label className="label">Attendee</label>
              {selectedUser ? (
                <div className="flex items-center justify-between input py-2.5">
                  <div>
                    <p className="text-white text-sm font-medium">{selectedUser.name}</p>
                    <p className="text-gray-500 text-xs">{selectedUser.email}</p>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setUserSearch(''); }} className="text-gray-500 hover:text-white text-xs">
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      className="input pl-9 text-sm"
                      placeholder="Search by name or email…"
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                      onFocus={() => setShowUserDropdown(true)}
                    />
                  </div>
                  {showUserDropdown && filteredUsers.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {filteredUsers.map((u: any) => (
                        <button
                          key={u.id}
                          className="w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0"
                          onClick={() => { setSelectedUser(u); setShowUserDropdown(false); setUserSearch(u.name); }}
                        >
                          <p className="text-white text-sm font-medium">{u.name}</p>
                          <p className="text-gray-500 text-xs">{u.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {userSearch.trim().length >= 2 && filteredUsers.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1 pl-1">No users found</p>
                  )}
                </div>
              )}
            </div>

            {/* Event selector */}
            <div>
              <label className="label">Event</label>
              <div className="relative">
                <select
                  className="input text-sm appearance-none pr-8"
                  value={selectedEventId}
                  onChange={(e) => { setSelectedEventId(e.target.value); setSelectedTierId(''); }}
                >
                  <option value="">Select event…</option>
                  {(eventsData?.events ?? []).map((e: any) => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Tier selector */}
            <div>
              <label className="label">Ticket Tier</label>
              <div className="relative">
                <select
                  className="input text-sm appearance-none pr-8"
                  value={selectedTierId}
                  onChange={(e) => setSelectedTierId(e.target.value)}
                  disabled={!selectedEventId}
                >
                  <option value="">Select tier…</option>
                  {tiers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — £{Number(t.price).toFixed(2)} ({t.availableQty} left)
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                className="input text-sm"
                min="1"
                max="10"
                value={bypassQty}
                onChange={(e) => setBypassQty(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              className="btn-primary text-sm"
              onClick={() => bypassMutation.mutate()}
              disabled={!selectedUser || !selectedTierId || bypassMutation.isPending}
            >
              {bypassMutation.isPending ? 'Booking…' : 'Confirm & Send Ticket'}
            </button>
            <button className="btn-secondary text-sm" onClick={resetBypass}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Orders list ──────────────────────────────────────── */}
      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="card text-center py-10 text-gray-500">No orders found.</div>
        ) : orders.map((order: any) => (
          <div key={order.id} className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white text-sm font-mono">{order.id.split('-')[0]}...</p>
                  <OrderStatusBadge status={order.status} />
                  {order.isBypassed && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-900 text-orange-200 text-xs font-semibold">
                      COMP
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm text-gray-400">{order.user?.name} · {order.user?.email}</p>
                  <p className="text-sm text-gray-500">{order.ticketTier?.name} × {order.quantity}</p>
                  {order.status === 'PAID' && (
                    <p className="text-xs text-gray-400">
                      Promo: <span className="font-semibold text-gray-300">
                        {order.promoCodeId ? (promoMap.get(order.promoCodeId) || 'Loading...') : 'No Promo'}
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-gray-600">{format(new Date(order.createdAt), 'MMM d, yyyy · h:mm a')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-white">£{Number(order.totalAmount).toFixed(2)}</p>
                {order.status === 'PAID' && !order.isBypassed && (
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
                      onClick={() => setRefundTarget({
                        id: order.id,
                        name: order.user?.name ?? 'Unknown',
                        amount: Number(order.totalAmount),
                        event: order.ticketTier?.name ?? '',
                      })}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className="btn-secondary text-sm py-1.5" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
          <button className="btn-secondary text-sm py-1.5" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {/* ── Refund Confirmation Modal ─────────────────────────── */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-900/50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Confirm Refund</h3>
                  <p className="text-xs text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setRefundTarget(null)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Customer</span>
                <span className="text-white font-medium">{refundTarget.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Ticket</span>
                <span className="text-white">{refundTarget.event}</span>
              </div>
              <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                <span className="text-gray-400">Refund amount</span>
                <span className="text-red-400 font-bold text-base">£{refundTarget.amount.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-sm text-gray-400">
              The customer will receive a full refund to their original payment method. All associated tickets will be cancelled and seats restored.
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 btn-danger py-2.5 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                onClick={() => refundMutation.mutate(refundTarget.id)}
                disabled={refundMutation.isPending}
              >
                {refundMutation.isPending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Processing…
                  </>
                ) : 'Issue Refund'}
              </button>
              <button
                className="flex-1 btn-secondary py-2.5"
                onClick={() => setRefundTarget(null)}
                disabled={refundMutation.isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
