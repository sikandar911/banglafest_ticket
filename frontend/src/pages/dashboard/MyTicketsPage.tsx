import { useQuery } from '@tanstack/react-query';
import { Download, CheckCircle2, Clock, QrCode, RefreshCw, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { userApi } from '../../api/user';
import { PageSpinner } from '../../components/ui/Spinner';

// Type for ticket from API response  
type MyTicket = Awaited<ReturnType<typeof userApi.getMyTickets>>['data']['tickets'][0];

export function MyTicketsPage() {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: () => userApi.getMyTickets().then((r) => r.data),
    // Poll every 15s so status updates automatically after admin scans
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const triggerBlobDownload = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const printAllPdf = async () => {
    const response = await userApi.downloadAllTicketsPdf();
    // Get event names from tickets for filename
    const eventNames = tickets.map(t => t.event.title).filter((v, i, a) => a.indexOf(v) === i).join(' & ');
    const fileName = eventNames ? `ticket - ${eventNames}.pdf` : 'ticket - banglafest.pdf';
    triggerBlobDownload(response.data, fileName);
  };

  const downloadTicket = async (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    const response = await userApi.downloadTicketPdf(ticketId);
    const fileName = ticket 
      ? `${ticket.attendeeName || 'Guest'} - ${ticket.event.title}.pdf`
      : `banglafest-ticket-${ticketId.slice(0, 8)}.pdf`;
    triggerBlobDownload(response.data, fileName);
  };

  if (isLoading) return <PageSpinner />;
  const tickets = (data?.tickets ?? []) as MyTicket[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">My Tickets</h2>
        <div className="flex items-center gap-3">
          {tickets.length > 0 && (
            <button
              onClick={() => void printAllPdf()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print All
            </button>
          )}
          {dataUpdatedAt > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <RefreshCw className="w-3 h-3" />
            Synced {format(new Date(dataUpdatedAt), 'h:mm:ss a')}
          </span>
          )}
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="card text-center py-16">
          <QrCode className="w-14 h-14 mx-auto text-gray-700 mb-4" />
          <p className="text-gray-400 font-medium">No tickets yet</p>
          <p className="text-gray-600 text-sm mt-1">Browse events and purchase your tickets</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} onDownload={downloadTicket} />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket, onDownload }: { ticket: MyTicket; onDownload: (id: string) => void }) {
  const isCheckedIn = ticket.status === 'CHECKED_IN';
  const isValid = ticket.status === 'VALID';

  return (
    <div className={`rounded-2xl overflow-hidden border ${isCheckedIn ? 'border-gray-700' : 'border-primary-800'} bg-gray-950 shadow-xl`}>

      {/* Event image banner or gradient header */}
      <div className="relative h-24 overflow-hidden">
        {ticket.event.imageUrl ? (
          <>
            <img src={ticket.event.imageUrl} alt={ticket.event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70" />
          </>
        ) : (
          <div className={`w-full h-full ${isCheckedIn ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-primary-900 to-gray-900'}`} />
        )}

        {/* Tier badge */}
        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${isCheckedIn ? 'bg-gray-700 text-gray-300' : 'bg-primary-500 text-white'}`}>
          {ticket.tier.name.toUpperCase()}
        </div>

        {/* Status badge */}
        <div className={`absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isCheckedIn ? 'bg-green-900/80 text-green-300' : 'bg-gray-900/80 text-gray-200'}`}>
          {isCheckedIn
            ? <><CheckCircle2 className="w-3 h-3" /> CHECKED IN</>
            : <><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> VALID</>
          }
        </div>

        {ticket.order.isBypassed && (
          <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-orange-900/80 text-orange-300 text-xs font-bold">
            COMP
          </div>
        )}
      </div>

      {/* Dashed tear line */}
      <div className="relative flex items-center px-4 py-0">
        <div className="absolute -left-3 w-6 h-6 rounded-full bg-gray-900 border border-gray-800" />
        <div className="flex-1 border-t-2 border-dashed border-gray-800 mx-3" />
        <div className="absolute -right-3 w-6 h-6 rounded-full bg-gray-900 border border-gray-800" />
      </div>

      <div className="p-4 flex gap-4">
        {/* QR Code */}
        <div className="shrink-0">
          <div className={`w-28 h-28 rounded-xl overflow-hidden p-1.5 ${isCheckedIn ? 'bg-gray-800' : 'bg-white'}`}>
            <img
              src={ticket.qrCode}
              alt="QR Code"
              className={`w-full h-full object-contain ${isCheckedIn ? 'opacity-30 grayscale' : ''}`}
            />
          </div>
          {isCheckedIn && (
            <div className="mt-1.5 text-center">
              <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className={`font-bold text-base leading-tight ${isCheckedIn ? 'text-gray-400' : 'text-white'}`}>
            {ticket.event.title}
          </p>

          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{format(new Date(ticket.event.startTime), 'MMM d, yyyy · h:mm a')}</span>
          </div>

          {ticket.event.location && (
            <p className="text-xs text-gray-600 truncate">{ticket.event.location}</p>
          )}

          {ticket.tier.features && ticket.tier.features.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {ticket.tier.features.map((f, i) => (
                <span key={i} className="text-xs bg-primary-900/50 text-primary-400 px-2 py-0.5 rounded-full border border-primary-800">
                  {f}
                </span>
              ))}
            </div>
          )}

          {isCheckedIn && ticket.scannedAt && (
            <p className="text-xs text-green-600 font-medium">
              ✓ Scanned {format(new Date(ticket.scannedAt), 'MMM d · h:mm a')}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-1 flex items-center justify-between border-t border-gray-800/50 mt-1">
        <p className="text-xs text-gray-700 font-mono truncate max-w-[160px]">{ticket.id.toUpperCase()}</p>
        {isValid && (
          <button
            onClick={() => onDownload(ticket.id)}
            className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download Ticket
          </button>
        )}
        {isCheckedIn && (
          <span className="text-xs text-gray-600">Entry complete</span>
        )}
      </div>
    </div>
  );
}
