import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Mail, Ticket, PoundSterling, AlertCircle, Printer, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/sales';
import type { SalesCustomer } from '../../types';
import { PageSpinner } from '../../components/ui/Spinner';

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function CustomerCard({ customer }: { customer: SalesCustomer }) {
  const [open, setOpen] = useState(false);

  const printMutation = useMutation({
    mutationFn: () => salesApi.downloadCustomerTicketsPdf(customer.attendeeId),
    onSuccess: (blob) => {
      triggerBlobDownload(blob.data, `banglafest-${customer.attendeeName.replace(/\s+/g, '-')}-tickets.pdf`);
      toast.success('Tickets downloaded');
    },
    onError: () => toast.error('Failed to download tickets'),
  });

  return (
    <div className="card">
      <button
        className="w-full flex items-center justify-between gap-4"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 text-left">
          <p className="font-semibold text-white">{customer.attendeeName}</p>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Mail className="w-3.5 h-3.5" />
            {customer.attendeeEmail}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              printMutation.mutate();
            }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium transition-colors"
            disabled={printMutation.isPending}
          >
            {printMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Printer className="w-3.5 h-3.5" />
            )}
            {!printMutation.isPending && 'Print'}
          </button>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500">Tickets</p>
              <p className="font-bold text-white">{customer.totalTickets}</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500">Total</p>
              <p className="font-bold text-orange-400">£{customer.totalSpent.toFixed(2)}</p>
            </div>
            {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </button>

      {/* Mobile stats */}
      <div className="flex gap-4 mt-2 sm:hidden">
        <span className="text-xs text-gray-400">{customer.totalTickets} tickets</span>
        <span className="text-xs text-orange-400 font-medium">£{customer.totalSpent.toFixed(2)}</span>
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
          {customer.orders.map((order) => (
            <div key={order.id} className="bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white text-sm">{order.event.title}</p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(order.event.startTime), 'MMM d, yyyy')}
                    {order.event.location ? ` · ${order.event.location}` : ''}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  order.paymentMethod === 'CASH'
                    ? 'bg-green-900 text-green-300'
                    : 'bg-blue-900 text-blue-300'
                }`}>
                  {order.paymentMethod === 'CASH' ? 'Cash' : 'Card Machine'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Ticket className="w-3.5 h-3.5" />
                  <span>{order.tier.name} × {order.quantity}</span>
                </div>
                <div className="flex items-center gap-1 text-orange-400 font-semibold">
                  <PoundSterling className="w-3.5 h-3.5" />
                  {order.totalAmount.toFixed(2)}
                </div>
              </div>

              <div className="space-y-1">
                {order.tickets.map((ticket, i) => (
                  <div key={ticket.id} className="flex items-center justify-between text-xs text-gray-500">
                    <span>Ticket {i + 1}: {ticket.id.slice(0, 8)}…</span>
                    <span className={ticket.status === 'CHECKED_IN' ? 'text-green-400' : ticket.status === 'CANCELLED' ? 'text-red-400' : 'text-gray-400'}>
                      {ticket.status}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-600">
                Sold {format(new Date(order.createdAt), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SalesCustomersPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sales-customers'],
    queryFn: () => salesApi.getCustomers().then((r) => r.data),
  });

  if (isLoading) return <PageSpinner />;

  if (isError) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">My Customers</h2>
        <div className="card flex flex-col items-center py-12 gap-4">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-gray-400">Failed to load customers.</p>
          <button className="btn-secondary text-sm" onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    );
  }

  const customers = data?.customers ?? [];

  const totalTickets = customers.reduce((s, c) => s + c.totalTickets, 0);
  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">My Customers</h2>
        <span className="text-sm text-gray-400">{customers.length} customer{customers.length !== 1 ? 's' : ''}</span>
      </div>

      {customers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-xs text-gray-400">Customers</p>
            <p className="text-2xl font-bold text-white">{customers.length}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400">Tickets Sold</p>
            <p className="text-2xl font-bold text-white">{totalTickets}</p>
          </div>
          <div className="card col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-400">Total Revenue</p>
            <p className="text-2xl font-bold text-orange-400">£{totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      )}

      {customers.length === 0 ? (
        <div className="card flex flex-col items-center py-16 gap-3">
          <Mail className="w-10 h-10 text-gray-600" />
          <p className="text-gray-400">No customers yet.</p>
          <p className="text-sm text-gray-500">Start a new sale to add your first customer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <CustomerCard key={customer.attendeeId} customer={customer} />
          ))}
        </div>
      )}
    </div>
  );
}
