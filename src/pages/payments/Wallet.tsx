import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, WalletCards, Building2, Copy, Check, ArrowDownCircle, ArrowUpCircle, RotateCcw } from 'lucide-react';
import { apiClient, apiClientWithMeta } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { minorToMajor } from '@/lib/api/transforms';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import type { BackendWallet, BackendWalletTransaction, BackendVirtualAccount } from '@/lib/api/types';

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

const PAGE_SIZE = 20;

export default function Wallet() {
  const navigate = useNavigate();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  // Same permission split as DisbursementSettings/PaymentFiles: DISBURSEMENT_READ
  // (viewing balance/ledger) is broader than DISBURSEMENT_CONFIGURE (provisioning
  // the top-up account) - only tenant_admin/super_admin get the latter.
  const canView = role === 'finance_manager' || role === 'payroll_manager' || role === 'tenant_admin' || role === 'super_admin';
  const canProvision = role === 'tenant_admin' || role === 'super_admin';

  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);

  const { data: wallet, isLoading, isError, refetch } = useQuery<BackendWallet>({
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

  const provisionMutation = useMutation({
    mutationFn: () => apiClient<BackendVirtualAccount>(ENDPOINTS.WALLET.PROVISION_VIRTUAL_ACCOUNT, { method: 'POST' }),
    onSuccess: () => setCopied(false),
    onError: (err) => toast.error('Failed to provision top-up account', err instanceof Error ? err.message : undefined),
  });

  if (!canView) {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
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
    return <ErrorState onRetry={() => refetch()} />;
  }

  const account = provisionMutation.data;
  const transactions = txPage?.data ?? [];
  const total = txPage?.meta?.total ?? 0;

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
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
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}
        className="mb-6"
      >
        <div className="bg-white rounded-xl border border-mint-light p-6">
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

        <div className="bg-white rounded-xl border border-mint-light p-6">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={16} className="text-cash-green" />
            <h3 className="text-sm font-semibold text-deep-cash">Top-up Account</h3>
          </div>
          {account ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-cash-green/60">{account.bankName} · {account.accountName}</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-deep-cash bg-soft-white px-2 py-1 rounded">{account.accountNumber}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => { await navigator.clipboard.writeText(account.accountNumber); setCopied(true); }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </Button>
              </div>
              <p className="text-xs text-cash-green/50 mt-1">
                Transfers here are auto-credited to the wallet - usually within a few minutes.
              </p>
            </div>
          ) : canProvision ? (
            <>
              <p className="text-xs text-cash-green/70 mb-3">
                Provision a dedicated account number - any transfer into it tops up this wallet
                automatically.
              </p>
              <Button variant="secondary" size="sm" loading={provisionMutation.isPending} onClick={() => provisionMutation.mutate()}>
                Get Top-up Account
              </Button>
            </>
          ) : (
            <p className="text-xs text-cash-green/60">
              Ask a Tenant Admin to provision a top-up account for this company.
            </p>
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
