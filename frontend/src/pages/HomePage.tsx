import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Ticket } from 'lucide-react';
import { eventsApi } from '../api/events';
import { PageSpinner } from '../components/ui/Spinner';
// import { AvailabilityBadge } from '../components/ui/Badge';

const formatEventDateInUTC = (dateString: string) => {
  try {
    const d = new Date(dateString);
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short' }).format(d);
    const month = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' }).format(d);
    const day = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', day: 'numeric' }).format(d);
    const year = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric' }).format(d);
    return `${weekday}, ${month} ${day} ${year}`;
  } catch (e) {
    return '';
  }
};

const formatEventTimeInUTC = (dateString: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(dateString));
  } catch (e) {
  }
};

export function HomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.list().then((r) => r.data),
  });

  if (isLoading) return <PageSpinner />;
  if (error) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-red-400">Failed to load events. Please try again.</p>
    </div>
  );

  const events = data?.events ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold text-white mb-4">
          <span className="text-primary-700">Bangla</span>fest & Award UK
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Celebrate culture, music, and community. Get your tickets before they sell out.
        </p>
      </div>

      {/* Events grid */}
      {events.length === 0 ? (
        <div className="text-center text-gray-500 py-20">
          <Ticket className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No events available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const minPrice = event.ticketTiers.length
              ? Math.min(...event.ticketTiers.map((t) => t.price))
              : null;
            const allSoldOut = event.ticketTiers.length > 0 && event.ticketTiers.every((t) => t.availabilityStatus === 'SOLD_OUT');

            return (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="card hover:border-primary-700 transition-all group flex flex-col overflow-hidden p-0"
              >
                {event.imageUrl ? (
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 to-transparent" />
                    {!event.isActive ? (
                      <span className="absolute top-3 right-3 bg-red-950/90 text-red-400 border border-red-850 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest">Booking Closed</span>
                    ) : allSoldOut ? (
                      <span className="absolute top-3 right-3 badge-sold-out">Sold Out</span>
                    ) : null}
                  </div>
                ) : (
                  <div className="h-2 bg-gradient-to-r from-primary-700 to-primary-500 rounded-t-xl" />
                )}
                <div className="flex-1 p-5 flex flex-col">
                  <h2 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">
                    {event.title}
                  </h2>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{event.description}</p>

                  <div className="space-y-2 text-sm text-gray-400 flex-1">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary-400 shrink-0" />
                      {formatEventDateInUTC(event.startTime)} • {formatEventTimeInUTC(event.startTime)} - {formatEventTimeInUTC(event.endTime)}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary-400 shrink-0" />
                      {event.location}
                    </div>
                    {event.ticketTiers && event.ticketTiers.length > 0 && (
                      <div className="pt-2 space-y-1">
                        <p className="text-xs text-gray-500 font-semibold">Available Tiers:</p>
                        <div className="flex flex-wrap gap-1">
                          {event.ticketTiers.map((tier) => (
                            <span key={tier.id} className="text-xs bg-primary-900 text-primary-300 px-2 py-1 rounded">
                              {tier.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                    <span className="text-white font-semibold">
                      {minPrice !== null ? `From £${minPrice.toFixed(2)}` : event.ticketTiers.length === 0 ? 'Tickets TBA' : 'Free'}
                    </span>
                    {!event.isActive ? (
                      <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-950/40 border border-red-900/40 px-2.5 py-1.5 rounded-lg">Booking Closed</span>
                    ) : event.ticketTiers.length === 0 ? (
                      <span className="text-xs text-gray-500 font-medium">Coming Soon</span>
                    ) : allSoldOut ? (
                      <span className="badge-sold-out">Sold Out</span>
                    ) : (
                      <span className="btn-primary py-1.5 text-sm">Get Tickets</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
