import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import { PageSpinner } from '../../components/ui/Spinner';
import { RoleBadge } from '../../components/ui/Badge';

const ROLES = ['USER', 'ADMIN', 'SCANNER'];

export function AdminUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', { page }],
    queryFn: () => adminApi.listUsers({ page, limit: 20 }).then((r) => r.data),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => adminApi.updateUserRole(userId, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Role updated'); },
  });

  if (isLoading) return <PageSpinner />;
  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Users <span className="text-gray-500 text-base font-normal">({total})</span></h2>
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
    </div>
  );
}
