import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, WalletCards, XCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { minorToMajor } from '@/lib/api/transforms';
import { errorMessage } from '@/lib/errors';
import Button from '@/components/ui/Button';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Spinner from '@/components/ui/Spinner';
import { readResumeIntent } from '@/components/shared/WalletTopUpPrompt';
import type { BackendWallet } from '@/lib/api/types';

const VERIFY_ATTEMPTS = 6;
const VERIFY_INTERVAL_MS = 4000;

type TopupStatus = 'pending' | 'completed' | 'failed' | 'expired';

interface VerifyResult {
  status: TopupStatus;
  amountMinor: number;
  balanceMinor: number;
}

/** Providers append the checkout reference under different names. */
function referenceFrom(params: URLSearchParams): string | null {
  return (
    params.get('reference') ??
    params.get('trxref') ??
    params.get('tx_ref') ??
    params.get('paymentReference') ??
    null
  );
}

/**
 * Landing page for the checkout provider's post-payment redirect
 * (${appUrl}/wallet/topup/complete). It asks the backend to verify the
 * payment with the provider and credit the wallet - so the top-up lands even
 * when the provider's webhook never arrives - retrying briefly while the
 * provider still reports it as pending. If the top-up was started to fund a
 * payout, it offers to go straight back and finish it.
 */
export default function WalletTopupComplete() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const reference = referenceFrom(params);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState('');
  const resumeIntent = readResumeIntent();

  // No reference on the URL (older provider redirect) - just show the balance.
  const { data: wallet, isLoading: walletLoading } = useQuery<BackendWallet>({
    queryKey: ['wallet'],
    queryFn: () => apiClient<BackendWallet>(ENDPOINTS.WALLET.GET),
  });

  useEffect(() => {
    if (!reference || attempts >= VERIFY_ATTEMPTS || result?.status === 'completed') return;
    if (result && result.status !== 'pending') return;
    const timer = setTimeout(
      async () => {
        try {
          const r = await apiClient<VerifyResult>(ENDPOINTS.WALLET.VERIFY_TOPUP(reference), {
            method: 'POST',
          });
          setResult(r);
          if (r.status === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
          }
        } catch (err) {
          setError(errorMessage(err, "We couldn't confirm this top-up yet."));
        } finally {
          setAttempts((a) => a + 1);
        }
      },
      attempts === 0 ? 0 : VERIFY_INTERVAL_MS,
    );
    return () => clearTimeout(timer);
  }, [reference, attempts, result, queryClient]);

  const status: TopupStatus | 'checking' =
    result?.status ?? (reference && attempts < VERIFY_ATTEMPTS ? 'checking' : 'pending');
  const stillChecking = status === 'checking' || (status === 'pending' && attempts < VERIFY_ATTEMPTS);
  const balanceMinor = result?.balanceMinor ?? (wallet ? Number(wallet.balanceMinor) : undefined);
  const currency = wallet?.currency ?? 'NGN';

  const heading =
    status === 'completed'
      ? 'Wallet topped up'
      : status === 'failed' || status === 'expired'
        ? "Payment didn't go through"
        : stillChecking
          ? 'Confirming your payment…'
          : 'Payment still processing';
  const message =
    status === 'completed'
      ? `${minorToMajor(result!.amountMinor, currency).toLocaleString('en-NG', { style: 'currency', currency })} has been added to your wallet.`
      : status === 'failed' || status === 'expired'
        ? 'The payment provider reports this payment as unsuccessful, so your wallet was not credited.'
        : stillChecking
          ? "We're checking with the payment provider. This usually takes a few seconds."
          : "The payment provider hasn't confirmed this payment yet. You can check again from your wallet in a few minutes.";

  const Icon =
    status === 'completed' ? CheckCircle2 : status === 'failed' || status === 'expired' ? XCircle : Clock;

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
          {stillChecking && !result ? (
            <Spinner />
          ) : (
            <Icon
              className={status === 'failed' || status === 'expired' ? 'text-red-500' : 'text-fresh-cash'}
              size={32}
            />
          )}
        </div>
        <h1 className="text-xl font-bold text-deep-cash mb-2">{heading}</h1>
        <p className="text-sm text-cash-green/70 mb-6">{message}</p>
        {error && !result && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="bg-soft-white rounded-lg p-5 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <WalletCards size={15} className="text-cash-green" />
            <p className="text-xs font-semibold text-cash-green uppercase tracking-wide">Current Balance</p>
          </div>
          {balanceMinor === undefined && walletLoading ? (
            <div className="flex justify-center py-2"><Spinner size="sm" /></div>
          ) : balanceMinor !== undefined ? (
            <MoneyDisplay amount={minorToMajor(balanceMinor, currency)} currency={currency} size="lg" />
          ) : (
            <p className="text-sm text-cash-green/60">Unable to load balance</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {status === 'completed' && resumeIntent && (
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate(`/payments/disbursements/${resumeIntent.runId}?resume=1`)}
            >
              Continue to payout
            </Button>
          )}
          <Button
            variant={status === 'completed' && resumeIntent ? 'secondary' : 'primary'}
            className="w-full"
            onClick={() => navigate('/payments/wallet')}
          >
            Go to Wallet
          </Button>
        </div>
      </div>
    </div>
  );
}
