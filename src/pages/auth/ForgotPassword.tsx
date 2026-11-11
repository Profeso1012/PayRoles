import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { errorMessage } from '@/lib/errors';
import { PATHS } from '@/router/paths';
import Button from '@/components/ui/Button';

type State = 'form' | 'sent';

const inputClass =
  'w-full bg-transparent border-0 border-b border-cash-green/30 py-3 text-base text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40';

/**
 * POST /auth/forgot-password emails a fresh TEMPORARY PASSWORD (not a reset
 * link); signing in with it forces a password change. It always returns 204
 * whether or not the account exists, so success never confirms an account.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [state, setState] = useState<State>('form');
  const [tenantSlug, setTenantSlug] = useState(params.get('company') ?? '');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!tenantSlug.trim()) {
      setError('Please enter your company code');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiClient(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), tenantSlug: tenantSlug.trim() }),
        skipAuthRedirect: true,
      });
      setState('sent');
    } catch (err) {
      // e.g. 429 (limited to 3 requests an hour) or a validation error.
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center h-full">
      <div className="w-full max-w-sm mx-auto">
        <img src="/assets/payrole-logo.png" alt="PayRole" className="h-8 mb-10" />

        {state === 'form' && (
          <>
            <button
              onClick={() => navigate(PATHS.LOGIN)}
              className="flex items-center gap-2 text-sm text-deep-cash hover:underline mb-5"
            >
              <ArrowLeft size={16} />
              Back to sign in
            </button>

            <h1 className="text-2xl font-semibold text-deep-cash mb-2">Reset your password</h1>
            <p className="text-sm text-cash-green/80 mb-8">
              We'll email you a temporary password. You'll be asked to choose a new one when you
              sign in with it.
            </p>

            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-cash-green mb-1.5">Company code</p>
                <input
                  className={inputClass}
                  type="text"
                  value={tenantSlug}
                  onChange={(e) =>
                    setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                  placeholder="e.g., acme-corp"
                  autoFocus={!tenantSlug}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-cash-green mb-1.5">Email address</p>
                <input
                  className={inputClass}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="you@company.com"
                  autoFocus={!!tenantSlug}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

            <div className="flex justify-end mt-6">
              <Button variant="primary" onClick={handleSubmit} loading={loading}>
                Email temporary password
              </Button>
            </div>
          </>
        )}

        {state === 'sent' && (
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-14 h-14 rounded-full bg-mint-light flex items-center justify-center mb-6">
              <CheckCircle size={28} className="text-cash-green" />
            </div>
            <h2 className="text-xl font-semibold text-deep-cash mb-2">Check your email</h2>
            <p className="text-sm text-cash-green/80 max-w-xs">
              If <strong className="text-deep-cash">{email}</strong> has an account with this
              company, a temporary password is on its way. Check your inbox and spam folder.
            </p>
            <button
              onClick={() => navigate(PATHS.LOGIN)}
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
