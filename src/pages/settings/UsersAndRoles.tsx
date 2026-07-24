import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, ShieldOff, ShieldCheck, KeyRound } from 'lucide-react';
import { apiClient, apiClientWithMeta } from '@/lib/api';
import { ENDPOINTS, USE_REAL_API, buildPaginationParams } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { generateTempPassword } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import type { BackendUser, BackendRole, BackendWorker, CreateUserRequest } from '@/lib/api/types';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  tenant_admin: 'Tenant Admin',
  hr_manager: 'HR Manager',
  hr_officer: 'HR Officer',
  payroll_manager: 'Payroll Manager',
  payroll_officer: 'Payroll Officer',
  finance_manager: 'Finance Manager',
  auditor: 'Auditor',
  read_only: 'Read Only',
  employee_self_service: 'Employee',
};

const ROLE_BADGE_VARIANT: Record<string, 'success' | 'info' | 'warning'> = {
  super_admin: 'success',
  tenant_admin: 'success',
  hr_manager: 'info',
  hr_officer: 'info',
  payroll_manager: 'info',
  payroll_officer: 'info',
  finance_manager: 'warning',
  auditor: 'warning',
  read_only: 'info',
  employee_self_service: 'info',
};

// Real backend CreateUserDto has no invite-token flow at all - a "new user"
// is created directly with an initial password (no separate accept-invite
// step, no pending/expired invite state). This form reflects that.
const ROLE_OPTIONS = Object.entries(ROLE_LABELS)
  .filter(([value]) => value !== 'super_admin') // super_admin is reserved, not self-servable here
  .map(([value, label]) => ({ value, label }));

const blankAddUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: generateTempPassword(),
  role: 'read_only' as BackendRole,
  workerId: '',
};

export default function UsersAndRoles() {
  const qc = useQueryClient();
  const toast = useToast();
  const currentUser = useAuthStore((s) => s.user);
  const role = currentUser?.role;
  const isSuperAdmin = role === 'tenant_admin' || role === 'super_admin';

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [form, setForm] = useState(blankAddUserForm);
  const [disableTarget, setDisableTarget] = useState<BackendUser | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<BackendUser | null>(null);

  const {
    data: users = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<BackendUser[]>({
    queryKey: ['settings-users'],
    queryFn: async () => {
      if (!USE_REAL_API) {
        const response = await apiClient<any>('/settings/users');
        return Array.isArray(response) ? response : response.data || [];
      }
      const params = buildPaginationParams({ page: 1, limit: 100 });
      const { data } = await apiClientWithMeta<BackendUser[]>(`${ENDPOINTS.USERS.LIST}?${params}`);
      return data;
    },
    enabled: isSuperAdmin,
  });

  // Only needed to populate the "Link to Employee" picker, which only
  // applies to the employee_self_service role - an employee_self_service
  // account with no workerId can never resolve its own payslips (My
  // Payslips/Dashboard both key off it), so linking a worker here is
  // mandatory for that role, not optional.
  const { data: workerCatalog } = useQuery<BackendWorker[]>({
    queryKey: ['workers-catalog'],
    queryFn: async () => {
      const { data } = await apiClientWithMeta<BackendWorker[]>(
        `${ENDPOINTS.WORKERS.LIST}?${buildPaginationParams({ limit: 200 })}`,
      );
      return data;
    },
    enabled: addUserOpen && form.role === 'employee_self_service',
  });

  const createUserMutation = useMutation({
    mutationFn: (body: CreateUserRequest) => {
      if (!USE_REAL_API) {
        return apiClient('/settings/users', { method: 'POST', body: JSON.stringify(body) });
      }
      return apiClient(ENDPOINTS.USERS.CREATE, { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['settings-users'] });
      toast.success(`User created for ${vars.email}`, `Share the temporary password with them directly: ${vars.password}`);
      setForm({ ...blankAddUserForm, password: generateTempPassword() });
      setAddUserOpen(false);
    },
    onError: (err) => toast.error('Failed to create user', err instanceof Error ? err.message : undefined),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => {
      if (!USE_REAL_API) {
        return apiClient(`/settings/users/${id}/disable`, { method: 'PATCH' });
      }
      return apiClient(ENDPOINTS.USERS.DISABLE(id), { method: 'PATCH' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-users'] });
      toast.success('User disabled');
      setDisableTarget(null);
    },
    onError: (err) => toast.error('Failed to disable user', err instanceof Error ? err.message : undefined),
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => apiClient(ENDPOINTS.USERS.ENABLE(id), { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-users'] });
      toast.success('User re-enabled');
    },
    onError: (err) => toast.error('Failed to enable user', err instanceof Error ? err.message : undefined),
  });

  // Generates a random temp password server-side and returns it once - never
  // emailed/stored - so it has to be relayed to the user out-of-band. Also
  // invalidates their refresh token, forcing them to log back in.
  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient<{ temporaryPassword: string }>(ENDPOINTS.USERS.RESET_PASSWORD(id), { method: 'PATCH' }),
    onSuccess: (result) => {
      toast.success(
        `Password reset for ${resetPasswordTarget?.email}`,
        `Share this with them directly: ${result.temporaryPassword}`,
      );
      setResetPasswordTarget(null);
    },
    onError: (err) => toast.error('Failed to reset password', err instanceof Error ? err.message : undefined),
  });

  if (!isSuperAdmin) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
        <PageHeader
          title="Users & Roles"
          breadcrumbs={[{ label: 'Settings' }, { label: 'Users & Roles' }]}
        />
        <div
          style={{
            padding: '2rem',
            background: '#fff',
            border: '1px solid #CDEFD7',
            borderRadius: '0.75rem',
            textAlign: 'center',
            color: '#1F6F4E',
            fontSize: '0.9375rem',
          }}
        >
          You need Tenant Admin access to manage users and roles.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title="Users & Roles"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Users & Roles' }]}
        action={
          <Button variant="primary" onClick={() => setAddUserOpen(true)}>
            <UserPlus size={15} />
            Add User
          </Button>
        }
      />

      <div
        style={{
          background: '#fff',
          border: '1px solid #CDEFD7',
          borderRadius: '0.75rem',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F7FAF8', borderBottom: '1px solid #CDEFD7' }}>
                {['Name', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#0F2E23',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const fullName = `${u.firstName} ${u.lastName}`;
                const isCurrentUser = u.id === currentUser?.id;
                const isActive = u.status === 'active';
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #CDEFD7' }}>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <Avatar name={fullName} size="sm" />
                        <span style={{ fontWeight: 500, color: '#0F2E23' }}>{fullName}</span>
                        {isCurrentUser && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              color: '#1F6F4E',
                              background: '#CDEFD7',
                              padding: '0.125rem 0.4rem',
                              borderRadius: '0.25rem',
                            }}
                          >
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#1F6F4E' }}>{u.email}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge
                        variant={ROLE_BADGE_VARIANT[u.role] ?? 'info'}
                        label={ROLE_LABELS[u.role] ?? u.role}
                      />
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge variant={isActive ? 'success' : 'error'} label={isActive ? 'Active' : u.status} />
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {isActive && (
                          <Button variant="ghost" size="sm" onClick={() => setResetPasswordTarget(u)}>
                            <KeyRound size={13} />
                            Reset Password
                          </Button>
                        )}
                        {isActive ? (
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={isCurrentUser}
                            onClick={() => setDisableTarget(u)}
                          >
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
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#1F6F4E' }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={addUserOpen}
        onClose={() => {
          setAddUserOpen(false);
          setForm({ ...blankAddUserForm, password: generateTempPassword() });
        }}
        title="Add User"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input
              label="First name"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
            <Input
              label="Last name"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </div>
          <Input
            label="Email address"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="colleague@company.com"
          />
          <Select
            label="Role"
            value={form.role}
            options={ROLE_OPTIONS}
            onChange={(v) => setForm((f) => ({ ...f, role: v as BackendRole, workerId: '' }))}
            placeholder="Select a role"
          />
          {form.role === 'employee_self_service' && (
            <div>
              <Select
                label="Link to Employee"
                value={form.workerId}
                options={(workerCatalog ?? []).map((w) => ({
                  value: w.id,
                  label: `${w.firstName} ${w.lastName}${w.employeeNumber ? ` (${w.employeeNumber})` : ''}`,
                }))}
                onChange={(v) => setForm((f) => ({ ...f, workerId: v }))}
                placeholder={workerCatalog ? 'Select an employee' : 'Loading...'}
              />
              <p className="text-xs text-cash-green/60 mt-1">
                Required — without this, the employee can't see their own payslips.
              </p>
            </div>
          )}
          <Input
            label="Temporary password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            hint="Share this with the user directly — there is no invite email. They can change it after logging in."
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button
              variant="ghost"
              onClick={() => {
                setAddUserOpen(false);
                setForm({ ...blankAddUserForm, password: generateTempPassword() });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createUserMutation.isPending}
              disabled={
                !form.firstName ||
                !form.lastName ||
                !form.email ||
                !form.password ||
                (form.role === 'employee_self_service' && !form.workerId) ||
                createUserMutation.isPending
              }
              onClick={() =>
                createUserMutation.mutate({
                  firstName: form.firstName,
                  lastName: form.lastName,
                  email: form.email,
                  password: form.password,
                  role: form.role,
                  workerId: form.role === 'employee_self_service' ? form.workerId : undefined,
                })
              }
            >
              <ShieldCheck size={14} />
              Create User
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!disableTarget}
        onClose={() => setDisableTarget(null)}
        onConfirm={() => disableTarget && disableMutation.mutate(disableTarget.id)}
        title="Disable User"
        message={`Are you sure you want to disable ${disableTarget ? `${disableTarget.firstName} ${disableTarget.lastName}` : 'this user'}? They will lose access to PayRole immediately.`}
        confirmLabel="Disable"
        variant="danger"
        isLoading={disableMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!resetPasswordTarget}
        onClose={() => setResetPasswordTarget(null)}
        onConfirm={() => resetPasswordTarget && resetPasswordMutation.mutate(resetPasswordTarget.id)}
        title="Reset Password"
        message={`Generate a new temporary password for ${resetPasswordTarget ? `${resetPasswordTarget.firstName} ${resetPasswordTarget.lastName}` : 'this user'}? Their current password stops working immediately and they'll be signed out everywhere.`}
        confirmLabel="Reset Password"
        variant="danger"
        isLoading={resetPasswordMutation.isPending}
      />
    </div>
  );
}
