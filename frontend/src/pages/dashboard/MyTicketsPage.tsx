import { useQuery } from '@tanstack/react-query';
import { Download, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { userApi } from '../../api/user';
import { PageSpinner } from '../../components/ui/Spinner';

export function MyTicketsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: () => userApi.getMyTickets().then((r) => r.data),
  });

  const downloadPdf = async (ticketId: string) => {
    try {
      const res = await userApi.downloadTicketPdf(ticketId);
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${ticketId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  if (isLoading) return <PageSpinner />;
  const tickets = data?.tickets ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">My Tickets</h2>

      {tickets.length === 0 ? (
        <div className="card text-center py-12">
          <QrCode className="w-12 h-12 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No tickets yet. Browse events and get your tickets!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="card flex flex-col gap-4">
              {/* QR Code */}
              {ticket.qrDataUrl && (
                <div className="flex justify-center">
                  <img
                    src={ticket.qrDataUrl}
                    alt="QR Code"
                    className="w-36 h-36 rounded-lg bg-white p-1"
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-white text-lg">
                    {ticket.order?.tier?.event?.title ?? 'Event'}
                  </p>
                  {ticket.order?.isBypassed && (
                    <span className="badge bg-orange-900 text-orange-200 text-xs font-semibold">
                      🔐 Admin Bypass
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400">{ticket.order?.tier?.name}</p>
                {ticket.order?.tier?.description && (
                  <p className="text-xs text-gray-500 italic">{ticket.order?.tier?.description}</p>
                )}
                {ticket.order?.tier?.features && ticket.order?.tier?.features.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ticket.order.tier.features.map((feature, idx) => (
                      <span key={idx} className="badge badge-primary text-xs">
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
                {ticket.order?.tier?.event?.startTime && (
                  <p className="text-sm text-gray-500">
                    {format(new Date(ticket.order.tier.event.startTime), 'MMM d, yyyy • h:mm a')}
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  {ticket.order?.tier?.event?.location}
                </p>
              </div>

              <div className="border-t border-gray-800 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-mono">UUID</p>
                  <p className="text-xs text-gray-400 font-mono truncate max-w-[160px]">{ticket.uuid}</p>
                </div>
                {ticket.scannedAt ? (
                  <span className="text-xs text-green-400 font-medium">✓ Used</span>
                ) : (
                  <button onClick={() => downloadPdf(ticket.id)} className="btn-secondary py-1.5 text-xs">
                    <Download className="w-3 h-3" /> PDF
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
