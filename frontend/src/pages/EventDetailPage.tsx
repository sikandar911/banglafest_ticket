import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, ArrowLeft, Minus, Plus, Tag, CheckCircle, XCircle, User, Check } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { eventsApi } from "../api/events";
import { ordersApi } from "../api/orders";
import { promoApi } from "../api/promo";
import { PageSpinner } from "../components/ui/Spinner";
import { AvailabilityBadge } from "../components/ui/Badge";
import { useAuth } from "../contexts/AuthContext";

interface AppliedPromo {
  promoCodeId: string;
  code: string;
  discountAmount: number;
  message: string;
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTiers, setSelectedTiers] = useState<Record<string, number>>({});
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Attendee name step
  const [pendingCheckout, setPendingCheckout] = useState<{
    orderId: string;
    totalAmount: number;
    discountAmount: number;
    tierName: string;
    quantity: number;
  } | null>(null);
  const [attendeeNames, setAttendeeNames] = useState<string[]>([]);
  const [isSubmittingNames, setIsSubmittingNames] = useState(false);

  // Restore ticket selection saved before the auth redirect
  useEffect(() => {
    const raw = sessionStorage.getItem('pendingTicketSelection');
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { eventId: string; tierId: string; quantity: number };
      if (saved.eventId === id) {
        setSelectedTiers({ [saved.tierId]: saved.quantity });
        sessionStorage.removeItem('pendingTicketSelection');
      }
    } catch {
      sessionStorage.removeItem('pendingTicketSelection');
    }
  }, [id]);

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
    // Clear applied promo and terms when tier changes
    setAppliedPromo(null);
    setPromoInput('');
    setTermsAccepted(false);
  };

  const handleApplyPromo = async () => {
    const tierId = Object.keys(selectedTiers)[0];
    if (!tierId || !promoInput.trim()) return;
    setIsValidatingPromo(true);
    try {
      const { data } = await promoApi.validate(promoInput.trim(), tierId);
      if (data.valid && data.discountAmount !== undefined) {
        setAppliedPromo({
          promoCodeId: data.promoCodeId!,
          code: data.code!,
          discountAmount: data.discountAmount,
          message: data.message,
        });
        toast.success(data.message);
      } else {
        toast.error(data.message || 'Invalid promo code.');
        setAppliedPromo(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Invalid promo code.');
      setAppliedPromo(null);
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleCheckout = async () => {
    if (Object.keys(selectedTiers).length === 0) {
      toast.error("Please select at least one ticket");
      return;
    }

    if (!isAuthenticated) {
      // Persist the selection so it can be restored after registration/login
      const [[tierId, quantity]] = Object.entries(selectedTiers);
      sessionStorage.setItem(
        'pendingTicketSelection',
        JSON.stringify({ eventId: id, tierId, quantity })
      );
      navigate('/register', { state: { from: location.pathname } });
      return;
    }

    const [[tierId, quantity]] = Object.entries(selectedTiers);
    const tier = event!.ticketTiers.find((t: any) => t.id === tierId);

    setIsCheckingOut(true);
    try {
      const { data: orderData } = await ordersApi.create({
        tierId,
        quantity,
        promoCode: appliedPromo?.code,
      });
      // Show attendee name form before proceeding to checkout
      setPendingCheckout({
        orderId: orderData.orderId,
        totalAmount: orderData.totalAmount,
        discountAmount: orderData.discountAmount ?? 0,
        tierName: tier?.name ?? '',
        quantity,
      });
      setAttendeeNames(Array(quantity).fill(''));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create order");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleProceedToCheckout = async () => {
    if (!pendingCheckout) return;
    setIsSubmittingNames(true);
    try {
      await ordersApi.setAttendeeNames(pendingCheckout.orderId, attendeeNames);
      navigate('/checkout', {
        state: {
          orderId: pendingCheckout.orderId,
          totalAmount: pendingCheckout.totalAmount,
          discountAmount: pendingCheckout.discountAmount,
          tierName: pendingCheckout.tierName,
          eventTitle: event!.title,
          quantity: pendingCheckout.quantity,
        },
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save attendee names');
      setIsSubmittingNames(false);
    }
  };

  if (isLoading) return <PageSpinner />;
  if (!event) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-gray-400">Event not found.</p>
    </div>
  );

  // Attendee name step — shown after order creation
  if (pendingCheckout) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <button
          onClick={() => setPendingCheckout(null)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-2xl font-bold text-white mb-1">On ticket Names</h2>
        <p className="text-gray-400 text-sm mb-6">
          Enter a name for each ticket (optional — leave blank to use your account name).
        </p>
        <div className="space-y-3">
          {Array.from({ length: pendingCheckout.quantity }, (_, i) => (
            <div key={i}>
              <label className="block text-sm text-gray-300 mb-1">
                <User className="inline w-3.5 h-3.5 mr-1" />Ticket {i + 1}
              </label>
              <input
                type="text"
                maxLength={100}
                value={attendeeNames[i] ?? ''}
                onChange={(e) => {
                  const updated = [...attendeeNames];
                  updated[i] = e.target.value;
                  setAttendeeNames(updated);
                }}
                placeholder="Leave blank to use your account name"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleProceedToCheckout}
          disabled={isSubmittingNames}
          className="mt-8 w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
        >
          {isSubmittingNames ? 'Saving...' : 'Continue to Payment'}
        </button>
      </div>
    );
  }

  const totalPrice = Object.entries(selectedTiers).reduce((sum, [tierId, qty]) => {
    const tier = event.ticketTiers.find((t: any) => t.id === tierId);
    return sum + (tier ? tier.price * qty : 0);
  }, 0);

  const promoDiscount = appliedPromo
    ? appliedPromo.discountAmount * Object.values(selectedTiers).reduce((a, b) => a + b, 0)
    : 0;
  const finalPrice = Math.max(0, totalPrice - promoDiscount);

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
                          <p className="text-lg font-bold text-white">£{Number(tier.price).toFixed(2)}</p>
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
                        <span>£{subtotal.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400">Total Tickets</span>
                  <span className="font-semibold text-white">{totalTickets}</span>
                </div>

                {/* Promo Code */}
                <div className="mb-4">
                  {!appliedPromo ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                        <input
                          className="w-full rounded-lg bg-gray-800 border border-gray-700 pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 uppercase tracking-widest"
                          placeholder="Promo code"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                        />
                      </div>
                      <button
                        onClick={handleApplyPromo}
                        disabled={isValidatingPromo || !promoInput.trim()}
                        className="rounded-lg bg-gray-700 hover:bg-gray-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 transition-colors"
                      >
                        {isValidatingPromo ? '…' : 'Apply'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg bg-green-950 border border-green-800 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        <span className="text-xs text-green-300 font-mono font-semibold">{appliedPromo.code}</span>
                        <span className="text-xs text-green-400">−£{promoDiscount.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => { setAppliedPromo(null); setPromoInput(''); }}
                        className="text-green-600 hover:text-green-400"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {promoDiscount > 0 && (
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-gray-400">£{totalPrice.toFixed(2)}</span>
                  </div>
                )}
                {promoDiscount > 0 && (
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-green-400">Promo discount</span>
                    <span className="text-green-400">−£{promoDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-6">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary-400">£{finalPrice.toFixed(2)}</span>
                </div>

                {/* Terms & Conditions Checkbox */}
                <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="w-5 h-5 mt-0.5 rounded border-gray-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-300 flex-1">
                      I agree to the{' '}
                      <a
                        href="/terms-and-conditions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-400 hover:text-primary-300 underline font-medium"
                      >
                        Terms & Conditions
                      </a>
                      . I understand that{' '}
                      <span className="font-semibold text-white">tickets are non-refundable</span>, and my
                      personal data will be kept secure and confidential.
                    </span>
                  </label>
                </div>

                <button
                  className="w-full btn-primary py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  onClick={handleCheckout}
                  disabled={isCheckingOut || !termsAccepted}
                >
                  {termsAccepted && <Check className="w-4 h-4" />}
                  {isCheckingOut 
                    ? "Processing..." 
                    : isAuthenticated
                    ? "Proceed to Payment"
                    : "Register to Buy Tickets"}
                </button>
                {!termsAccepted && totalTickets > 0 && (
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Please accept the Terms & Conditions to continue
                  </p>
                )}
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
