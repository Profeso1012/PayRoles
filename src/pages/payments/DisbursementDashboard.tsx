import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CalendarClock, ShieldAlert, Layers, CheckCircle2, XCircle, Webhook } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { minorToMajor } from '@/lib/api/transforms';
import { formatMoney, formatDate } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import type {
  BackendDisbursementSummary,
  BackendDisbursementBatch,
  BackendWebhookEvent,
  BackendReconciliationRecord,
  BackendProviderHealth,
  BackendBatchStatus,
  BackendProviderType,
} from '@/lib/api/types';

const PROVIDER_LABELS: Record<BackendProviderType, string> = {
  manual_bank_file: 'Manual Bank File',
  monnify: 'Monnify',
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
  remita: 'Remita',
};

const batchStatusVariant: Record<BackendBatchStatus, 'draft' | 'info' | 'warning' | 'success' | 'error'> = {
  draft: 'draft',
  pending_approval: 'warning',
  approved: 'info',
  awaiting_schedule: 'info',
  queued: 'info',
  processing: 'warning',
  partially_paid: 'warning',
  paid: 'success',
  reconciling: 'warning',
  reconciled: 'success',
  completed: 'success',
  cancelled: 'error',
  failed: 'error',
  expired: 'error',
  retrying: 'warning',
  reversed: 'error',
  awaiting_confirmation: 'warning',
};

const batchStatusLabel: Record<BackendBatchStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Awaiting Approval',
  approved: 'Approved',
  awaiting_schedule: 'Scheduled',
  queued: 'Queued',
  processing: 'Processing',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  reconciling: 'Reconciling',
  reconciled: 'Reconciled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
  expired: 'Expired',
  retrying: 'Retrying',
  reversed: 'Reversed',
  awaiting_confirmation: 'Awaiting Confirmation',
};

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="bg-white rounded-xl border border-mint-light px-5 py-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tone ?? 'bg-mint-light'}`}>
        <Icon size={18} className="text-cash-green" />
      </div>
      <div>
        <p className="text-xs text-cash-green/70 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-deep-cash tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function BatchRow({ batch }: { batch: BackendDisbursementBatch }) {
  return (
    <tr className="border-b border-mint-light/50">
      <td className="px-4 py-2.5 font-mono text-xs text-cash-green/70">{batch.reference}</td>
      <td className="px-4 py-2.5">{PROVIDER_LABELS[batch.providerType] ?? batch.providerType}</td>
      <td className="px-4 py-2.5">
        <Badge variant={batchStatusVariant[batch.status]} label={batchStatusLabel[batch.status]} />
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums">
        <MoneyDisplay amount={minorToMajor(batch.totalAmountMinor)} currency={batch.currency} size="sm" />
      </td>
      <td className="px-4 py-2.5 text-right text-xs tabular-nums text-cash-green/70">
        {batch.successfulCount}/{batch.totalCount}
        {batch.failedCount > 0 && <span className="text-red-500"> · {batch.failedCount} failed</span>}
      </td>
      <td className="px-4 py-2.5 text-xs text-cash-green/60 whitespace-nowrap">{formatDate(batch.createdAt)}</td>
    </tr>
  );
}

export default function DisbursementDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('batches');

  const { data: summary, isLoading: summaryLoading } = useQuery<BackendDisbursementSummary>({
    queryKey: ['disbursement-dashboard-summary'],
    queryFn: () => apiClient<BackendDisbursementSummary>(ENDPOINTS.DISBURSEMENT.DASHBOARD.SUMMARY),
  });

  const { data: recentBatches, isLoading: batchesLoading } = useQuery<BackendDisbursementBatch[]>({
    queryKey: ['disbursement-dashboard-batches'],
    queryFn: () => apiClient<BackendDisbursementBatch[]>(ENDPOINTS.DISBURSEMENT.DASHBOARD.BATCHES(20)),
    enabled: tab === 'batches',
  });

  const { data: pendingApproval, isLoading: pendingLoading } = useQuery<BackendDisbursementBatch[]>({
    queryKey: ['disbursement-dashboard-pending'],
    queryFn: () => apiClient<BackendDisbursementBatch[]>(ENDPOINTS.DISBURSEMENT.DASHBOARD.PENDING_APPROVAL),
    enabled: tab === 'pending',
  });

  const { data: retryQueue, isLoading: retryLoading } = useQuery<BackendDisbursementBatch[]>({
    queryKey: ['disbursement-dashboard-retry'],
    queryFn: () => apiClient<BackendDisbursementBatch[]>(ENDPOINTS.DISBURSEMENT.DASHBOARD.RETRY_QUEUE),
    enabled: tab === 'retry',
  });

  const { data: providerHealth, isLoading: healthLoading } = useQuery<BackendProviderHealth[]>({
    queryKey: ['disbursement-dashboard-health'],
    queryFn: () => apiClient<BackendProviderHealth[]>(ENDPOINTS.DISBURSEMENT.DASHBOARD.PROVIDER_HEALTH),
    enabled: tab === 'health',
  });

  const { data: webhooks, isLoading: webhooksLoading } = useQuery<BackendWebhookEvent[]>({
    queryKey: ['disbursement-dashboard-webhooks'],
    queryFn: () => apiClient<BackendWebhookEvent[]>(ENDPOINTS.DISBURSEMENT.DASHBOARD.WEBHOOKS(30)),
    enabled: tab === 'webhooks',
  });

  const { data: reconciliation, isLoading: reconLoading } = useQuery<BackendReconciliationRecord[]>({
    queryKey: ['disbursement-dashboard-reconciliation'],
    queryFn: () => apiClient<BackendReconciliationRecord[]>(ENDPOINTS.DISBURSEMENT.DASHBOARD.RECONCILIATION),
    enabled: tab === 'reconciliation',
  });

  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <button
        onClick={() => navigate('/payments')}
        className="flex items-center gap-2 text-sm text-cash-green hover:text-deep-cash transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        Back to Payments
      </button>
      <PageHeader title="Disbursement Overview" />

      {summaryLoading || !summary ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          <StatCard icon={Clock} label="Awaiting Approval" value={pendingApproval?.length ?? summary.totalBatches - summary.completedBatches - summary.failedBatches} />
          <StatCard icon={CalendarClock} label="Scheduled" value={summary.scheduled} />
          <StatCard icon={ShieldAlert} label="Awaiting Confirmation" value={summary.awaitingConfirmation} tone="bg-mint-light" />
          <StatCard icon={Layers} label="Total Batches" value={summary.totalBatches} />
          <StatCard icon={CheckCircle2} label="Completed" value={summary.completedBatches} tone="bg-mint-light" />
          <StatCard icon={XCircle} label="Failed" value={summary.failedBatches} tone="bg-red-100" />
        </div>
      )}

      {summary && (
        <div className="bg-white rounded-xl border border-mint-light px-5 py-4 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-cash-green/70 mb-0.5">Paid out today</p>
            <MoneyDisplay amount={minorToMajor(summary.today.amountMinor)} currency="NGN" size="md" />
          </div>
          <p className="text-sm text-cash-green/70">{summary.today.successfulTransactions} successful transactions today</p>
        </div>
      )}

      <Tabs
        tabs={[
          { id: 'batches', label: 'Recent Batches' },
          { id: 'pending', label: 'Awaiting Approval', count: pendingApproval?.length },
          { id: 'retry', label: 'Retry Queue', count: retryQueue?.length },
          { id: 'health', label: 'Provider Health' },
          { id: 'webhooks', label: 'Webhooks' },
          { id: 'reconciliation', label: 'Reconciliation' },
        ]}
        activeTab={tab}
        onChange={setTab}
        className="mb-4"
      />

      <div className="bg-white rounded-xl border border-mint-light overflow-hidden">
        {tab === 'batches' && (
          batchesLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !recentBatches || recentBatches.length === 0 ? (
            <p className="text-sm text-cash-green/60 px-5 py-6">No batches yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mint-light bg-soft-white">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Reference</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Provider</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Amount</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Transactions</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBatches.map((batch) => <BatchRow key={batch.id} batch={batch} />)}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'pending' && (
          pendingLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !pendingApproval || pendingApproval.length === 0 ? (
            <p className="text-sm text-cash-green/60 px-5 py-6">Nothing waiting on approval.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mint-light bg-soft-white">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Reference</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Provider</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Amount</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Transactions</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApproval.map((batch) => <BatchRow key={batch.id} batch={batch} />)}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'retry' && (
          retryLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !retryQueue || retryQueue.length === 0 ? (
            <p className="text-sm text-cash-green/60 px-5 py-6">No batches need a retry right now.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mint-light bg-soft-white">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Reference</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Provider</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Amount</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Transactions</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {retryQueue.map((batch) => <BatchRow key={batch.id} batch={batch} />)}
                </tbody>
              </table>
              <p className="text-xs text-cash-green/50 px-4 py-3">
                Retry each of these from the Payments page — this is a queue view, not an action.
              </p>
            </div>
          )
        )}

        {tab === 'health' && (
          healthLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !providerHealth || providerHealth.length === 0 ? (
            <p className="text-sm text-cash-green/60 px-5 py-6">No provider activity in the last 30 days.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mint-light bg-soft-white">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Provider</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Batches (30d)</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Successful</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Failed</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Total Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {providerHealth.map((p) => {
                    const successful = Number(p.successfulTransactions ?? 0);
                    const failed = Number(p.failedTransactions ?? 0);
                    return (
                      <tr key={p.provider} className="border-b border-mint-light/50">
                        <td className="px-4 py-2.5 font-medium text-deep-cash">{PROVIDER_LABELS[p.provider] ?? p.provider}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{p.totalBatches}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-fresh-cash">{successful}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-red-500">{failed}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatMoney(Number(p.totalAmountMinor ?? 0) / 100, 'NGN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'webhooks' && (
          webhooksLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !webhooks || webhooks.length === 0 ? (
            <p className="text-sm text-cash-green/60 px-5 py-6">No webhook events received yet.</p>
          ) : (
            <div className="divide-y divide-mint-light">
              {webhooks.map((wh) => (
                <div key={wh.id} className="flex items-center justify-between gap-3 px-5 py-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Webhook size={15} className="text-cash-green/50 shrink-0" />
                    <div>
                      <p className="text-sm text-deep-cash">
                        {PROVIDER_LABELS[wh.providerType] ?? wh.providerType}
                        {wh.eventType && <span className="text-cash-green/60"> · {wh.eventType}</span>}
                      </p>
                      {wh.errorMessage && <p className="text-xs text-red-500 mt-0.5">{wh.errorMessage}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={wh.processed ? 'success' : 'warning'} label={wh.processed ? 'Processed' : 'Pending'} />
                    <span className="text-xs text-cash-green/50 whitespace-nowrap">{formatDate(wh.receivedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'reconciliation' && (
          reconLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !reconciliation || reconciliation.length === 0 ? (
            <p className="text-sm text-cash-green/60 px-5 py-6">No reconciliation records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mint-light bg-soft-white">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Provider</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Matched</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Unmatched</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Variance</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Reconciled</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliation.map((r) => (
                    <tr key={r.id} className="border-b border-mint-light/50">
                      <td className="px-4 py-2.5">{PROVIDER_LABELS[r.providerType] ?? r.providerType}</td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={r.status === 'matched' ? 'success' : r.status === 'partially_matched' ? 'warning' : 'error'}
                          label={r.status.replace(/_/g, ' ')}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.matchedCount}/{r.totalTransactions}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-red-500">{r.unmatchedCount}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {r.varianceMinor !== 0 ? formatMoney(r.varianceMinor / 100, 'NGN') : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-cash-green/60 whitespace-nowrap">{formatDate(r.reconciledAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
