import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ticket, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth';
import { Spinner } from '../components/ui/Spinner';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!form.email.trim()) {
      setEmailStatus('idle');
      return;
    }

    // First check format
    if (!EMAIL_REGEX.test(form.email)) {
      setEmailStatus('invalid');
      return;
    }

    // Debounce API call
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    setEmailStatus('checking');
    debounceTimer.current = setTimeout(async () => {
      try {
        const { data } = await authApi.checkEmail(form.email);
        setEmailStatus(data.available ? 'available' : 'taken');
      } catch (err) {
        setEmailStatus('idle');
      }
    }, 600);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [form.email]);

  const isEmailValid = emailStatus === 'available';
  const isPasswordValid = form.password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid || !isPasswordValid) return;

    setIsLoading(true);
    try {
      await authApi.register(form);
      toast.success('Account created! Please check your email for the verification code.');
      navigate('/verify-email', { state: { email: form.email } });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error?.response?.data?.error || 'Registration failed');
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
          <h1 className="text-3xl font-bold text-white mt-4">Create account</h1>
          <p className="text-gray-400 mt-1">Join the festival community</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <input
                  type="email"
                  className={`input pr-10 ${
                    emailStatus === 'taken' ? 'border-red-500' : 
                    emailStatus === 'available' ? 'border-green-500' : ''
                  }`}
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {emailStatus === 'checking' && <Spinner className="w-4 h-4 text-primary-400" />}
                  {emailStatus === 'available' && <Check className="w-4 h-4 text-green-500" />}
                  {emailStatus === 'taken' && <X className="w-4 h-4 text-red-500" />}
                  {emailStatus === 'invalid' && <X className="w-4 h-4 text-red-500" />}
                </div>
              </div>
              {emailStatus === 'taken' && (
                <p className="text-red-400 text-sm mt-1">Email already registered</p>
              )}
              {emailStatus === 'invalid' && form.email && (
                <p className="text-red-400 text-sm mt-1">Invalid email format</p>
              )}
              {emailStatus === 'available' && (
                <p className="text-green-400 text-sm mt-1">Email available</p>
              )}
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className={`input ${!isPasswordValid && form.password ? 'border-red-500' : ''}`}
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
              {!isPasswordValid && form.password && (
                <p className="text-red-400 text-sm mt-1">Password must be at least 8 characters</p>
              )}
            </div>
            <button 
              type="submit" 
              className="btn-primary w-full" 
              disabled={!isEmailValid || !isPasswordValid || isLoading}
            >
              {isLoading ? <Spinner className="w-4 h-4" /> : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
