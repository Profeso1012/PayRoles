import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { errorCode, errorMessage, fieldErrors } from '@/lib/errors';
import { ENDPOINTS } from '@/lib/api/adapter';
import { PATHS } from '@/router/paths';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';

type Status = 'verifying' | 'verified' | 'invalid' | 'expired' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const [email, setEmail] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [resendError, setResendError] = useState('');
  const [resendFieldErrors, setResendFieldErrors] = useState<Record<string, string>>({});
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    apiClient(ENDPOINTS.AUTH.VERIFY_EMAIL, {
      method: 'POST',
      body: JSON.stringify({ token }),
      skipAuthRedirect: true,
    })
      .then(() => setStatus('verified'))
      .catch((err) => {
        const code = errorCode(err);
        if (code === 'EMAIL_VERIFICATION_TOKEN_EXPIRED') setStatus('expired');
        else if (code === 'EMAIL_VERIFICATION_TOKEN_INVALID') setStatus('invalid');
        else {
          setVerifyError(errorMessage(err, ''));
          setStatus('error');
        }
      });
  }, [token]);

  async function handleResend() {
    if (!email.trim() || !tenantSlug.trim()) return;
    setResendState('sending');
    setResendError('');
    setResendFieldErrors({});
    try {
      await apiClient(ENDPOINTS.AUTH.RESEND_VERIFICATION, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), tenantSlug: tenantSlug.trim() }),
        skipAuthRedirect: true,
      });
      // Success is identical whether or not the account exists (enumeration-safe).
      setResendState('sent');
    } catch (err) {
      // e.g. 429 - resends are rate-limited (3/hour) - or a validation error.
      const fields = fieldErrors(err);
      setResendFieldErrors(fields);
      if (Object.keys(fields).length === 0) {
        setResendError(errorMessage(err, 'Could not resend the verification email. Please try again.'));
      }
      setResendState('idle');
    }
  }

  return (
    <div className="min-h-screen bg-soft-white flex items-center justify-center p-[clamp(1rem,4vw,2rem)]">
      <div className="bg-white rounded-2xl shadow-sm border border-mint-light p-[clamp(1.5rem,5vw,2.5rem)] max-w-md w-full text-center">
        <Link to={PATHS.HOME} className="inline-flex items-center mb-6">
          <img src="/assets/payrole-logo.png" alt="PayRole" className="h-8" />
        </Link>

        {status === 'verifying' && (
          <>
            <div className="flex justify-center mb-6">
              <Spinner size="lg" />
            </div>
            <p className="text-gray-600">Verifying your email…</p>
          </>
        )}

        {status === 'verified' && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-mint-light mb-6">
              <CheckCircle className="text-cash-green" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-deep-cash mb-3">Email verified</h1>
            <p className="text-gray-600 mb-8">
              Your account is active. Sign in with the temporary password we emailed you to get started.
            </p>
            <Link to={PATHS.LOGIN}>
              <Button variant="primary" className="w-full">Sign in</Button>
            </Link>
          </>
        )}

        {(status === 'invalid' || status === 'expired' || status === 'error') && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-6">
              <XCircle className="text-red-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-deep-cash mb-3">
              {status === 'expired' ? 'Link expired' : status === 'invalid' ? 'Invalid link' : 'Something went wrong'}
            </h1>
            <p className="text-gray-600 mb-6">
              {status === 'expired'
                ? 'This verification link has expired. Request a new one below.'
                : status === 'invalid'
                  ? 'This verification link is invalid or has already been used. Request a new one below.'
                  : verifyError || 'We could not verify your email right now. Please try again in a moment.'}
            </p>

            {status !== 'error' && (
              <div className="text-left flex flex-col gap-3 mb-2">
                {resendState === 'sent' ? (
                  <p className="text-sm text-cash-green text-center">
                    If that account needs verifying, a new link is on its way — check your inbox.
                  </p>
                ) : (
                  <>
                    <Input
                      label="Admin email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      error={resendFieldErrors.email}
                    />
                    <Input
                      label="Company code"
                      value={tenantSlug}
                      onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="dangote-cement"
                      error={resendFieldErrors.tenantSlug}
                    />
                    {resendError && <p className="text-sm text-red-600">{resendError}</p>}
                    <Button
                      variant="primary"
                      className="w-full"
                      disabled={!email.trim() || !tenantSlug.trim()}
                      loading={resendState === 'sending'}
                      onClick={handleResend}
                    >
                      Resend verification email
                    </Button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
