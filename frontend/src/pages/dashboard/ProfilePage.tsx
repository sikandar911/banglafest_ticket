import { useQuery } from '@tanstack/react-query';
import { Mail, User as UserIcon, Shield } from 'lucide-react';
import { userApi } from '../../api/user';
import { PageSpinner } from '../../components/ui/Spinner';
import { RoleBadge } from '../../components/ui/Badge';
import { format } from 'date-fns';

export function ProfilePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => userApi.getProfile().then((r) => r.data),
  });

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
    </div>
  );
}
