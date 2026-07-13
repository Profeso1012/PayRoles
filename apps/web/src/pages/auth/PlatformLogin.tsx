import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import Button from '@/components/ui/Button';
import type { LoginResponse } from '@/lib/api/types';
import type { AuthUser } from '@contracts/types/auth';

interface BackendPlatformUserMe {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

type Step = 'email' | 'password';

/**
 * Platform Admin Login Page
 * 
 * Separate login flow for platform administrators.
 * Uses /api/platform/auth/login endpoint (no tenant slug required).
 */
export default function PlatformLogin() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordRef = useRef<HTMLInputElement>(null);

  const handleEmailNext = () => {
    if (!email.trim()) {
      setError('Please enter your email');
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
      // Step 1: Platform admin login (no tenantSlug)
      const loginData = await apiClient<LoginResponse>(
        ENDPOINTS.PLATFORM_AUTH.LOGIN,
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
          skipAuthRedirect: true,
        },
      );

      // Step 2: Store tokens
      setSession({
        accessToken: loginData.accessToken,
        refreshToken: loginData.refreshToken,
        expiresIn: loginData.expiresIn,
      });

      // Step 3: Fetch real platform user profile (GET /platform/users/me)
      let fullName = email;
      let id = 'platform-user';
      try {
        const profile = await apiClient<BackendPlatformUserMe>(ENDPOINTS.PLATFORM_USERS.ME);
        id = profile.id;
        fullName = `${profile.firstName} ${profile.lastName}`.trim();
      } catch {
        // Non-fatal - fall back to email if /platform/users/me is unavailable.
      }

      const platformUser: AuthUser = {
        id,
        email,
        fullName,
        role: 'PLATFORM_ADMIN',
        tenantId: null,
        tenantName: null,
        avatarUrl: null,
        workerId: null,
      };

      // Step 4: Update session with user
      setSession({ user: platformUser });

      // Navigate to platform admin dashboard
      navigate('/admin');
    } catch (err: any) {
      const message = err?.message || 'Invalid platform credentials';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center h-full">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="text-cash-green" size={32} />
          <img src="/assets/payrole-logo.png" alt="PayRole" className="h-8" />
        </div>

        <div className="bg-soft-white border border-cash-green/20 rounded-sm p-4 mb-6">
          <p className="text-sm text-deep-cash flex items-start gap-2">
            <Shield size={16} className="text-cash-green flex-shrink-0 mt-0.5" />
            <span>
              <strong className="font-medium">Platform Administration</strong>
              <br />
              This is the system administrator login. For regular access, use the{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-cash-green hover:underline"
              >
                standard login
              </button>
              .
            </span>
          </p>
        </div>

        {step === 'email' && (
          <>
            <h1 className="text-2xl font-semibold text-deep-cash mb-6">Platform Sign in</h1>

            <div>
              <p className="text-xs font-medium text-cash-green mb-1.5">Administrator Email</p>
              <input
                className="w-full bg-transparent border-0 border-b border-cash-green/30 py-3 text-base text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailNext()}
                placeholder="admin@platform.internal"
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

            <div className="flex justify-end mt-6">
              <Button variant="primary" onClick={handleEmailNext} loading={false}>
                Next
              </Button>
            </div>
          </>
        )}

        {step === 'password' && (
          <>
            <button
              onClick={() => setStep('email')}
              className="flex items-center gap-2 text-sm text-deep-cash hover:underline mb-5"
            >
              <ArrowLeft size={16} />
              <span className="truncate max-w-[200px]">{email}</span>
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

            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

            <div className="flex justify-end mt-6">
              <Button variant="primary" onClick={handleSignIn} loading={loading}>
                Sign in
              </Button>
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-cash-green hover:underline"
          >
            ← Back to regular login
          </button>
        </div>
      </div>
    </div>
  );
}
