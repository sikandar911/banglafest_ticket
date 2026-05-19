import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { salesApi } from '../../api/sales';
import type { TicketTier, Event } from '../../types';
import { PageSpinner } from '../../components/ui/Spinner';

type Step = 1 | 2 | 3 | 4;

interface AttendeeInfo {
  name: string;
  email: string;
}

interface OtpInfo {
  attendeeId: string;
  saleToken?: string;
  attendee?: { id: string; name: string; email: string };
}

interface SaleResult {
  message: string;
  order: any;
  tickets: any[];
  attendee: { id: string; name: string; email: string };
  event: { title: string; location?: string; startTime: string };
  tier: { name: string; price: number };
}

export function SalesNewSalePage() {
  const [step, setStep] = useState<Step>(1);
  const [attendee, setAttendee] = useState<AttendeeInfo>({ name: '', email: '' });
  const [otpValue, setOtpValue] = useState('');
  const [otpInfo, setOtpInfo] = useState<OtpInfo | null>(null);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD_MACHINE'>('CASH');
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['sales-events'],
    queryFn: () => salesApi.getEvents().then((r) => r.data),
    enabled: step === 3,
  });

  const initiateMutation = useMutation({
    mutationFn: () => salesApi.initiateSale({ attendeeName: attendee.name, attendeeEmail: attendee.email }),
    onSuccess: (res) => {
      setOtpInfo({ attendeeId: res.data.attendeeId });
      toast.success(`Verification code sent to ${attendee.email}`);
      setStep(2);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to send OTP.'),
  });

  const verifyMutation = useMutation({
    mutationFn: () => salesApi.verifyOtp({ attendeeId: otpInfo!.attendeeId, otp: otpValue }),
    onSuccess: (res) => {
      setOtpInfo((prev) => ({ ...prev!, saleToken: res.data.saleToken, attendee: res.data.attendee }));
      toast.success('OTP verified!');
      setStep(3);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Invalid OTP.'),
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      salesApi.completeSale({
        saleToken: otpInfo!.saleToken!,
        tierId: selectedTierId,
        quantity,
        paymentMethod,
      }),
    onSuccess: (res) => {
      setSaleResult(res.data);
      setStep(4);
      toast.success(res.data.message);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to complete sale.'),
  });

  // Find selected tier info
  const allTiers: Array<TicketTier & { event: Event }> = [];
  eventsData?.events?.forEach((event: Event) => {
    event.ticketTiers?.forEach((tier) => {
      allTiers.push({ ...tier, event });
    });
  });
  const selectedTier = allTiers.find((t) => t.id === selectedTierId);
  const totalCost = selectedTier ? Number(selectedTier.price) * quantity : 0;

  const resetSale = () => {
    setStep(1);
    setAttendee({ name: '', email: '' });
    setOtpValue('');
    setOtpInfo(null);
    setSelectedTierId('');
    setQuantity(1);
    setPaymentMethod('CASH');
    setSaleResult(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">New Sale</h2>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['Attendee Info', 'Verify Email', 'Choose Ticket', 'Complete'] as const).map((label, i) => {
          const s = (i + 1) as Step;
          const isActive = step === s;
          const isDone = step > s;
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="w-3 h-3 text-gray-600" />}
              <span
                className={`flex items-center gap-1 font-medium ${
                  isActive ? 'text-orange-400' : isDone ? 'text-green-400' : 'text-gray-500'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-xs">{s}</span>}
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step 1: Attendee Info */}
      {step === 1 && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-white">Step 1: Attendee Details</h3>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Attendee Full Name</label>
            <input
              className="input w-full"
              placeholder="John Smith"
              value={attendee.name}
              onChange={(e) => setAttendee({ ...attendee, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Attendee Email</label>
            <input
              className="input w-full"
              type="email"
              placeholder="attendee@example.com"
              value={attendee.email}
              onChange={(e) => setAttendee({ ...attendee, email: e.target.value })}
            />
          </div>
          <p className="text-xs text-gray-500">
            A 6-digit verification code will be sent to the attendee's email.
          </p>
          <button
            className="btn-primary w-full"
            disabled={!attendee.name.trim() || !attendee.email.trim() || initiateMutation.isPending}
            onClick={() => initiateMutation.mutate()}
          >
            {initiateMutation.isPending ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending Code...</span>
            ) : 'Send Verification Code'}
          </button>
        </div>
      )}

      {/* Step 2: Verify OTP */}
      {step === 2 && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-white">Step 2: Verify Email</h3>
          <p className="text-sm text-gray-400">
            A 6-digit code has been sent to <strong className="text-white">{attendee.email}</strong>.
            Ask the attendee to share it with you.
          </p>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Verification Code</label>
            <input
              className="input w-full text-center text-2xl tracking-widest"
              maxLength={6}
              placeholder="000000"
              value={otpValue}
              onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setStep(1)}>Back</button>
            <button
              className="btn-primary flex-1"
              disabled={otpValue.length !== 6 || verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}
            >
              {verifyMutation.isPending ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</span>
              ) : 'Verify Code'}
            </button>
          </div>
          <button
            className="text-xs text-orange-400 underline w-full text-center"
            onClick={() => initiateMutation.mutate()}
            disabled={initiateMutation.isPending}
          >
            Resend code
          </button>
        </div>
      )}

      {/* Step 3: Choose event/tier */}
      {step === 3 && (
        <div className="card space-y-5">
          <h3 className="font-semibold text-white">Step 3: Choose Ticket</h3>
          <p className="text-sm text-gray-400">Attendee: <strong className="text-white">{otpInfo?.attendee?.name} ({otpInfo?.attendee?.email})</strong></p>

          {eventsLoading ? (
            <PageSpinner />
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Select Event & Tier</label>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {eventsData?.events?.map((event: Event) => (
                    <div key={event.id} className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wider px-1">
                        {event.title} — {format(new Date(event.startTime), 'MMM d, yyyy')}
                      </p>
                      {event.ticketTiers?.map((tier) => (
                        <button
                          key={tier.id}
                          onClick={() => setSelectedTierId(tier.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                            selectedTierId === tier.id
                              ? 'border-orange-500 bg-orange-900/30 text-white'
                              : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{tier.name}</span>
                            <span className="text-orange-400 font-semibold">£{Number(tier.price).toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{tier.availableQty} remaining</p>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {selectedTierId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                      <select
                        className="input w-full"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                      >
                        {Array.from({ length: Math.min(selectedTier?.maxPerPerson ?? 10, selectedTier?.availableQty ?? 10) }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Payment Method</label>
                      <select
                        className="input w-full"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'CARD_MACHINE')}
                      >
                        <option value="CASH">Cash</option>
                        <option value="CARD_MACHINE">Card Machine</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>{selectedTier?.name} × {quantity}</span>
                      <span>£{totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white mt-1">
                      <span>Total</span>
                      <span className="text-orange-400">£{totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setStep(2)}>Back</button>
                <button
                  className="btn-primary flex-1"
                  disabled={!selectedTierId || completeMutation.isPending}
                  onClick={() => completeMutation.mutate()}
                >
                  {completeMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing...</span>
                  ) : `Complete Sale — £${totalCost.toFixed(2)}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && saleResult && (
        <div className="card space-y-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />
            <div>
              <h3 className="font-bold text-white text-lg">Sale Complete!</h3>
              <p className="text-sm text-gray-400">{saleResult.message}</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Attendee</span>
              <span className="text-white">{saleResult.attendee.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span className="text-white">{saleResult.attendee.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Event</span>
              <span className="text-white">{saleResult.event.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tier</span>
              <span className="text-white">{saleResult.tier.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tickets</span>
              <span className="text-white">{saleResult.tickets.length}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-gray-400">Total Charged</span>
              <span className="text-orange-400">£{Number(saleResult.order.totalAmount).toFixed(2)}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Ticket PDF(s) have been sent to the attendee's email.
          </p>

          <button className="btn-primary w-full" onClick={resetSale}>
            Start Another Sale
          </button>
        </div>
      )}
    </div>
  );
}
