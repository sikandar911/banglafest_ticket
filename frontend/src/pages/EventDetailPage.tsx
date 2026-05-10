import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, ArrowLeft, Minus, Plus } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { eventsApi } from '../api/events';
import { ordersApi } from '../api/orders';
import { stripeApi } from '../api/stripe';
import { PageSpinner } from '../components/ui/Spinner';
import { AvailabilityBadge } from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const event = data?.event;
  const selectedTier = event?.ticketTiers.find((t) => t.id === selectedTierId);

  const handleCheckout = async () => {
    if (!selectedTierId) { toast.error('Please select a ticket tier'); return; }
    if (!isAuthenticated) { navigate('/login'); return; }

    setIsCheckingOut(true);
    try {
      const { data: orderData } = await ordersApi.create({ tierId: selectedTierId, quantity });
      const { data: sessionData } = await stripeApi.createCheckoutSession(orderData.order.id);
      window.location.href = sessionData.checkoutUrl;
    } catch {
      // Error handled by axios interceptor
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isLoading) return <PageSpinner />;
  if (!event) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-gray-400">Event not found.</p>
    </div>
  );

  const totalPrice = selectedTier ? (selectedTier.price * quantity).toFixed(2) : '0.00';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to events
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Event info */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-3">{event.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-primary-400" />
                {format(new Date(event.startTime), 'EEEE, MMMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-gray-600" />
                {format(new Date(event.startTime), 'h:mm a')} – {format(new Date(event.endTime), 'h:mm a')}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary-400" />
                {event.location}
              </span>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-white mb-2">About This Event</h2>
            <p className="text-gray-400 whitespace-pre-line">{event.description}</p>
          </div>

          {/* Ticket tiers */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Choose Your Ticket</h2>
            <div className="space-y-3">
              {event.ticketTiers.map((tier) => {
                const isSoldOut = tier.availabilityStatus === 'SOLD_OUT';
                const isSelected = selectedTierId === tier.id;
                return (
                  <button
                    key={tier.id}
                    disabled={isSoldOut}
                    onClick={() => { setSelectedTierId(tier.id); setQuantity(1); }}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-950'
                        : isSoldOut
                        ? 'border-gray-800 bg-gray-900 opacity-50 cursor-not-allowed'
                        : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{tier.name}</p>
                        <p className="text-sm text-gray-400">{tier.availableQty} remaining</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">${tier.price.toFixed(2)}</p>
                        <AvailabilityBadge status={tier.availabilityStatus} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Checkout sidebar */}
        <div className="lg:col-span-1">
          <div className="card sticky top-20">
            <h3 className="font-bold text-white text-lg mb-4">Order Summary</h3>

            {selectedTier ? (
              <>
                <p className="text-gray-300 font-medium">{selectedTier.name}</p>
                <p className="text-sm text-gray-500 mb-4">${selectedTier.price.toFixed(2)} per ticket</p>

                {/* Quantity selector */}
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-sm text-gray-400">Quantity</span>
                  <div className="flex items-center gap-2">
                    <button
                      className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white disabled:opacity-40"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold text-white">{quantity}</span>
                    <button
                      className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white disabled:opacity-40"
                      onClick={() => setQuantity((q) => Math.min(selectedTier.availableQty, q + 1))}
                      disabled={quantity >= selectedTier.availableQty}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-800 pt-4 mb-6">
                  <span className="text-gray-400">Total</span>
                  <span className="text-2xl font-bold text-white">${totalPrice}</span>
                </div>

                <button
                  className="btn-primary w-full"
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut ? 'Redirecting...' : isAuthenticated ? 'Checkout with Stripe' : 'Login to Continue'}
                </button>
                <p className="text-xs text-gray-500 text-center mt-3">Secure payment via Stripe</p>
              </>
            ) : (
              <p className="text-gray-500 text-sm">Select a ticket tier to continue.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
