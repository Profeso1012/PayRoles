import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldOff, ShieldCheck } from 'lucide-react';
import { apiClient, apiClientWithMeta } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { formatDate, generateTempPassword } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import type { BackendPlatformUser, CreatePlatformUserRequest, BackendPlatformRole } from '@/lib/api/types';

const ROLE_LABELS: Record<BackendPlatformRole, string> = {
  super_admin: 'Super Admin',
  platform_admin: 'Platform Admin',
  support_engineer: 'Support Engineer',
  auditor: 'Auditor',
  devops: 'DevOps',
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

const blankForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: generateTempPassword(),
  platformRole: 'support_engineer' as BackendPlatformRole,
};

export default function SAUsers() {
  const qc = useQueryClient();
  const toast = useToast();
  const currentUser = useAuthStore((s) => s.user);
  // Mirrors PLATFORM_ROLE_PERMISSIONS (platform-roles.enum.ts):
  // PLATFORM_USER_READ - super_admin, platform_admin, support_engineer.
  // PLATFORM_USER_WRITE - super_admin, platform_admin.
  // disable/enable - super_admin only.
  const canRead =
    currentUser?.platformRole === 'super_admin' ||
    currentUser?.platformRole === 'platform_admin' ||
    currentUser?.platformRole === 'support_engineer';
  const canWrite = currentUser?.platformRole === 'super_admin' || currentUser?.platformRole === 'platform_admin';
  const canDisable = currentUser?.platformRole === 'super_admin';

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [formError, setFormError] = useState('');
  const [disableTarget, setDisableTarget] = useState<BackendPlatformUser | null>(null);

  const { data: users, isLoading, isError, refetch } = useQuery<BackendPlatformUser[]>({
    queryKey: ['platform-users'],
    queryFn: async () => {
      const params = buildPaginationParams({ page: 1, limit: 100 });
      const { data } = await apiClientWithMeta<BackendPlatformUser[]>(`${ENDPOINTS.PLATFORM_USERS.LIST}?${params}`);
      return data;
    },
    enabled: canRead,
  });

  const createMutation = useMutation({
    mutationFn: (body: CreatePlatformUserRequest) =>
      apiClient(ENDPOINTS.PLATFORM_USERS.CREATE, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['platform-users'] });
      toast.success(`Platform user created for ${vars.email}`, `Share the temporary password with them directly: ${vars.password}`);
      resetForm();
    },
    onError: (err) => toast.error('Failed to create platform user', err instanceof Error ? err.message : undefined),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => apiClient(ENDPOINTS.PLATFORM_USERS.DISABLE(id), { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-users'] });
      toast.success('Platform user disabled');
      setDisableTarget(null);
    },
    onError: (err) => toast.error('Failed to disable platform user', err instanceof Error ? err.message : undefined),
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => apiClient(ENDPOINTS.PLATFORM_USERS.ENABLE(id), { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-users'] });
      toast.success('Platform user re-enabled');
    },
    onError: (err) => toast.error('Failed to enable platform user', err instanceof Error ? err.message : undefined),
  });

  function resetForm() {
    setForm({ ...blankForm, password: generateTempPassword() });
    setFormError('');
    setAddOpen(false);
  }

  function handleSubmit() {
    if (!form.firstName.trim() || !form.lastName.trim()) return setFormError('First and last name are required');
    if (!form.email.trim() || !form.email.includes('@')) return setFormError('A valid email is required');
    if (form.password.length < 10) return setFormError('Password must be at least 10 characters');
    setFormError('');
    createMutation.mutate(form);
  }

  if (!canRead) {
    return (
      <div className="p-6 max-w-[900px] mx-auto">
        <div className="bg-white border border-mint-light rounded-xl p-8 text-center text-cash-green/70 text-sm">
          You don't have permission to view platform users.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Failed to load platform users." onRetry={() => refetch()} />;
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-semibold text-deep-cash">Platform Users</h1>
          <p className="text-sm text-cash-green/70 mt-0.5">Manage platform administrators and staff</p>
        </div>
        {canWrite && (
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus size={16} className="mr-2" />
            Add Platform User
          </Button>
        )}
      </div>

      <div className="bg-white border border-mint-light rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mint-light bg-soft-white">
                {['Name', 'Email', 'Role', 'Status', 'Last Login', ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-cash-green/70 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-cash-green/50 text-sm">
                    No platform users found.
                  </td>
                </tr>
              ) : (
                (users ?? []).map((u) => {
                  const isCurrentUser = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="border-b border-mint-light/60 hover:bg-soft-white transition-colors">
                      <td className="px-6 py-4 font-medium text-deep-cash">
                        {u.firstName} {u.lastName}
                        {isCurrentUser && (
                          <span className="ml-2 text-[10px] font-semibold text-cash-green bg-mint-light px-1.5 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-cash-green/80">{u.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant="info" label={ROLE_LABELS[u.platformRole as BackendPlatformRole] ?? u.platformRole} />
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={u.isActive ? 'success' : 'error'} label={u.isActive ? 'Active' : 'Disabled'} />
                      </td>
                      <td className="px-6 py-4 text-cash-green/70">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</td>
                      <td className="px-6 py-4">
                        {canDisable && !isCurrentUser && (
                          u.isActive ? (
                            <Button variant="danger" size="sm" onClick={() => setDisableTarget(u)}>
                              <ShieldOff size={13} />
                              Disable
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={enableMutation.isPending && enableMutation.variables === u.id}
                              onClick={() => enableMutation.mutate(u.id)}
                            >
                              <ShieldCheck size={13} />
                              Enable
                            </Button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={addOpen} onClose={resetForm} title="Add Platform User">
        <div className="flex flex-col gap-5 pt-2">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input
              className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              autoFocus
            />
            <input
              className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-cash-green mb-1.5">Email</p>
            <input
              className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
              type="email"
              placeholder="admin@yourcompany.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <Select
            label="Platform Role"
            value={form.platformRole}
            options={ROLE_OPTIONS}
            onChange={(v) => setForm((f) => ({ ...f, platformRole: v as BackendPlatformRole }))}
          />
          <div>
            <p className="text-xs font-medium text-cash-green mb-1.5">Temporary password</p>
            <input
              className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors font-mono"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <p className="text-xs text-cash-green/50 mt-1">There is no invite email — share this with them directly.</p>
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2 border-t border-mint-light">
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} loading={createMutation.isPending}>
              Create Platform User
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!disableTarget}
        onClose={() => setDisableTarget(null)}
        onConfirm={() => disableTarget && disableMutation.mutate(disableTarget.id)}
        title="Disable Platform User"
        message={`Are you sure you want to disable ${disableTarget ? `${disableTarget.firstName} ${disableTarget.lastName}` : 'this user'}? They will lose platform access immediately.`}
        confirmLabel="Disable"
        variant="danger"
        isLoading={disableMutation.isPending}
      />
    </div>
  );
}
