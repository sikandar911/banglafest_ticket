import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Lock, ShieldCheck, ArrowLeft, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import { stripeApi } from '../api/stripe';
import { ordersApi } from '../api/orders';
import { PageSpinner } from '../components/ui/Spinner';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const stripeAppearance = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#e94560',
    colorBackground: '#111827',
    colorText: '#f9fafb',
    colorTextSecondary: '#9ca3af',
    colorDanger: '#ef4444',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSizeBase: '15px',
    borderRadius: '10px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
      boxShadow: 'none',
    },
    '.Input:focus': {
      border: '1px solid #e94560',
      boxShadow: '0 0 0 2px rgba(233,69,96,0.15)',
    },
    '.Label': {
      color: '#9ca3af',
      fontWeight: '500',
      marginBottom: '6px',
    },
    '.Tab': {
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
    },
    '.Tab--selected': {
      border: '1px solid #e94560',
      backgroundColor: '#e94560',
    },
  },
};

interface OrderState {
  orderId: string;
  totalAmount: number;
  tierName: string;
  eventTitle: string;
  quantity: number;
}

export function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as OrderState | null;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state?.orderId) {
      navigate('/', { replace: true });
      return;
    }
    stripeApi
      .createPaymentIntent(state.orderId)
      .then((r) => setClientSecret(r.data.clientSecret))
      .catch(() => {
        toast.error('Failed to initialise payment. Please try again.');
        navigate(-1);
      })
      .finally(() => setLoading(false));
  }, [state?.orderId]);

  if (loading || !state) return <PageSpinner />;
  if (!clientSecret) return null;

  return (
    <div className="min-h-[80vh] flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Order summary card */}
        <div className="card mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary-900 flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5 text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{state.eventTitle}</p>
              <p className="text-gray-400 text-sm mt-0.5">{state.tierName} × {state.quantity}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-white">£{state.totalAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-0.5">GBP</p>
            </div>
          </div>
        </div>

        {/* Payment form */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-primary-400" />
            <h2 className="font-semibold text-white">Payment Details</h2>
          </div>

          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: stripeAppearance }}
          >
            <PaymentForm orderId={state.orderId} amount={state.totalAmount} />
          </Elements>

          <div className="flex items-center justify-center gap-2 mt-5 text-xs text-gray-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secured by Stripe — your card details never touch our servers
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentForm({ orderId, amount }: { orderId: string; amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?orderId=${orderId}`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message ?? 'Payment failed. Please try again.');
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      try {
        await ordersApi.confirm(orderId);
      } catch {
        // Webhook may have already confirmed — safe to continue
      }
      navigate(`/checkout/success?orderId=${orderId}`, { replace: true });
      return;
    }

    setErrorMessage('Unexpected payment status. Please contact support.');
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card'],
        }}
      />

      {errorMessage && (
        <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full btn-primary py-3.5 font-semibold text-base disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Processing…
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Pay £{amount.toFixed(2)}
          </>
        )}
      </button>

      {/* Test mode hint */}
      {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test') && (
        <p className="text-center text-xs text-gray-600">
          Test mode · use card <span className="font-mono text-gray-500">4242 4242 4242 4242</span>
        </p>
      )}
    </form>
  );
}
