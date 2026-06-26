import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import Button from '@/components/ui/Button';

type State = 'form' | 'done';

export default function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<State>('form');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      setError('Please fill in both password fields');
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
      await apiClient('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      toast.success('Password reset successfully. Please sign in.');
      navigate('/login');
    } catch {
      setError('This reset link is invalid or has expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col justify-center h-full">
        <div className="w-full max-w-sm mx-auto">
          <img src="/assets/payrole-logo.png" alt="PayRole" className="h-8 mb-10" />
          <div className="flex flex-col items-center text-center py-8">
            <p className="text-red-500 font-medium">Invalid or expired reset link.</p>
            <p className="text-sm text-cash-green/70 mt-2">Please request a new one.</p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="mt-6 text-sm text-cash-green underline hover:text-fresh-cash"
            >
              Request new reset link
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

        {state === 'form' && (
          <>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 text-sm text-deep-cash hover:underline mb-5"
            >
              <ArrowLeft size={16} />
              Back to sign in
            </button>

            <h1 className="text-2xl font-semibold text-deep-cash mb-2">Set new password</h1>
            <p className="text-sm text-cash-green/80 mb-8">Enter your new password below.</p>

            <div className="mb-6">
              <p className="text-xs font-medium text-cash-green mb-1.5">New password</p>
              <div className="relative">
                <input
                  className="w-full bg-transparent border-0 border-b border-cash-green/30 py-3 pr-10 text-base text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
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
                Set password
              </Button>
            </div>
          </>
        )}

        {state === 'done' && (
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-14 h-14 rounded-full bg-mint-light flex items-center justify-center mb-6">
              <CheckCircle size={28} className="text-cash-green" />
            </div>
            <h2 className="text-xl font-semibold text-deep-cash mb-2">Password set</h2>
            <p className="text-sm text-cash-green/80 max-w-xs">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-8 text-sm text-cash-green hover:text-fresh-cash underline"
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
