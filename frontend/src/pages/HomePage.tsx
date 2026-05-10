import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Ticket } from 'lucide-react';
import { eventsApi } from '../api/events';
import { PageSpinner } from '../components/ui/Spinner';
// import { AvailabilityBadge } from '../components/ui/Badge';
import { format } from 'date-fns';

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
          <span className="text-primary-400">Bangla</span>fest 2026
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
            const allSoldOut = event.ticketTiers.every((t) => t.availabilityStatus === 'SOLD_OUT');

            return (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="card hover:border-primary-700 transition-all group flex flex-col"
              >
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">
                    {event.title}
                  </h2>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{event.description}</p>

                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary-400 shrink-0" />
                      {format(new Date(event.startTime), 'EEE, MMM d yyyy • h:mm a')}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary-400 shrink-0" />
                      {event.location}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                  <span className="text-white font-semibold">
                    {minPrice !== null ? `From $${minPrice.toFixed(2)}` : 'Free'}
                  </span>
                  {allSoldOut ? (
                    <span className="badge-sold-out">Sold Out</span>
                  ) : (
                    <span className="btn-primary py-1.5 text-sm">Get Tickets</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
