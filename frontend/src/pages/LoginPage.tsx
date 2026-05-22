import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Ticket, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      const errorMsg = error?.response?.data?.error || 'Login failed';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleFieldChange = (field: 'email' | 'password', value: string) => {
    setForm({ ...form, [field]: value });
    setError(''); // Clear error as soon as user modifies field
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-400 font-bold text-2xl">
            <Ticket className="w-7 h-7" /> Banglafest
          </Link>
          <h1 className="text-3xl font-bold text-white mt-4">Welcome back</h1>
          <p className="text-gray-400 mt-1">Sign in to your account</p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className={`input ${error ? 'border-red-500/50' : ''}`}
                placeholder="john@example.com"
                value={form.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-sm text-primary-400 hover:text-primary-300">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                className={`input ${error ? 'border-red-500/50' : ''}`}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={isLoading}>
              {isLoading ? <Spinner className="w-4 h-4" /> : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 mt-4">
          Don't have an account?{' '}
          <Link to="/register" state={{ from }} className="text-primary-400 hover:text-primary-300 font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
