import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth';
import { Spinner } from '../components/ui/Spinner';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setIsLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword: form.newPassword });
      toast.success('Password reset! Please login with your new password.');
      navigate('/login');
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
          <h1 className="text-3xl font-bold text-white mt-4">Set new password</h1>
        </div>

        <div className="card">
          {!token ? (
            <p className="text-red-400 text-center">Invalid or missing reset token.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="At least 8 characters"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                {isLoading ? <Spinner className="w-4 h-4" /> : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
