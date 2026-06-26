import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api';
import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';

type Step = 'form' | 'otp' | 'done';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function Register() {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState<Step>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP state
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResendTimer = useCallback(() => {
    setResendSeconds(RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleRegister = async () => {
    if (!fullName.trim()) { setError('Please enter your full name'); return; }
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!companyName.trim()) { setError('Please enter your company name'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      await apiClient('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, companyName, password }),
      });
      setStep('otp');
      startResendTimer();
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = useCallback(async (digits: string[]) => {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) return;
    setVerifying(true);
    setOtpError('');
    try {
      await apiClient('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, otp: code }),
      });
      setStep('done');
      toast.success('Account created! Please sign in to continue.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Incorrect code. Please try again.';
      setOtpError(msg);
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setVerifying(false);
    }
  }, [email, toast]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setOtpError('');
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== '')) {
      submitOtp(next);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const next = [...otp];
        next[index] = '';
        setOtp(next);
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus();
        const next = [...otp];
        next[index - 1] = '';
        setOtp(next);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[focusIdx]?.focus();
    if (pasted.length === OTP_LENGTH) submitOtp(next);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await apiClient('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setOtp(Array(OTP_LENGTH).fill(''));
      setOtpError('');
      startResendTimer();
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
      toast.success('New verification code sent.');
    } catch {
      toast.error('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // ── Form step ──
  if (step === 'form') {
    return (
      <div className="flex flex-col justify-center h-full">
        <div className="w-full max-w-sm mx-auto">
          <img src="/assets/payrole-logo.png" alt="PayRole" className="h-8 mb-8" />

          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-sm text-deep-cash hover:underline mb-5"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </button>

          <h1 className="text-2xl font-semibold text-deep-cash mb-1">Create your account</h1>
          <p className="text-sm text-cash-green/70 mb-7">Set up PayRole for your organisation.</p>

          <div className="mb-5">
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

          <div className="mb-5">
            <p className="text-xs font-medium text-cash-green mb-1.5">Work email</p>
            <input
              className="w-full bg-transparent border-0 border-b border-cash-green/30 py-3 text-base text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <div className="mb-5">
            <p className="text-xs font-medium text-cash-green mb-1.5">Company name</p>
            <input
              className="w-full bg-transparent border-0 border-b border-cash-green/30 py-3 text-base text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company name"
            />
          </div>

          <div className="mb-5">
            <p className="text-xs font-medium text-cash-green mb-1.5">Password</p>
            <div className="relative">
              <input
                className="w-full bg-transparent border-0 border-b border-cash-green/30 py-3 pr-10 text-base text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-cash-green/60 hover:text-cash-green">
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
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                placeholder="Repeat password"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-cash-green/60 hover:text-cash-green">
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

          <div className="flex justify-end mt-6 mb-8">
            <Button variant="primary" onClick={handleRegister} loading={loading}>
              Create account
            </Button>
          </div>

          <p className="text-xs text-cash-green/70 text-center">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-cash-green font-medium hover:text-fresh-cash underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ── OTP step ──
  if (step === 'otp') {
    return (
      <div className="flex flex-col justify-center h-full">
        <div className="w-full max-w-sm mx-auto">
          <img src="/assets/payrole-logo.png" alt="PayRole" className="h-8 mb-8" />

          <button
            onClick={() => { setStep('form'); setOtp(Array(OTP_LENGTH).fill('')); setOtpError(''); }}
            className="flex items-center gap-2 text-sm text-deep-cash hover:underline mb-5"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <h1 className="text-2xl font-semibold text-deep-cash mb-2">Verify your email</h1>
          <p className="text-sm text-cash-green/80 mb-1">
            Enter the 6-digit code sent to
          </p>
          <p className="text-sm font-semibold text-deep-cash mb-8">{email}</p>

          {/* 6-box OTP input */}
          <div className="flex gap-2.5 justify-center mb-4" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el; }}
                className={[
                  'w-[46px] h-[52px] text-center text-xl font-bold text-fresh-cash outline-none',
                  'border-2 rounded-xl transition-all',
                  otpError
                    ? 'border-red-400 bg-red-50'
                    : digit
                    ? 'border-fresh-cash bg-mint-light/30'
                    : 'border-cash-green/30 bg-soft-white focus:border-fresh-cash focus:bg-mint-light/20',
                ].join(' ')}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                disabled={verifying}
              />
            ))}
          </div>

          {otpError && (
            <p className="text-sm text-red-500 text-center mb-3">{otpError}</p>
          )}

          {verifying && (
            <p className="text-sm text-cash-green text-center mb-3">Verifying...</p>
          )}

          {/* Resend */}
          <div className="text-center mb-8">
            {resendSeconds > 0 ? (
              <p className="text-xs text-cash-green/60">
                Resend code in{' '}
                <span className="font-medium text-cash-green">{resendSeconds}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-1.5 text-xs text-cash-green hover:text-fresh-cash underline disabled:opacity-50"
              >
                <RefreshCw size={12} />
                {resending ? 'Resending...' : 'Resend code'}
              </button>
            )}
          </div>

          <p className="text-xs text-cash-green/50 text-center">
            Hint: the mock code is{' '}
            <span className="font-mono font-semibold text-cash-green">123456</span>
          </p>
        </div>
      </div>
    );
  }

  // ── Done step ──
  return (
    <div className="flex flex-col justify-center h-full">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center py-8">
        <img src="/assets/payrole-logo.png" alt="PayRole" className="h-8 mb-10" />
        <div className="w-16 h-16 rounded-full bg-mint-light flex items-center justify-center mb-6">
          <CheckCircle size={32} className="text-cash-green" />
        </div>
        <h2 className="text-xl font-semibold text-deep-cash mb-2">Account created</h2>
        <p className="text-sm text-cash-green/80 max-w-xs">
          Your account is ready. Sign in to start setting up your organisation.
        </p>
        <Button
          variant="primary"
          onClick={() => navigate('/login')}
          className="mt-8"
        >
          Sign in now
        </Button>
      </div>
    </div>
  );
}
