import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User, KeyRound, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import type { BackendUser } from '@/lib/api/types';

// The employee_self_service role only holds payslip:read/payslip:download
// permissions on the real backend - it has no worker:read/worker:write grant
// at all, so this page cannot use the Worker endpoints (no employment
// details, national ID, department, etc. are reachable). GET /users/me and
// PATCH /users/me/password are the only self-service endpoints available to
// every authenticated user regardless of role.
const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  active: 'success',
  inactive: 'info',
  suspended: 'warning',
  archived: 'error',
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-sm text-cash-green/60 font-medium">{label}</dt>
      <dd className="text-sm text-deep-cash font-medium">{value}</dd>
    </>
  );
}

export default function MyProfile() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);

  const { data: profile, isLoading, isError, refetch } = useQuery<BackendUser>({
    queryKey: ['my-profile'],
    queryFn: () => apiClient<BackendUser>(ENDPOINTS.USERS.ME),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.USERS.CHANGE_PASSWORD, {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: () => {
      setPasswordChanged(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordChanged(false), 5000);
    },
    onError: () => toast.error('Failed to change password', 'Check your current password and try again.'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !profile) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const canSubmitPassword =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        title="My Profile"
        breadcrumbs={[{ label: 'My Profile' }]}
      />

      {/* Profile identity card */}
      <div className="bg-white rounded-xl border border-mint-light p-6 mb-6 flex flex-wrap items-center gap-5">
        <Avatar name={fullName} size="lg" className="w-16 h-16 text-xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-deep-cash">{fullName}</h2>
            <Badge variant={statusVariant[profile.status] ?? 'info'} label={profile.status} />
          </div>
          <p className="text-sm text-cash-green mt-0.5">{profile.email}</p>
        </div>
        {profile.lastLoginAt && (
          <div className="text-right">
            <p className="text-xs text-cash-green/50 uppercase tracking-wide font-medium">Last login</p>
            <p className="text-sm font-semibold text-deep-cash mt-0.5">{formatDate(profile.lastLoginAt)}</p>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {/* Personal Details */}
        <div className="bg-white rounded-xl border border-mint-light p-6">
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-cash-green" />
            <h3 className="text-sm font-semibold text-deep-cash">Account Details</h3>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
            <DetailRow label="Full Name" value={fullName} />
            <DetailRow label="Email Address" value={profile.email} />
            {profile.phone && <DetailRow label="Phone Number" value={profile.phone} />}
            <DetailRow label="Member Since" value={formatDate(profile.createdAt)} />
          </dl>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl border border-mint-light p-6">
          <div className="flex items-center gap-2 mb-5">
            <KeyRound size={16} className="text-cash-green" />
            <h3 className="text-sm font-semibold text-deep-cash">Change Password</h3>
          </div>

          {passwordChanged && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-mint-light rounded-lg border border-fresh-cash/40">
              <CheckCircle size={16} className="text-cash-green" />
              <span className="text-sm text-cash-green font-medium">Password changed successfully.</span>
            </div>
          )}

          <div className="grid gap-4 max-w-sm">
            <Input
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint="At least 8 characters"
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
            />
            <div>
              <Button
                variant="primary"
                loading={changePasswordMutation.isPending}
                disabled={!canSubmitPassword || changePasswordMutation.isPending}
                onClick={() => changePasswordMutation.mutate()}
              >
                Update Password
              </Button>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-cash-green/40 text-center">
        Employment details are managed by your HR team. Contact HR to request changes.
      </p>
    </div>
  );
}
