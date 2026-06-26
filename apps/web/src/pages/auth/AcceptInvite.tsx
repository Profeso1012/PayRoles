import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import Button from '@/components/ui/Button';
import type { AuthUser } from '@contracts/types/auth';

interface DecodedToken {
  companyName: string;
  role: string;
  email: string;
}

export default function AcceptInvite() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const decoded = useMemo<DecodedToken | null>(() => {
    if (!token) return null;
    try {
      return JSON.parse(atob(token));
    } catch {
      return null;
    }
  }, [token]);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await apiClient<{ token: string; user: AuthUser }>(
        '/auth/accept-invite',
        { method: 'POST', body: JSON.stringify({ token, fullName, password }), skipAuthRedirect: true },
      );
      setSession(data.user, data.token);
      const role = data.user.role;
      if (role === 'PLATFORM_ADMIN') navigate('/admin');
      else if (role === 'EMPLOYEE') navigate('/my-payslips');
      else navigate('/dashboard');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!token || !decoded) {
    return (
      <div className="flex flex-col justify-center h-full">
        <div className="w-full max-w-sm mx-auto">
          <img src="/assets/payrole-logo.png" alt="PayRole" className="h-8 mb-10" />
          <div className="flex flex-col items-center text-center py-8">
            <p className="text-red-500 font-medium">This invite link is invalid or expired.</p>
            <p className="text-sm text-cash-green/70 mt-2">
              Contact your administrator for a new invite.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 text-sm text-cash-green underline hover:text-fresh-cash"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center h-full">
      <div className="w-full max-w-sm mx-auto">
        <img src="/assets/payrole-logo.png" alt="PayRole" className="h-8 mb-10" />

        <div className="bg-mint-light/40 rounded-xl p-4 mb-8 border border-mint-light">
          <p className="text-sm font-medium text-deep-cash">
            You've been invited to <strong>{decoded.companyName}</strong>
          </p>
          <p className="text-xs text-cash-green/70 mt-1">
            Role:{' '}
            <span className="capitalize">{decoded.role?.replace(/_/g, ' ').toLowerCase()}</span>{' '}
            · {decoded.email}
          </p>
        </div>

        <h1 className="text-2xl font-semibold text-deep-cash mb-6">Create your account</h1>

        <div className="mb-6">
          <p className="text-xs font-medium text-cash-green mb-1.5">Full name</p>
          <input
            className="w-full bg-transparent border-0 border-b border-cash-green/30 py-3 text-base text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            autoFocus
          />
        </div>

        <div className="mb-6">
          <p className="text-xs font-medium text-cash-green mb-1.5">Password</p>
          <div className="relative">
            <input
              className="w-full bg-transparent border-0 border-b border-cash-green/30 py-3 pr-10 text-base text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-cash-green/60 hover:text-cash-green"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-cash-green mb-1.5">Confirm password</p>
          <div className="relative">
            <input
              className="w-full bg-transparent border-0 border-b border-cash-green/30 py-3 pr-10 text-base text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Repeat password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-cash-green/60 hover:text-cash-green"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

        <div className="flex justify-end mt-6">
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Create account
          </Button>
        </div>
      </div>
    </div>
  );
}
