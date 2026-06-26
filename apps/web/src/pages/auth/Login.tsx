import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import Button from '@/components/ui/Button';
import type { AuthUser } from '@contracts/types/auth';

type Step = 'email' | 'password';

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordRef = useRef<HTMLInputElement>(null);

  const handleNext = () => {
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
      const data = await apiClient<{ token: string; user: AuthUser; requiresOtp: boolean }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      );
      setSession(data.user, data.token);
      const role = data.user.role;
      if (role === 'PLATFORM_ADMIN') navigate('/admin');
      else if (role === 'EMPLOYEE') navigate('/my-payslips');
      else navigate('/dashboard');
    } catch {
      setError('Invalid email or password');
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
              <Button variant="primary" onClick={handleNext} loading={false}>
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

        <p className="text-xs text-cash-green/70 text-center mt-6">
          New to PayRole?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-cash-green font-medium hover:text-fresh-cash underline"
          >
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
}
