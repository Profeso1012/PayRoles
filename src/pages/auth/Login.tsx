import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, KeyRound, Building2, MailWarning } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClient, ApiError } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { PATHS } from '@/router/paths';
import Button from '@/components/ui/Button';
import type { AuthUser } from '@contracts/types/auth';
import type { LoginResponse } from '@/lib/api/types';

function errorCode(err: unknown): string | undefined {
  if (!(err instanceof ApiError) || !err.data || typeof err.data !== 'object') return undefined;
  const body = err.data as { error?: { code?: string } };
  return body.error?.code;
}

// GET /auth/me returns IAuthUser: { id, email, tenantId, role, isActive, workerId? } -
// no fullName/tenantName/avatarUrl/permissions. fullName is composed client-side
// from GET /users/me (firstName/lastName), which does exist on the User entity.
interface BackendAuthMe {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  isActive: boolean;
  workerId?: string | null;
}

interface BackendUserMe {
  firstName: string;
  lastName: string;
}

async function buildAuthUser(): Promise<AuthUser> {
  const me = await apiClient<BackendAuthMe>(ENDPOINTS.AUTH.ME);
  let fullName = me.email;
  try {
    const profile = await apiClient<BackendUserMe>(ENDPOINTS.USERS.ME);
    fullName = `${profile.firstName} ${profile.lastName}`.trim();
  } catch {
    // Non-fatal - fall back to email if /users/me is unavailable.
  }
  return {
    id: me.id,
    email: me.email,
    fullName,
    role: me.role as AuthUser['role'],
    tenantId: me.tenantId,
    tenantName: null,
    avatarUrl: null,
    workerId: me.workerId ?? null,
    platformRole: null,
  };
}

type Step = 'slug' | 'credentials';

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = useState<Step>('slug');
  const [email, setEmail] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [resendCredsState, setResendCredsState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleResendVerification = async () => {
    // Clears the stale "Please verify your email..." banner the moment the
    // user acts on it - it stays true so the box below (which this same
    // click lives inside) keeps rendering through to its "sent" confirmation.
    setError('');
    setResendState('sending');
    try {
      await apiClient(ENDPOINTS.AUTH.RESEND_VERIFICATION, {
        method: 'POST',
        body: JSON.stringify({ email, tenantSlug }),
        skipAuthRedirect: true,
      });
    } finally {
      // Always resolves as "sent" - the backend responds 204 regardless of
      // whether the account exists or is already verified (enumeration-safe).
      setResendState('sent');
    }
  };

  // Distinct recovery path from resend-verification: for an account that's
  // already ACTIVE (verified, or created directly by an admin with no
  // verification step at all) but has never logged in - meaning its original
  // welcome-credentials email likely never arrived. Stops working forever
  // once the account logs in even once, so it's always safe to show this.
  const handleResendCredentials = async () => {
    if (!email.trim() || !tenantSlug.trim()) return;
    // The user has switched to a different recovery path than "verify your
    // email" - clear that banner and collapse its box entirely rather than
    // leaving both visible at once.
    setError('');
    setNeedsVerification(false);
    setResendCredsState('sending');
    try {
      await apiClient(ENDPOINTS.AUTH.RESEND_CREDENTIALS, {
        method: 'POST',
        body: JSON.stringify({ email, tenantSlug }),
        skipAuthRedirect: true,
      });
    } finally {
      // Always resolves as "sent" - the backend responds 204 regardless of
      // whether the account exists, is already active, or has logged in before.
      setResendCredsState('sent');
    }
  };

  const handleSlugNext = () => {
    if (!tenantSlug.trim()) {
      setError('Please enter your company code');
      return;
    }
    setStep('credentials');
    setError('');
    setTimeout(() => emailRef.current?.focus(), 50);
  };

  const handleSignIn = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    setLoading(true);
    setError('');
    setNeedsVerification(false);
    setResendState('idle');
    try {
      // Step 1: Login and get tokens
      const loginData = await apiClient<LoginResponse>(
        ENDPOINTS.AUTH.LOGIN,
        {
          method: 'POST',
          body: JSON.stringify({ email, password, tenantSlug }),
          skipAuthRedirect: true,
        },
      );

      // Step 2: Store tokens
      setSession({
        accessToken: loginData.accessToken,
        refreshToken: loginData.refreshToken,
        expiresIn: loginData.expiresIn,
        mustChangePassword: loginData.mustChangePassword,
      });

      // Step 3: Fetch user profile (combines /auth/me + /users/me)
      const user = await buildAuthUser();

      // Step 4: Update session with user
      setSession({ user });

      // Navigate based on role - if mustChangePassword is set, AppShell
      // blocks every route behind ForceChangePasswordModal until it's cleared,
      // so it's safe to navigate straight to the intended destination.
      const role = user.role;
      if (role === 'employee_self_service') navigate('/my-payslips');
      else navigate('/dashboard');
    } catch (err: any) {
      if (errorCode(err) === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true);
        setError(err?.message || 'Please verify your email before signing in.');
      } else {
        setError(err?.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center h-full">
      <div className="w-full max-w-sm mx-auto">
        <Link to={PATHS.HOME}>
          <img src="/assets/payrole-logo.png" alt="PayRole" className="h-8 mb-10" />
        </Link>

        {step === 'slug' && (
          <>
            <h1 className="text-2xl font-semibold text-deep-cash mb-6">Sign in to PayRole</h1>

            <div>
              <p className="text-xs font-medium text-cash-green mb-1.5">Company code</p>
              <input
                className="w-full bg-transparent border-0 border-b border-cash-green/30 py-3 text-base text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSlugNext()}
                placeholder="e.g., acme-corp"
                autoFocus
              />
              <p className="text-xs text-cash-green/60 mt-2">
                Your company code is usually your company name in lowercase with hyphens.
              </p>
            </div>

            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

            <div className="flex justify-end mt-6 mb-8">
              <Button variant="primary" onClick={handleSlugNext} loading={false}>
                Next
              </Button>
            </div>

            <div className="h-px bg-cash-green/10 mb-6" />

            <div className="w-full flex items-center gap-3 px-4 py-4 border border-mint-light rounded-sm text-sm text-cash-green/70 bg-soft-white/50">
              <Building2 size={20} className="text-cash-green/50 flex-shrink-0" />
              <span>Don't have a company code? Contact your platform administrator.</span>
            </div>
          </>
        )}

        {step === 'credentials' && (
          <>
            <button
              onClick={() => setStep('slug')}
              className="flex items-center gap-2 text-sm text-deep-cash hover:underline mb-5"
            >
              <ArrowLeft size={16} />
              <span className="truncate max-w-[200px]">{tenantSlug}</span>
            </button>

            <h1 className="text-2xl font-semibold text-deep-cash mb-6">Sign in</h1>

            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-cash-green mb-1.5">Email address</p>
                <input
                  ref={emailRef}
                  className="w-full bg-transparent border-0 border-b border-cash-green/30 py-3 text-base text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoFocus
                />
              </div>

              <div>
                <p className="text-xs font-medium text-cash-green mb-1.5">Password</p>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    className="w-full bg-soft-white border-0 border-b border-cash-green/30 py-3 pr-10 text-base text-deep-cash outline-none focus:border-cash-green transition-colors"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
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
            </div>

            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

            {needsVerification && (
              <div className="mt-3 flex items-start gap-3 p-3 rounded-sm border border-cash-gold/30 bg-cash-gold/10">
                <MailWarning size={18} className="text-cash-gold flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  {resendState === 'sent' ? (
                    <p className="text-sm text-deep-cash">
                      If that account needs verifying, a new link is on its way — check your inbox.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-deep-cash mb-2">Haven't received the verification email?</p>
                      <Button variant="secondary" onClick={handleResendVerification} loading={resendState === 'sending'}>
                        Resend verification email
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6 mb-8">
              <Button variant="primary" onClick={handleSignIn} loading={loading}>
                Sign in
              </Button>
            </div>

            <div className="h-px bg-cash-green/10 mb-6" />

            <div className="w-full flex flex-col gap-3 px-4 py-4 border border-mint-light rounded-sm text-sm bg-soft-white/50">
              <div className="flex items-start gap-3">
                <KeyRound size={20} className="text-cash-green/50 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-cash-green/70">Forgot your password? Contact your administrator to reset it.</p>
                </div>
              </div>
              <div className="h-px bg-cash-green/10" />
              <div className="flex items-start gap-3">
                <MailWarning size={20} className="text-cash-green/50 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  {resendCredsState === 'sent' ? (
                    <p className="text-cash-green/70">
                      If that account is waiting on its first login, fresh credentials are on their way — check your inbox.
                    </p>
                  ) : (
                    <>
                      <p className="text-cash-green/70 mb-2">
                        Never signed in before, and never received your login details?
                      </p>
                      <button
                        onClick={handleResendCredentials}
                        disabled={!email.trim() || !tenantSlug.trim() || resendCredsState === 'sending'}
                        className="text-fresh-cash font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resendCredsState === 'sending' ? 'Sending…' : 'Resend my login details'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {step === 'slug' && (
          <p className="text-sm text-cash-green/70 mt-6 text-center">
            New here?{' '}
            <Link to={PATHS.REQUEST_ACCESS} className="text-fresh-cash font-medium hover:underline">
              Create your company account
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
