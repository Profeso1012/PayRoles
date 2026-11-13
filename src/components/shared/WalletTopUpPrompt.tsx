import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { WalletCards } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { errorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

/**
 * Which payout to come back to after a top-up. The provider's checkout is a
 * full-page redirect, so this survives it in sessionStorage; the top-up
 * return page reads it to offer "Continue to payout".
 */
export interface PayoutResumeIntent {
  runId: string;
  action: 'initiate' | 'execute' | 'retry';
  retryProvider?: string;
  savedAt: number;
}

const RESUME_KEY = 'payrole:resume-payout';
const RESUME_TTL_MS = 2 * 60 * 60 * 1000;

export function saveResumeIntent(intent: Omit<PayoutResumeIntent, 'savedAt'>): void {
  try {
    sessionStorage.setItem(RESUME_KEY, JSON.stringify({ ...intent, savedAt: Date.now() }));
  } catch {
    // Without storage the user just navigates back to the payout themselves.
  }
}

/** The saved intent if it's recent; pass `clear` to consume it. */
export function readResumeIntent(clear = false): PayoutResumeIntent | null {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    if (clear) sessionStorage.removeItem(RESUME_KEY);
    if (!raw) return null;
    const intent = JSON.parse(raw) as PayoutResumeIntent;
    return Date.now() - intent.savedAt < RESUME_TTL_MS ? intent : null;
  } catch {
    return null;
  }
}

export interface TopUpRequest {
  action: PayoutResumeIntent['action'];
  requiredMinor: number;
  balanceMinor: number;
  currency?: string;
  retryProvider?: string;
}

interface Props {
  runId: string;
  request: TopUpRequest | null;
  onClose: () => void;
}

const ACTION_TEXT: Record<PayoutResumeIntent['action'], string> = {
  initiate: 'this payout',
  execute: 'this payout',
  retry: 'retrying the failed payments',
};

/**
 * Shown before a wallet-funded payout, execution or retry when the wallet
 * can't cover it: offers to top up exactly the difference, then brings the
 * user back to finish the payout once the top-up is confirmed.
 */
export default function WalletTopUpPrompt({ runId, request, onClose }: Props) {
  const [error, setError] = useState('');
  const currency = request?.currency ?? 'NGN';
  const shortfallMinor = request ? Math.max(0, request.requiredMinor - request.balanceMinor) : 0;

  const topUp = useMutation({
    mutationFn: () =>
      apiClient<{ checkoutUrl: string }>(ENDPOINTS.WALLET.INITIATE_TOPUP, {
        method: 'POST',
        body: JSON.stringify({ amountMinor: shortfallMinor }),
      }),
    onSuccess: ({ checkoutUrl }) => {
      saveResumeIntent({ runId, action: request!.action, retryProvider: request!.retryProvider });
      window.location.assign(checkoutUrl);
    },
    onError: (err) => setError(errorMessage(err, "We couldn't start the top-up. Please try again.")),
  });

  const money = (minor: number) => formatMoney(minor / 100, currency);

  return (
    <Modal
      isOpen={!!request}
      onClose={() => {
        setError('');
        onClose();
      }}
      title="Top up your wallet to continue"
      size="sm"
    >
      {request && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <WalletCards size={20} className="text-cash-green shrink-0 mt-0.5" />
            <p className="text-sm text-deep-cash">
              Your wallet doesn't have enough for {ACTION_TEXT[request.action]}. Top up the
              difference and you'll come straight back here to finish.
            </p>
          </div>

          <dl className="bg-soft-white rounded-lg p-4 text-sm grid grid-cols-2 gap-y-2">
            <dt className="text-cash-green/70">Needed</dt>
            <dd className="text-right font-medium text-deep-cash">{money(request.requiredMinor)}</dd>
            <dt className="text-cash-green/70">Wallet balance</dt>
            <dd className="text-right font-medium text-deep-cash">{money(request.balanceMinor)}</dd>
            <dt className="text-deep-cash font-semibold border-t border-mint-light pt-2">To top up</dt>
            <dd className="text-right font-semibold text-deep-cash border-t border-mint-light pt-2">
              {money(shortfallMinor)}
            </dd>
          </dl>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Not now
            </Button>
            <Button variant="primary" loading={topUp.isPending} onClick={() => topUp.mutate()}>
              Top up {money(shortfallMinor)}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
