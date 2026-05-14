import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, ArrowLeft, Minus, Plus } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { eventsApi } from "../api/events";
import { ordersApi } from "../api/orders";
import { PageSpinner } from "../components/ui/Spinner";
import { AvailabilityBadge } from "../components/ui/Badge";
import { useAuth } from "../contexts/AuthContext";

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedTiers, setSelectedTiers] = useState<Record<string, number>>({});
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => eventsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const event = data?.event;

  const handleQuantityChange = (tierId: string, newQty: number, tier: any) => {
    if (newQty < 0) return;
    if (newQty > tier.maxPerPerson) {
      toast.error(`Max ${tier.maxPerPerson} tickets per person for ${tier.name}`);
      return;
    }
    if (newQty > tier.availableQty) {
      toast.error(`Only ${tier.availableQty} tickets available for ${tier.name}`);
      return;
    }

    if (newQty === 0) {
      setSelectedTiers((prev) => {
        const newState = { ...prev };
        delete newState[tierId];
        return newState;
      });
    } else {
      // Single-tier selection only: clear other tiers when selecting a new one
      setSelectedTiers({ [tierId]: newQty });
    }
  };

  const handleCheckout = async () => {
    if (Object.keys(selectedTiers).length === 0) {
      toast.error("Please select at least one ticket");
      return;
    }

    if (!isAuthenticated) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    const [[tierId, quantity]] = Object.entries(selectedTiers);

    setIsCheckingOut(true);
    try {
      const { data: orderData } = await ordersApi.create({ tierId, quantity });
      await ordersApi.confirm(orderData.orderId);
      navigate(`/checkout/success?orderId=${orderData.orderId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to confirm booking");
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

  const totalPrice = Object.entries(selectedTiers).reduce((sum, [tierId, qty]) => {
    const tier = event.ticketTiers.find((t: any) => t.id === tierId);
    return sum + (tier ? tier.price * qty : 0);
  }, 0);

  const totalTickets = Object.values(selectedTiers).reduce((sum, qty) => sum + qty, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to events
      </button>

      {event.imageUrl && (
        <div className="relative h-56 sm:h-72 rounded-2xl overflow-hidden mb-8">
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 to-transparent" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Event info */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-3">{event.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-primary-400" />
                {format(new Date(event.startTime), "EEEE, MMMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-gray-600" />
                {format(new Date(event.startTime), "h:mm a")} — {format(new Date(event.endTime), "h:mm a")}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary-400" />
                {event.location || "TBA"}
              </span>
            </div>
          </div>

          {event.description && (
            <div className="card">
              <h2 className="font-semibold text-white mb-2">About This Event</h2>
              <p className="text-gray-400 whitespace-pre-line">{event.description}</p>
            </div>
          )}

          {/* Ticket tiers */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Select Your Tickets</h2>
            {event.ticketTiers.length === 0 ? (
              <div className="card text-center py-8 text-gray-400">
                No tickets available
              </div>
            ) : (
              <div className="space-y-4">
                {event.ticketTiers.map((tier: any) => {
                  const isSoldOut = tier.availableQty === 0;
                  const selectedQty = selectedTiers[tier.id] || 0;
                  return (
                    <div
                      key={tier.id}
                      className={`rounded-xl border p-4 transition-all ${
                        selectedQty > 0
                          ? "border-primary-500 bg-primary-950"
                          : isSoldOut
                          ? "border-gray-800 bg-gray-900 opacity-50"
                          : "border-gray-800 bg-gray-900"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-white">{tier.name}</p>
                          {tier.description && (
                            <p className="text-sm text-gray-400 mt-1">{tier.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">${Number(tier.price).toFixed(2)}</p>
                          <AvailabilityBadge status={tier.availabilityStatus} />
                        </div>
                      </div>

                      {/* Features */}
                      {tier.features && tier.features.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {tier.features.map((feature: string, idx: number) => (
                            <span 
                              key={idx}
                              className="bg-primary-700 text-primary-100 px-2 py-1 rounded text-xs"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                          {tier.availableQty} available • Max {tier.maxPerPerson} per person
                        </div>

                        {!isSoldOut && (
                          <div className="flex items-center gap-2">
                            <button
                              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white disabled:opacity-40"
                              onClick={() => handleQuantityChange(tier.id, selectedQty - 1, tier)}
                              disabled={selectedQty === 0}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center font-semibold text-white">
                              {selectedQty}
                            </span>
                            <button
                              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white disabled:opacity-40"
                              onClick={() => handleQuantityChange(tier.id, selectedQty + 1, tier)}
                              disabled={selectedQty >= tier.maxPerPerson || selectedQty >= tier.availableQty}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {isSoldOut && (
                          <span className="text-red-400 font-semibold text-sm">SOLD OUT</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Checkout sidebar */}
        <div className="lg:col-span-1">
          <div className="card sticky top-20">
            <h3 className="font-bold text-white text-lg mb-4">Order Summary</h3>

            {totalTickets > 0 ? (
              <>
                <div className="space-y-2 mb-4 pb-4 border-b border-gray-800">
                  {Object.entries(selectedTiers).map(([tierId, qty]) => {
                    const tier = event.ticketTiers.find((t: any) => t.id === tierId);
                    if (!tier) return null;
                    const subtotal = Number(tier.price) * qty;
                    return (
                      <div key={tierId} className="flex items-center justify-between text-gray-300 text-sm">
                        <span>{tier.name} × {qty}</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400">Total Tickets</span>
                  <span className="font-semibold text-white">{totalTickets}</span>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary-400">${totalPrice.toFixed(2)}</span>
                </div>

                <button
                  className="w-full btn-primary py-3 font-semibold disabled:opacity-50"
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut 
                    ? "Processing..." 
                    : isAuthenticated
                    ? "Confirm Booking"
                    : "Login to Book Tickets"}
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-500 text-sm">Select a ticket tier to continue.</p>
                <p className="text-xs text-gray-600 bg-gray-800 rounded px-2 py-1.5">
                  💡 You can only purchase one ticket tier type per order.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
