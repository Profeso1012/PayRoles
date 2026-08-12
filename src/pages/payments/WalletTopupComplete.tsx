import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, WalletCards } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { minorToMajor } from '@/lib/api/transforms';
import Button from '@/components/ui/Button';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Spinner from '@/components/ui/Spinner';
import type { BackendWallet } from '@/lib/api/types';

const POLL_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 4000;

/**
 * Landing page for the checkout provider's post-payment redirect
 * (${appUrl}/wallet/topup/complete - see WalletService#initiateCheckoutTopup
 * on the backend). Crediting happens server-side via webhook, not from
 * anything on this URL, so this page just polls the balance a few times to
 * catch a webhook that lands within the first moments after redirect.
 */
export default function WalletTopupComplete() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState(0);

  const { data: wallet, isLoading, refetch } = useQuery<BackendWallet>({
    queryKey: ['wallet'],
    queryFn: () => apiClient<BackendWallet>(ENDPOINTS.WALLET.GET),
  });

  useEffect(() => {
    if (attempts >= POLL_ATTEMPTS) return;
    const timer = setTimeout(() => {
      refetch();
      setAttempts((a) => a + 1);
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [attempts, refetch]);

  const stillConfirming = attempts < POLL_ATTEMPTS;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
        padding: 'clamp(2rem, 8vw, 4rem) clamp(1rem, 4vw, 1.5rem)',
      }}
    >
      <div
        className="bg-white rounded-xl border border-mint-light text-center"
        style={{ padding: 'clamp(1.5rem, 5vw, 2.5rem)' }}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-mint-light mb-5">
          <CheckCircle2 className="text-fresh-cash" size={32} />
        </div>
        <h1 className="text-xl font-bold text-deep-cash mb-2">Payment received</h1>
        <p className="text-sm text-cash-green/70 mb-6">
          We're confirming your top-up with the provider. Your wallet balance updates automatically
          once it clears - usually within a few minutes.
        </p>

        <div className="bg-soft-white rounded-lg p-5 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <WalletCards size={15} className="text-cash-green" />
            <p className="text-xs font-semibold text-cash-green uppercase tracking-wide">Current Balance</p>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-2"><Spinner size="sm" /></div>
          ) : wallet ? (
            <MoneyDisplay amount={minorToMajor(wallet.balanceMinor, wallet.currency)} currency={wallet.currency} size="lg" />
          ) : (
            <p className="text-sm text-cash-green/60">Unable to load balance</p>
          )}
          {stillConfirming && (
            <p className="text-xs text-cash-green/50 mt-2">Checking for updates…</p>
          )}
        </div>

        <Button variant="primary" className="w-full" onClick={() => navigate('/payments/wallet')}>
          Go to Wallet
        </Button>
      </div>
    </div>
  );
}
