import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

/**
 * Mandatory first-login password change - shown whenever the backend's login
 * response set mustChangePassword (temp/emailed password never rotated yet).
 * Deliberately not the shared Modal component: no backdrop click, X, or
 * Escape dismissal - PATCH /users/me/password is the only way out, since the
 * backend still requires the temp password on every authenticated call until
 * it's changed here.
 */
export default function ForceChangePasswordModal() {
  const clearMustChangePassword = useAuthStore((s) => s.clearMustChangePassword);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.USERS.CHANGE_PASSWORD, {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: () => clearMustChangePassword(),
  });

  const canSubmit = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(15, 46, 35, 0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(1rem, 3vw, 2rem)',
      }}
    >
      <div
        style={{
          background: '#fff', borderRadius: '0.75rem',
          maxWidth: 'min(420px, 92vw)', width: '100%',
          padding: 'clamp(1.25rem, 3vw, 1.75rem)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <KeyRound size={18} className="text-cash-green" />
          <h3 className="text-base font-semibold text-deep-cash">Set a Permanent Password</h3>
        </div>
        <p className="text-sm text-cash-green/80 mb-5">
          You're signing in with a temporary password. Choose a permanent one to continue.
        </p>

        <div className="flex flex-col gap-4">
          <Input
            label="Temporary password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            hint="The password you just used to sign in"
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

          {mutation.isError && (
            <p className="text-sm text-red-500">
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to change password.'}
            </p>
          )}

          <Button
            variant="primary"
            loading={mutation.isPending}
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Set Password &amp; Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
