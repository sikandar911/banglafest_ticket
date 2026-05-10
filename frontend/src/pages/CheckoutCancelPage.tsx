import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export function CheckoutCancelPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <XCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-white mb-3">Payment Cancelled</h1>
        <p className="text-gray-400 mb-8">Your order was cancelled. No charges were made.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-primary">Back to Events</Link>
          <Link to="/dashboard/orders" className="btn-secondary">My Orders</Link>
        </div>
      </div>
    </div>
  );
}
