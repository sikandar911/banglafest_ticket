import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';
// toast used inside mutation onSuccess
import { authApi } from '../api/auth';
import { Spinner } from '../components/ui/Spinner';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-400 font-bold text-2xl">
            <Ticket className="w-7 h-7" /> Banglafest
          </Link>
          <h1 className="text-3xl font-bold text-white mt-4">Reset password</h1>
          <p className="text-gray-400 mt-1">Enter your email and we'll send a reset link</p>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center py-4">
              <p className="text-green-400 font-medium">Reset link sent!</p>
              <p className="text-gray-400 text-sm mt-2">Check your inbox and follow the link to reset your password.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                {isLoading ? <Spinner className="w-4 h-4" /> : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-gray-400 mt-4">
          <Link to="/login" className="text-primary-400 hover:text-primary-300">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
