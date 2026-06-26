import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, RefreshCw, AlertTriangle, ShieldOff } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Tabs from '@/components/ui/Tabs';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

interface TenantUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  COMPANY_SUPER_ADMIN: 'Super Admin',
  HR_MANAGER: 'HR Manager',
  PAYROLL_MANAGER: 'Payroll Manager',
  FINANCE_DIRECTOR: 'Finance Director',
  EMPLOYEE: 'Employee',
};

const ROLE_BADGE_VARIANT: Record<string, 'success' | 'info' | 'warning'> = {
  COMPANY_SUPER_ADMIN: 'success',
  HR_MANAGER: 'info',
  PAYROLL_MANAGER: 'info',
  FINANCE_DIRECTOR: 'warning',
  EMPLOYEE: 'info',
};

const INVITE_ROLE_OPTIONS = [
  { value: 'HR_MANAGER', label: 'HR Manager' },
  { value: 'PAYROLL_MANAGER', label: 'Payroll Manager' },
  { value: 'FINANCE_DIRECTOR', label: 'Finance Director' },
  { value: 'EMPLOYEE', label: 'Employee' },
];

const blankInviteForm = { email: '', role: '' };

export default function UsersAndRoles() {
  const qc = useQueryClient();
  const toast = useToast();
  const currentUser = useAuthStore((s) => s.user);
  const role = currentUser?.role;
  const isSuperAdmin = role === 'COMPANY_SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState('users');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState(blankInviteForm);
  const [deactivateTarget, setDeactivateTarget] = useState<TenantUser | null>(null);

  const {
    data: users,
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useQuery<TenantUser[]>({
    queryKey: ['settings-users'],
    queryFn: () => apiClient('/settings/users'),
    enabled: isSuperAdmin,
  });

  const {
    data: invites,
    isLoading: invitesLoading,
    isError: invitesError,
    refetch: refetchInvites,
  } = useQuery<Invite[]>({
    queryKey: ['settings-invites'],
    queryFn: () => apiClient('/settings/invites'),
    enabled: isSuperAdmin,
  });

  const sendInviteMutation = useMutation({
    mutationFn: (body: { email: string; role: string }) =>
      apiClient('/settings/invites', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['settings-invites'] });
      toast.success(`Invite sent to ${vars.email}`);
      setInviteForm(blankInviteForm);
      setInviteOpen(false);
    },
    onError: () => toast.error('Failed to send invite'),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/settings/invites/${id}/resend`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-invites'] });
      toast.success('Invite resent — expires in 7 days');
    },
    onError: () => toast.error('Failed to resend invite'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/settings/users/${id}/deactivate`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-users'] });
      toast.success('User deactivated');
      setDeactivateTarget(null);
    },
    onError: () => toast.error('Failed to deactivate user'),
  });

  if (!isSuperAdmin) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
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
          You need Super Admin access to manage users and roles.
        </div>
      </div>
    );
  }

  const isLoading = usersLoading || invitesLoading;
  const isError = usersError || invitesError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        onRetry={() => {
          refetchUsers();
          refetchInvites();
        }}
      />
    );
  }

  const pendingCount = (invites ?? []).filter((i) => i.status !== 'accepted').length;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        title="Users & Roles"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Users & Roles' }]}
        action={
          isSuperAdmin ? (
            <Button variant="primary" onClick={() => setInviteOpen(true)}>
              <UserPlus size={15} />
              Invite User
            </Button>
          ) : undefined
        }
      />

      <Tabs
        tabs={[
          { id: 'users', label: 'Active Users', count: (users ?? []).length },
          { id: 'invites', label: 'Pending Invites', count: pendingCount },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-5"
      />

      {activeTab === 'users' && (
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
                  {['Name', 'Email', 'Role', 'Status', ...(isSuperAdmin ? ['Actions'] : [])].map(
                    (h) => (
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
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((u) => {
                  const isCurrentUser = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      style={{ borderBottom: '1px solid #CDEFD7' }}
                    >
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <Avatar name={u.fullName} size="sm" />
                          <span style={{ fontWeight: 500, color: '#0F2E23' }}>{u.fullName}</span>
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
                        <Badge variant="success" label="Active" />
                      </td>
                      {isSuperAdmin && (
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={isCurrentUser}
                            onClick={() => setDeactivateTarget(u)}
                          >
                            <ShieldOff size={13} />
                            Deactivate
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {(users ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={isSuperAdmin ? 5 : 4}
                      style={{ padding: '2rem', textAlign: 'center', color: '#1F6F4E' }}
                    >
                      No active users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'invites' && (
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
                  {['Email', 'Role', 'Status', 'Expires', 'Sent', 'Actions'].map((h) => (
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
                {(invites ?? []).map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #CDEFD7' }}>
                    <td style={{ padding: '0.875rem 1rem', color: '#0F2E23' }}>{inv.email}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge
                        variant={ROLE_BADGE_VARIANT[inv.role] ?? 'info'}
                        label={ROLE_LABELS[inv.role] ?? inv.role}
                      />
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {inv.status === 'expired' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Badge variant="danger" label="Expired" />
                          <AlertTriangle size={13} style={{ color: '#dc2626' }} />
                        </div>
                      ) : inv.status === 'accepted' ? (
                        <Badge variant="success" label="Accepted" />
                      ) : (
                        <Badge variant="warning" label="Pending" />
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#1F6F4E', whiteSpace: 'nowrap' }}>
                      {formatDate(inv.expiresAt)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#1F6F4E', whiteSpace: 'nowrap' }}>
                      {formatDate(inv.createdAt)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {inv.status !== 'accepted' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={resendMutation.isPending}
                          onClick={() => resendMutation.mutate(inv.id)}
                        >
                          <RefreshCw size={13} />
                          {inv.status === 'expired' ? 'Resend (expired)' : 'Resend'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {(invites ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ padding: '2rem', textAlign: 'center', color: '#1F6F4E' }}
                    >
                      No pending invites.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setInviteForm(blankInviteForm);
        }}
        title="Invite User"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Email address"
            type="email"
            value={inviteForm.email}
            onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="colleague@company.com"
          />
          <Select
            label="Role"
            value={inviteForm.role}
            options={INVITE_ROLE_OPTIONS}
            onChange={(v) => setInviteForm((f) => ({ ...f, role: v }))}
            placeholder="Select a role"
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem',
              marginTop: '0.5rem',
            }}
          >
            <Button
              variant="ghost"
              onClick={() => {
                setInviteOpen(false);
                setInviteForm(blankInviteForm);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={sendInviteMutation.isPending}
              disabled={!inviteForm.email || !inviteForm.role || sendInviteMutation.isPending}
              onClick={() => sendInviteMutation.mutate(inviteForm)}
            >
              Send Invite
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${deactivateTarget?.fullName ?? 'this user'}? They will lose access to PayRole immediately.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}
