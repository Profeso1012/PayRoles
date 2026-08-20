import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft, WalletCards, Building2, Copy, Check, ArrowDownCircle, ArrowUpCircle, RotateCcw,
  Link2, ExternalLink,
} from 'lucide-react';
import { apiClient, apiClientWithMeta, ApiError } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { minorToMajor } from '@/lib/api/transforms';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import type {
  BackendWallet,
  BackendWalletTransaction,
  BackendVirtualAccount,
  BackendWalletTopupRequest,
  BackendProviderType,
} from '@/lib/api/types';

const TX_LABEL: Record<BackendWalletTransaction['type'], string> = {
  credit: 'Top-up',
  debit: 'Disbursement funding',
  release: 'Refund (failed batch)',
};

const TX_ICON: Record<BackendWalletTransaction['type'], typeof ArrowDownCircle> = {
  credit: ArrowDownCircle,
  debit: ArrowUpCircle,
  release: RotateCcw,
};

// Standing account - a tenant can transfer into it anytime, no live session needed.
// Remita has no dedicated-account product, so it's excluded here.
const DVA_PROVIDER_OPTIONS = [
  { value: '', label: 'Let platform choose' },
  { value: 'paystack', label: 'Paystack' },
  { value: 'flutterwave', label: 'Flutterwave' },
  { value: 'monnify', label: 'Monnify' },
];

// One-off hosted payment link for a specific amount - all four providers support this.
const CHECKOUT_PROVIDER_OPTIONS = [
  { value: '', label: 'Let platform choose' },
  { value: 'paystack', label: 'Paystack' },
  { value: 'flutterwave', label: 'Flutterwave' },
  { value: 'monnify', label: 'Monnify' },
  { value: 'remita', label: 'Remita' },
];

const PAGE_SIZE = 20;

function needsIdentity(err: unknown): boolean {
  return err instanceof ApiError && /bvn|nin/i.test(err.message);
}

export default function Wallet() {
  const navigate = useNavigate();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  // Same permission split as DisbursementSettings/PaymentFiles: DISBURSEMENT_READ
  // (viewing balance/ledger) is broader than DISBURSEMENT_CONFIGURE (provisioning
  // a top-up account or starting a checkout) - only tenant_admin/super_admin get the latter.
  const canView = role === 'finance_manager' || role === 'payroll_manager' || role === 'tenant_admin' || role === 'super_admin';
  const canFund = role === 'tenant_admin' || role === 'super_admin';

  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);

  const [vaProvider, setVaProvider] = useState('');
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [showIdentityForm, setShowIdentityForm] = useState(false);

  const [topupAmount, setTopupAmount] = useState('');
  const [topupProvider, setTopupProvider] = useState('');

  const { data: wallet, isLoading, isError, error, refetch } = useQuery<BackendWallet>({
    queryKey: ['wallet'],
    queryFn: () => apiClient<BackendWallet>(ENDPOINTS.WALLET.GET),
    enabled: canView,
  });

  const { data: txPage, isLoading: txLoading } = useQuery({
    queryKey: ['wallet-transactions', page],
    queryFn: () => {
      const params = buildPaginationParams({ page, limit: PAGE_SIZE });
      return apiClientWithMeta<BackendWalletTransaction[]>(`${ENDPOINTS.WALLET.TRANSACTIONS}?${params}`);
    },
    enabled: canView,
  });

  // getOrProvisionVirtualAccount on the backend is a true "get or create" -
  // idempotent, so calling it again on a later visit just returns the same
  // permanent account rather than making a new one. It's deliberately NOT
  // fetched automatically on page load though: an unconditional call here
  // raced against a user's own manual retry (or itself on window refocus)
  // and could hit the backend's check-then-insert race on VirtualAccount's
  // unique tenantId index, and it also meant silently hitting a live
  // provider API - and showing a scary error - for every tenant whose
  // default provider isn't usable yet, even ones who never asked. Only ever
  // fires from an explicit click below.
  const provisionMutation = useMutation({
    mutationFn: (vars?: { provider?: string; identity?: { bvn?: string; nin?: string } }) =>
      apiClient<BackendVirtualAccount>(ENDPOINTS.WALLET.PROVISION_VIRTUAL_ACCOUNT, {
        method: 'POST',
        body: JSON.stringify({
          provider: vars?.provider || undefined,
          identity: vars?.identity?.bvn || vars?.identity?.nin ? vars.identity : undefined,
        }),
      }),
    onSuccess: () => {
      setShowIdentityForm(false);
      setCopied(false);
    },
    onError: (err) => toast.error('Failed to get top-up account', err instanceof Error ? err.message : undefined),
  });

  const topupMutation = useMutation({
    mutationFn: () =>
      apiClient<BackendWalletTopupRequest>(ENDPOINTS.WALLET.INITIATE_TOPUP, {
        method: 'POST',
        body: JSON.stringify({
          amountMinor: Math.round(parseFloat(topupAmount) * 100),
          provider: (topupProvider || undefined) as BackendProviderType | undefined,
        }),
      }),
    onSuccess: (data) => {
      // Full-page navigation, deliberately - this hands off to the
      // provider's hosted checkout page (Paystack/Flutterwave/etc), which
      // redirects back to /wallet/topup/complete once payment finishes.
      window.location.href = data.checkoutUrl;
    },
    onError: (err) => toast.error('Failed to start top-up', err instanceof Error ? err.message : undefined),
  });

  if (!canView) {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: 'clamp(1.25rem, 4vw, 2rem) clamp(0.75rem, 4vw, 1.5rem)' }}>
        <div className="bg-white rounded-xl border border-mint-light p-8 text-center text-cash-green/70 text-sm">
          You need Finance or Payroll Manager access to view the company wallet.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !wallet) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  const transactions = txPage?.data ?? [];
  const total = txPage?.meta?.total ?? 0;
  const topupAmountValid = topupAmount !== '' && parseFloat(topupAmount) > 0;

  return (
    <div style={{ width: '100%', maxWidth: '960px', margin: '0 auto', padding: 'clamp(1.25rem, 4vw, 2rem) clamp(0.75rem, 4vw, 1.5rem)' }}>
      <button
        onClick={() => navigate('/payments')}
        className="flex items-center gap-2 text-sm text-cash-green hover:text-deep-cash transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        Back to Payments
      </button>
      <PageHeader
        title="Wallet"
        breadcrumbs={[{ label: 'Payments', path: '/payments' }, { label: 'Wallet' }]}
      />

      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 'clamp(0.75rem, 2vw, 1rem)' }}
        className="mb-6"
      >
        {/* Balance */}
        <div className="bg-white rounded-xl border border-mint-light" style={{ padding: 'clamp(1.25rem, 3vw, 1.5rem)' }}>
          <div className="flex items-center gap-2 mb-3">
            <WalletCards size={16} className="text-cash-green" />
            <h3 className="text-sm font-semibold text-deep-cash">Balance</h3>
          </div>
          <MoneyDisplay amount={minorToMajor(wallet.balanceMinor, wallet.currency)} currency={wallet.currency} size="lg" />
          <p className="text-xs text-cash-green/60 mt-2">
            Used to auto-fund disbursement batches instead of a configured provider - opt in per
            batch from the Initiate dialog on the Payments page.
          </p>
        </div>

        {/* Top-up path A: dedicated virtual account */}
        <div className="bg-white rounded-xl border border-mint-light" style={{ padding: 'clamp(1.25rem, 3vw, 1.5rem)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={16} className="text-cash-green" />
            <h3 className="text-sm font-semibold text-deep-cash">Top-up Account</h3>
          </div>

          {!canFund ? (
            <p className="text-xs text-cash-green/60">
              Ask a Tenant Admin to set up a top-up account for this company.
            </p>
          ) : provisionMutation.data ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-cash-green/60">{provisionMutation.data.bankName} · {provisionMutation.data.accountName}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm font-mono text-deep-cash bg-soft-white px-2 py-1 rounded">{provisionMutation.data.accountNumber}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => { await navigator.clipboard.writeText(provisionMutation.data!.accountNumber); setCopied(true); }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </Button>
              </div>
              <p className="text-xs text-cash-green/50 mt-1">
                Transfer here from any bank app or USSD code - it's auto-credited to the wallet,
                usually within a few minutes.
              </p>
            </div>
          ) : provisionMutation.isPending ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : provisionMutation.isError ? (
            <div className="flex flex-col gap-3">
              {!showIdentityForm && (
                <>
                  <p className="text-xs text-amber-600">
                    {needsIdentity(provisionMutation.error)
                      ? "The platform's default provider needs a BVN or NIN to verify a dedicated account for you."
                      : (provisionMutation.error instanceof Error ? provisionMutation.error.message : 'Could not set up a top-up account.')}
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => setShowIdentityForm(true)}>
                    Set Up Manually
                  </Button>
                </>
              )}
              {showIdentityForm && (
                <div className="flex flex-col gap-3 pt-1 border-t border-mint-light">
                  <Select
                    label="Provider"
                    value={vaProvider}
                    options={DVA_PROVIDER_OPTIONS}
                    onChange={setVaProvider}
                  />
                  {vaProvider === 'flutterwave' && (
                    <>
                      <Input
                        label="BVN"
                        value={bvn}
                        onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        placeholder="11-digit Bank Verification Number"
                        hint="Required by Flutterwave to issue a static account. Provide BVN or NIN."
                      />
                      <Input
                        label="NIN (alternative to BVN)"
                        value={nin}
                        onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        placeholder="11-digit National Identification Number"
                      />
                    </>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    loading={provisionMutation.isPending}
                    disabled={vaProvider === 'flutterwave' && bvn.length !== 11 && nin.length !== 11}
                    onClick={() => provisionMutation.mutate({ provider: vaProvider, identity: { bvn, nin } })}
                  >
                    Get Top-up Account
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-cash-green/70">
                Get a dedicated account number - transfer into it anytime to top up this wallet automatically.
              </p>
              <Button
                variant="secondary"
                size="sm"
                loading={provisionMutation.isPending}
                onClick={() => provisionMutation.mutate({})}
              >
                Get Top-up Account
              </Button>
            </div>
          )}
        </div>

        {/* Top-up path B: one-off checkout link */}
        <div className="bg-white rounded-xl border border-mint-light" style={{ padding: 'clamp(1.25rem, 3vw, 1.5rem)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={16} className="text-cash-green" />
            <h3 className="text-sm font-semibold text-deep-cash">Fund via Checkout</h3>
          </div>
          {!canFund ? (
            <p className="text-xs text-cash-green/60">
              Ask a Tenant Admin to fund the wallet for this company.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-cash-green/70">
                Pay a specific amount now via a hosted payment page - the wallet is credited the
                moment it clears.
              </p>
              <Input
                label="Amount (NGN)"
                type="number"
                min={1}
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="e.g. 50000"
              />
              <Select
                label="Provider"
                value={topupProvider}
                options={CHECKOUT_PROVIDER_OPTIONS}
                onChange={setTopupProvider}
              />
              <Button
                variant="primary"
                size="sm"
                loading={topupMutation.isPending}
                disabled={!topupAmountValid}
                onClick={() => topupMutation.mutate()}
              >
                <ExternalLink size={13} />
                Pay Now
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-mint-light overflow-hidden">
        <div className="px-6 py-4 border-b border-mint-light">
          <h3 className="text-sm font-semibold text-deep-cash">Transaction History</h3>
        </div>
        {txLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : transactions.length === 0 ? (
          <EmptyState title="No wallet activity yet" description="Top-ups and disbursement funding will show up here." />
        ) : (
          <>
            <div className="divide-y divide-mint-light">
              {transactions.map((tx) => {
                const Icon = TX_ICON[tx.type];
                const isCredit = tx.type !== 'debit';
                return (
                  <div key={tx.id} className="flex items-center justify-between gap-3 px-6 py-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-mint-light' : 'bg-amber-100'}`}>
                        <Icon size={16} className={isCredit ? 'text-fresh-cash' : 'text-amber-600'} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-deep-cash truncate">{TX_LABEL[tx.type]}</p>
                        <p className="text-xs text-cash-green/60 truncate">{formatDate(tx.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold tabular-nums ${isCredit ? 'text-fresh-cash' : 'text-deep-cash'}`}>
                        {isCredit ? '+' : '-'}
                        <MoneyDisplay amount={minorToMajor(tx.amountMinor)} currency={wallet.currency} size="sm" className={isCredit ? 'text-fresh-cash' : 'text-deep-cash'} />
                      </p>
                      <p className="text-xs text-cash-green/50 mt-0.5">
                        Balance: <MoneyDisplay amount={minorToMajor(tx.balanceAfterMinor)} currency={wallet.currency} size="sm" className="text-cash-green/50 font-normal" />
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6">
              <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
