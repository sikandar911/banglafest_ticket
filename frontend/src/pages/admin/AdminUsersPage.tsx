import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { UserPlus, X } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { PageSpinner } from '../../components/ui/Spinner';
import { RoleBadge } from '../../components/ui/Badge';

const ROLES = ['USER', 'ADMIN', 'SCANNER', 'SALES_EXECUTIVE'];
const STAFF_ROLES = ['SCANNER', 'SALES_EXECUTIVE'];

interface CreateUserForm {
  name: string;
  email: string;
  role: string;
  password: string;
}

export function AdminUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<CreateUserForm>({ name: '', email: '', role: 'SCANNER', password: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', { page }],
    queryFn: () => adminApi.listUsers({ page, limit: 20 }).then((r) => r.data),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => adminApi.updateUserRole(userId, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Role updated'); },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserForm) => adminApi.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User created and welcome email sent.');
      setShowCreateModal(false);
      setForm({ name: '', email: '', role: 'SCANNER', password: '' });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'Failed to create user.');
    },
  });

  if (isLoading) return <PageSpinner />;
  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Users <span className="text-gray-500 text-base font-normal">({total})</span></h2>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => setShowCreateModal(true)}>
          <UserPlus className="w-4 h-4" />
          Create Staff User
        </button>
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-white">{user.name}</p>
              <p className="text-sm text-gray-400">{user.email}</p>
              <p className="text-xs text-gray-500">{format(new Date(user.createdAt), 'MMM d, yyyy')}</p>
            </div>
            <div className="flex items-center gap-3">
              <RoleBadge role={user.role} />
              <select
                className="input w-auto text-sm py-1.5"
                value={user.role}
                onChange={(e) => roleMutation.mutate({ userId: user.id, role: e.target.value })}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className="btn-secondary text-sm py-1.5" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
          <button className="btn-secondary text-sm py-1.5" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {/* Create Staff User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Create Staff User</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                <input
                  className="input w-full"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  className="input w-full"
                  type="email"
                  placeholder="staff@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <select
                  className="input w-full"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>{r === 'SALES_EXECUTIVE' ? 'Sales Executive' : 'Scanner'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Temporary Password</label>
                <input
                  className="input w-full"
                  type="text"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">The user will receive this password by email and should change it after first login.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button
                className="btn-primary flex-1"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
