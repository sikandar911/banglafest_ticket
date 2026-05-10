import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth';
import { Spinner } from '../components/ui/Spinner';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputs = useRef<HTMLInputElement[]>([]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { toast.error('Enter the full 6-digit code'); return; }
    setIsLoading(true);
    try {
      await authApi.verifyEmail({ email, otp: code });
      toast.success('Email verified! Please login.');
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authApi.resendOtp(email);
      toast.success('A new code has been sent to your email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-400 font-bold text-2xl">
            <Ticket className="w-7 h-7" /> Banglafest
          </Link>
          <h1 className="text-3xl font-bold text-white mt-4">Verify your email</h1>
          <p className="text-gray-400 mt-1">
            We sent a 6-digit code to <span className="text-white">{email || 'your email'}</span>
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-3 justify-center">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { if (el) inputs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-2xl font-bold rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              ))}
            </div>
            <button type="submit" className="btn-primary w-full" disabled={isLoading}>
              {isLoading ? <Spinner className="w-4 h-4" /> : 'Verify Email'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-sm text-primary-400 hover:text-primary-300 disabled:opacity-50"
            >
              {isResending ? 'Sending...' : "Didn't receive a code? Resend"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
