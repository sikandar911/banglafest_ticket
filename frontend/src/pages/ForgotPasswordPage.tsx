import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
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
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error?.response?.data?.error || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      toast.success('Reset link resent!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error?.response?.data?.error || 'Failed to resend reset link');
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
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <Mail className="w-12 h-12 text-primary-400" />
              </div>
              <div>
                <p className="text-white font-medium">Check your email</p>
                <p className="text-gray-400 text-sm mt-1">We've sent a password reset link to:</p>
                <p className="text-primary-400 font-medium mt-2">{email}</p>
              </div>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3 text-sm text-blue-300">
                <p>The reset link will expire in <strong>1 hour</strong></p>
              </div>
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="text-sm text-primary-400 hover:text-primary-300 font-medium"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="w-4 h-4" /> Resending...
                  </span>
                ) : (
                  'Didn\'t receive it? Resend'
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
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
