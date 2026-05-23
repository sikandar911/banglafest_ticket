import { useQuery, useMutation } from '@tanstack/react-query';
import { Mail, User as UserIcon, Shield, Lock, Camera } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../api/user';
import { PageSpinner } from '../../components/ui/Spinner';
import { RoleBadge } from '../../components/ui/Badge';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export function ProfilePage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => userApi.getProfile().then((r) => r.data),
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const changePasswordMutation = useMutation({
    mutationFn: () => userApi.changePassword(currentPassword, newPassword).then((r) => r.data),
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to change password';
      toast.error(errorMessage);
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    changePasswordMutation.mutate();
  };

  if (isLoading) return <PageSpinner />;
  const user = data?.user;
  if (!user) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">My Profile</h2>

      <div className="card space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-800 flex items-center justify-center text-2xl font-bold text-primary-200">
            {user.name[0].toUpperCase()}
          </div>
          <div>
            <p className="text-xl font-bold text-white">{user.name}</p>
            <RoleBadge role={user.role} />
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">Email</span>
            <span className="text-white ml-auto">{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Shield className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">Verified</span>
            <span className={`ml-auto font-medium ${user.isVerified ? 'text-green-400' : 'text-red-400'}`}>
              {user.isVerified ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <UserIcon className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">Member since</span>
            <span className="text-white ml-auto">{format(new Date(user.createdAt), 'MMM d, yyyy')}</span>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Password
          </h3>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="btn-secondary py-1.5 text-sm"
          >
            {showPasswordForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="border-t border-gray-800 pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="w-full btn-primary py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        )}
      </div>

      {/* Scanner Button - visible only to SCANNER and ADMIN roles */}
      {(user.role === 'SCANNER' || user.role === 'ADMIN') && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-primary-400" />
              <div>
                <h3 className="text-lg font-bold text-white">Scanner</h3>
                <p className="text-sm text-gray-400">Access ticket scanning interface</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/scanner')}
              className="w-full sm:w-auto btn-primary py-2.5 px-6 text-sm font-medium whitespace-nowrap"
            >
              Open Scanner
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
