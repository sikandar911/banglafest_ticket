import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-white mb-3">Payment Successful!</h1>
        <p className="text-gray-400 mb-2">Your tickets have been confirmed.</p>
        <p className="text-gray-400 mb-8">Check your email for the ticket confirmation with QR codes.</p>
        {orderId && (
          <p className="text-sm text-gray-500 mb-6">Order ID: <span className="font-mono text-gray-400">{orderId}</span></p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/dashboard/tickets" className="btn-primary">View My Tickets</Link>
          <Link to="/" className="btn-secondary">Browse More Events</Link>
        </div>
      </div>
    </div>
  );
}
