import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, KeyRound, Building2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import Button from '@/components/ui/Button';
import type { AuthUser } from '@contracts/types/auth';
import type { LoginResponse } from '@/lib/api/types';

type Step = 'email' | 'tenant' | 'password';

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tenantRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleEmailNext = () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    setStep('tenant');
    setError('');
    setTimeout(() => tenantRef.current?.focus(), 50);
  };

  const handleTenantNext = () => {
    if (!tenantSlug.trim()) {
      setError('Please enter your company code');
      return;
    }
    setStep('password');
    setError('');
    setTimeout(() => passwordRef.current?.focus(), 50);
  };

  const handleSignIn = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    setLoading(true);
    setError('');
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
      });

      // Step 3: Fetch user profile
      const user = await apiClient<AuthUser>(ENDPOINTS.AUTH.ME);

      // Step 4: Update session with user
      setSession({ user });

      // Navigate based on role
      const role = user.role;
      if (role === 'PLATFORM_ADMIN') navigate('/admin');
      else if (role === 'EMPLOYEE') navigate('/my-payslips');
      else navigate('/dashboard');
    } catch (err: any) {
      const message = err?.message || 'Invalid credentials or company code';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center h-full">
      <div className="w-full max-w-sm mx-auto">
        <img src="/assets/payrole-logo.png" alt="PayRole" className="h-8 mb-10" />

        {step === 'email' && (
          <>
            <h1 className="text-2xl font-semibold text-deep-cash mb-6">Sign in</h1>

            <div>
              <p className="text-xs font-medium text-cash-green mb-1.5">Email address</p>
              <input
                className="w-full bg-transparent border-0 border-b border-cash-green/30 py-3 text-base text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                placeholder="you@company.com"
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

            <button
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-cash-green hover:text-fresh-cash cursor-pointer mt-3 inline-block"
            >
              Can't access your account?
            </button>

            <div className="flex justify-end mt-6 mb-8">
              <Button variant="primary" onClick={handleEmailNext} loading={false}>
                Next
              </Button>
            </div>

            <div className="h-px bg-cash-green/10 mb-6" />

            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full flex items-center gap-3 px-4 py-4 border border-mint-light rounded-sm text-sm text-cash-green hover:bg-soft-white hover:border-cash-green/40 transition-colors shadow-sm"
            >
              <KeyRound size={20} className="text-cash-green flex-shrink-0" />
              <span>Forgot your password?</span>
            </button>
          </>
        )}

        {step === 'tenant' && (
          <>
            <button
              onClick={() => setStep('email')}
              className="flex items-center gap-2 text-sm text-deep-cash hover:underline mb-5"
            >
              <ArrowLeft size={16} />
              <span className="truncate max-w-[200px]">{email}</span>
            </button>

            <h1 className="text-2xl font-semibold text-deep-cash mb-6">Company code</h1>

            <div>
              <p className="text-xs font-medium text-cash-green mb-1.5">Enter your company code</p>
              <input
                ref={tenantRef}
                className="w-full bg-transparent border-0 border-b border-cash-green/30 py-3 text-base text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleTenantNext()}
                placeholder="e.g., acme-corp"
                autoFocus
              />
              <p className="text-xs text-cash-green/60 mt-2">
                Your company code is usually your company name in lowercase with hyphens.
              </p>
            </div>

            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

            <div className="flex justify-end mt-6 mb-8">
              <Button variant="primary" onClick={handleTenantNext} loading={false}>
                Next
              </Button>
            </div>

            <div className="h-px bg-cash-green/10 mb-6" />

            <button
              onClick={() => navigate('/request-access')}
              className="w-full flex items-center gap-3 px-4 py-4 border border-mint-light rounded-sm text-sm text-cash-green hover:bg-soft-white hover:border-cash-green/40 transition-colors shadow-sm"
            >
              <Building2 size={20} className="text-cash-green flex-shrink-0" />
              <span>Don't have a company code? Request access</span>
            </button>
          </>
        )}

        {step === 'password' && (
          <>
            <button
              onClick={() => setStep('tenant')}
              className="flex items-center gap-2 text-sm text-deep-cash hover:underline mb-5"
            >
              <ArrowLeft size={16} />
              <span className="truncate max-w-[200px]">{tenantSlug}</span>
            </button>

            <h1 className="text-2xl font-semibold text-deep-cash mb-6">Enter password</h1>

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

            <button
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-cash-green hover:text-fresh-cash mt-3 inline-block"
            >
              Forgot my password
            </button>

            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

            <div className="flex justify-end mt-6 mb-8">
              <Button variant="primary" onClick={handleSignIn} loading={loading}>
                Sign in
              </Button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
