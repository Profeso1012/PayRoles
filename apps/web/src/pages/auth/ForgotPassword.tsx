import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import Button from '@/components/ui/Button';

type State = 'form' | 'sent';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [state, setState] = useState<State>('form');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setState('sent');
    } catch {
      setError('Something went wrong. Please try again.');
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
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 text-sm text-deep-cash hover:underline mb-5"
            >
              <ArrowLeft size={16} />
              Back to sign in
            </button>

            <h1 className="text-2xl font-semibold text-deep-cash mb-2">Reset your password</h1>
            <p className="text-sm text-cash-green/80 mb-8">
              Enter your email and we'll send you a reset link.
            </p>

            <div>
              <p className="text-xs font-medium text-cash-green mb-1.5">Email address</p>
              <input
                className="w-full bg-transparent border-0 border-b border-cash-green/30 py-3 text-base text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="you@company.com"
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

            <div className="flex justify-end mt-6">
              <Button variant="primary" onClick={handleSubmit} loading={loading}>
                Send reset link
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
              We've sent a password reset link to{' '}
              <strong className="text-deep-cash">{email}</strong>. Check your inbox and spam
              folder.
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
