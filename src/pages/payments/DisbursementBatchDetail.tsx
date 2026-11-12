import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ThumbsUp, ThumbsDown, Play, RotateCcw, XCircle, BadgeCheck, DownloadCloud, Inbox, RefreshCw,
} from 'lucide-react';
import { apiClient, downloadFile, ApiError } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { mapPayrollRunFields, minorToMajor } from '@/lib/api/transforms';
import { formatMoney, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { errorMessage, errorCode, fieldErrors } from '@/lib/errors';
import { PATHS } from '@/router/paths';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import {
  batchStatusVariant, batchStatusLabel, txStatusVariant, txStatusLabel,
  PROVIDER_LABELS, requiredApprovals, RESTARTABLE_BATCH_STATUSES,
} from './disbursementConstants';
import type {
  BackendDisbursementBatch, BackendDisbursementTransaction, BackendWallet,
  BackendDisbursementSettings, BackendDisbursementProviderConfig, BackendProviderType,
} from '@/lib/api/types';
import type { PayRun } from '@contracts/types/payroll';

const BULK_FILE_FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'nibss', label: 'NIBSS (pipe-delimited)' },
];

/** Statuses the backend lets a batch be cancelled from (BATCH_STATUS_TRANSITIONS). 'queued' is
 * also allowed there but is only momentary before execution picks it up, so it isn't offered. */
const CANCELLABLE_BATCH_STATUSES = ['draft', 'pending_approval', 'approved', 'awaiting_schedule', 'awaiting_confirmation'];

type WalletShortfall = { shortfallMinor: number; currency: string; action: 'initiate' | 'retry' };

/** Pulls the shortfall out of a 422 INSUFFICIENT_WALLET_BALANCE error, else null. */
function walletShortfallFrom(err: unknown, action: WalletShortfall['action']): WalletShortfall | null {
  if (errorCode(err) !== 'INSUFFICIENT_WALLET_BALANCE') return null;
  const fields = fieldErrors(err);
  return { shortfallMinor: Number(fields.shortfallMinor ?? 0), currency: fields.currency ?? 'NGN', action };
}

function formatPeriod(periodStart?: string, periodEnd?: string, period?: string): string {
  if (period) return period;
  if (!periodStart) return '—';
  return new Date(periodStart).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function DisbursementBatchDetail() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  // Backend has one permission (DISBURSEMENT_MANAGE) covering initiate, approve,
  // reject, execute, retry, cancel, confirm, and mark-paid for every holder
  // (tenant_admin/super_admin/finance_manager/payroll_manager) - see PaymentFiles.tsx.
  const canManage = role === 'finance_manager' || role === 'payroll_manager' || role === 'tenant_admin' || role === 'super_admin';

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [confirmReference, setConfirmReference] = useState('');
  const [confirmRemarks, setConfirmRemarks] = useState('');
  const [showRetryOptions, setShowRetryOptions] = useState(false);
  const [retryProvider, setRetryProvider] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [executeOpen, setExecuteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'csv' | 'excel' | 'nibss'>('csv');
  const [downloading, setDownloading] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<BackendDisbursementTransaction | null>(null);
  const [markPaidReference, setMarkPaidReference] = useState('');
  const [markPaidNote, setMarkPaidNote] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [fundViaWallet, setFundViaWallet] = useState(false);
  const [walletShortfall, setWalletShortfall] = useState<WalletShortfall | null>(null);
  const [startNewOpen, setStartNewOpen] = useState(false);

  const { data: run, isLoading: runLoading, isError: runIsError, error: runError } = useQuery<PayRun>({
    queryKey: ['pay-run', runId],
    queryFn: async () => mapPayrollRunFields(await apiClient<any>(ENDPOINTS.PAYROLL.RUNS.DETAIL(runId!)), 'toFrontend'),
    enabled: !!runId,
  });

  const {
    data: batch, isLoading: batchLoading, isError: batchIsError, error: batchError, refetch: refetchBatch,
  } = useQuery<BackendDisbursementBatch | null>({
    queryKey: ['disbursement-batch', runId],
    queryFn: () => apiClient<BackendDisbursementBatch>(ENDPOINTS.DISBURSEMENT.FOR_RUN(runId!)).catch((err) => {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }),
    enabled: !!runId,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'processing' || s === 'queued' || s === 'retrying' ? 3000 : false;
    },
  });

  const { data: settings } = useQuery<BackendDisbursementSettings>({
    queryKey: ['disbursement-settings'],
    queryFn: () => apiClient(ENDPOINTS.DISBURSEMENT.SETTINGS),
  });

  const { data: providers } = useQuery<BackendDisbursementProviderConfig[]>({
    queryKey: ['disbursement-providers'],
    queryFn: () => apiClient(ENDPOINTS.DISBURSEMENT.PROVIDERS),
    enabled: canManage,
  });

  const { data: wallet } = useQuery<BackendWallet>({
    queryKey: ['wallet'],
    queryFn: () => apiClient<BackendWallet>(ENDPOINTS.WALLET.GET),
    enabled: canManage,
  });
  const walletBalanceMinor = wallet ? Number(wallet.balanceMinor) : 0;

  const { data: transactions, isLoading: transactionsLoading } = useQuery<BackendDisbursementTransaction[]>({
    queryKey: ['disbursement-transactions', batch?.id],
    queryFn: () => apiClient<BackendDisbursementTransaction[]>(ENDPOINTS.DISBURSEMENT.TRANSACTIONS(runId!, batch!.id)),
    enabled: !!batch,
    refetchInterval: batch && (batch.status === 'processing' || batch.status === 'retrying') ? 3000 : false,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['disbursement-batch', runId] });
    qc.invalidateQueries({ queryKey: ['disbursement-batches'] });
    qc.invalidateQueries({ queryKey: ['pay-run', runId] });
    qc.invalidateQueries({ queryKey: ['disbursement-transactions'] });
    qc.invalidateQueries({ queryKey: ['wallet'] });
  };

  const initiateMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.DISBURSEMENT.INITIATE(runId!), {
        method: 'POST',
        body: JSON.stringify({
          executionPolicy: settings?.executionPolicy ?? 'manual',
          ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
          ...(fundViaWallet ? { fundViaWallet: true } : {}),
        }),
      }),
    onSuccess: () => {
      toast.success('Disbursement initiated');
      setScheduledAt('');
      setFundViaWallet(false);
      setWalletShortfall(null);
      setStartNewOpen(false);
      invalidate();
    },
    onError: (err) => {
      const shortfall = walletShortfallFrom(err, 'initiate');
      if (shortfall) {
        setWalletShortfall(shortfall);
        toast.error(
          'Insufficient wallet balance',
          `Top up ${formatMoney(shortfall.shortfallMinor / 100, shortfall.currency)} more to fund this batch, or initiate without wallet funding.`,
        );
        return;
      }
      toast.error('Failed to initiate disbursement', errorMessage(err, 'Could not initiate the disbursement.'));
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => apiClient(ENDPOINTS.DISBURSEMENT.APPROVE(runId!, batch!.id), { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => { toast.success('Batch approved'); setApproveOpen(false); invalidate(); },
    onError: (err) => toast.error('Failed to approve batch', errorMessage(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiClient(ENDPOINTS.DISBURSEMENT.REJECT(runId!, batch!.id), { method: 'POST', body: JSON.stringify({ remarks: rejectReason }) }),
    onSuccess: () => { toast.success('Batch rejected'); setShowRejectForm(false); setRejectReason(''); invalidate(); },
    onError: (err) => toast.error('Failed to reject batch', errorMessage(err)),
  });

  const executeMutation = useMutation({
    mutationFn: () => apiClient(ENDPOINTS.DISBURSEMENT.EXECUTE(runId!, batch!.id), { method: 'POST' }),
    onSuccess: () => { toast.success('Execution started'); setExecuteOpen(false); invalidate(); },
    onError: (err) => toast.error('Failed to execute batch', errorMessage(err)),
  });

  // Settlement normally arrives by webhook; this asks the provider directly
  // for transfers still processing (POST .../sync-status).
  const syncStatusMutation = useMutation({
    mutationFn: () =>
      apiClient<{
        checked: number;
        successful: number;
        failed: number;
        reversed: number;
        stillProcessing: number;
        awaitingOtp: number;
      }>(ENDPOINTS.DISBURSEMENT.SYNC_STATUS(runId!, batch!.id), { method: 'POST' }),
    onSuccess: (r) => {
      invalidate();
      const provider = PROVIDER_LABELS[batch!.providerType] ?? 'The payment provider';
      const settled = r.successful + r.failed + r.reversed;
      if (r.awaitingOtp > 0) {
        toast.warning(
          `${provider} is holding ${r.awaitingOtp} transfer(s) for OTP approval`,
          `Approve them in the ${provider} dashboard, or turn off OTP for transfers, then check again.`,
        );
      } else if (settled === 0) {
        toast.info(
          'Still processing',
          `${provider} hasn't finished these transfers yet. Check again in a few minutes.`,
        );
      } else {
        toast.success(
          `Updated ${settled} payment(s)`,
          [
            r.successful && `${r.successful} paid`,
            r.failed && `${r.failed} failed`,
            r.reversed && `${r.reversed} reversed`,
            r.stillProcessing && `${r.stillProcessing} still processing`,
          ]
            .filter(Boolean)
            .join(', '),
        );
      }
    },
    onError: (err) => toast.error("Couldn't check with the payment provider", errorMessage(err)),
  });

  const retryMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.DISBURSEMENT.RETRY(runId!, batch!.id), {
        method: 'POST',
        body: JSON.stringify(retryProvider ? { provider: retryProvider } : {}),
      }),
    onSuccess: () => { toast.success('Retry started'); setShowRetryOptions(false); setRetryProvider(''); setWalletShortfall(null); invalidate(); },
    onError: (err) => {
      const shortfall = walletShortfallFrom(err, 'retry');
      if (shortfall) {
        setWalletShortfall(shortfall);
        toast.error(
          'Insufficient wallet balance',
          `Top up ${formatMoney(shortfall.shortfallMinor / 100, shortfall.currency)} more to retry the failed transactions.`,
        );
        return;
      }
      toast.error('Failed to retry batch', errorMessage(err));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.DISBURSEMENT.CONFIRM(runId!, batch!.id), {
        method: 'POST',
        body: JSON.stringify({ reference: confirmReference, remarks: confirmRemarks || undefined }),
      }),
    onSuccess: () => { toast.success('Payment confirmed'); setShowConfirmForm(false); setConfirmReference(''); setConfirmRemarks(''); invalidate(); },
    onError: (err) => toast.error('Failed to confirm payment', errorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      apiClient(`${ENDPOINTS.DISBURSEMENT.CANCEL(runId!, batch!.id)}?reason=${encodeURIComponent('Cancelled from disbursement detail page')}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Batch cancelled'); setCancelOpen(false); invalidate(); },
    onError: (err) => toast.error('Failed to cancel batch', errorMessage(err)),
  });

  const markPaidMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.DISBURSEMENT.MARK_TRANSACTION_PAID(runId!, batch!.id, markPaidTarget!.id), {
        method: 'PATCH',
        body: JSON.stringify({ transactionReference: markPaidReference || undefined, note: markPaidNote || undefined }),
      }),
    onSuccess: () => {
      // Counts and batch status are recalculated server-side after a mark-paid.
      invalidate();
      toast.success('Transaction marked as paid');
      setMarkPaidTarget(null);
      setMarkPaidReference('');
      setMarkPaidNote('');
    },
    onError: (err) => toast.error('Failed to mark transaction paid', errorMessage(err)),
  });

  const fileExtension: Record<typeof downloadFormat, string> = { csv: 'csv', excel: 'xlsx', nibss: 'txt' };
  const handleDownload = async () => {
    if (!batch) return;
    setDownloading(true);
    try {
      await downloadFile(ENDPOINTS.DISBURSEMENT.BULK_FILE(runId!, batch.id, downloadFormat), `${batch.reference}.${fileExtension[downloadFormat]}`);
      toast.success('File downloaded');
      setDownloadOpen(false);
    } catch (err) {
      toast.error('Failed to download file', errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  if (runLoading || batchLoading) {
    return <div className="flex justify-center py-24"><Spinner /></div>;
  }
  if (runIsError || !run) {
    return <ErrorState error={runError} />;
  }
  if (batchIsError) {
    return <ErrorState error={batchError} onRetry={refetchBatch} />;
  }

  const period = run.period || formatPeriod(run.periodStart, run.periodEnd);
  const approvedCount = batch?.approvalRecords?.filter((r) => r.status === 'approved').length ?? 0;
  const needed = requiredApprovals(settings?.approvalWorkflow);
  const enabledProviders = (providers ?? []).filter((p) => p.enabled && p.providerType !== batch?.providerType);
  const providerOptions = enabledProviders.map((p) => ({ value: p.providerType, label: PROVIDER_LABELS[p.providerType] }));

  // The batch query returns the NEWEST batch; the backend accepts a fresh
  // initiate once it is terminal. A failed batch can also be retried, so the
  // initiate panel is opt-in there.
  const canStartNew = !batch || RESTARTABLE_BATCH_STATUSES.includes(batch.status);
  const showInitiate = !batch || (canStartNew && (batch.status !== 'failed' || startNewOpen));

  // Mirrors RetryEngineService.retryBatch() preconditions.
  const retryableStatus = !!batch && (batch.status === 'failed' || batch.status === 'partially_paid');
  const retryPolicy = settings?.retryPolicy;
  let retryBlockedReason: string | null = null;
  if (batch && retryableStatus && retryPolicy) {
    if (!retryPolicy.enabled) retryBlockedReason = 'Retries are disabled in Disbursement Settings';
    else if (batch.retryCount >= retryPolicy.maxRetries) retryBlockedReason = `Retry limit reached (${retryPolicy.maxRetries})`;
    else if ((batch.failedCount ?? 0) <= 0) retryBlockedReason = 'No failed transactions to retry';
  }
  const canRetry = retryableStatus && !!retryPolicy && !retryBlockedReason;
  // API providers settle transfers asynchronously - offer a manual status
  // check while any are still processing (a bank file has nothing to ask).
  const hasInFlightTransfers =
    !!batch &&
    batch.providerType !== 'manual_bank_file' &&
    (transactions ?? []).some((tx) => tx.status === 'processing');

  const isMarkable = (tx: BackendDisbursementTransaction) =>
    tx.status === 'failed' ||
    tx.status === 'skipped' ||
    (tx.status === 'processing' && batch?.providerType === 'manual_bank_file');

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title={period}
        breadcrumbs={[{ label: 'Payments', path: '/payments' }, { label: period }]}
        action={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {batch ? (
              <>
                <Badge variant={batchStatusVariant[batch.status] ?? 'error'} label={batchStatusLabel[batch.status] ?? `Unknown (${batch.status})`} />
                {batch.fundedByWallet && <Badge variant="info" label="Wallet Funded" />}
              </>
            ) : (
              <Badge variant="draft" label="Not started" />
            )}
          </div>
        }
      />

      {/* Summary */}
      <div className="bg-white rounded-xl border border-mint-light p-5 mb-5">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <div>
            <p className="text-xs text-cash-green/70 mb-0.5">Net Payable</p>
            <MoneyDisplay amount={run.totalNet} currency={run.currency} size="sm" />
          </div>
          {batch && (
            <>
              <div>
                <p className="text-xs text-cash-green/70 mb-0.5">Reference</p>
                <p className="text-sm font-medium text-deep-cash font-mono">{batch.reference}</p>
              </div>
              <div>
                <p className="text-xs text-cash-green/70 mb-0.5">Provider</p>
                <p className="text-sm font-medium text-deep-cash">{PROVIDER_LABELS[batch.providerType] ?? batch.providerType}</p>
              </div>
              <div>
                <p className="text-xs text-cash-green/70 mb-0.5">Execution Policy</p>
                <p className="text-sm font-medium text-deep-cash capitalize">{batch.executionPolicy}</p>
              </div>
              <div>
                <p className="text-xs text-cash-green/70 mb-0.5">Transactions</p>
                <p className="text-sm font-medium text-deep-cash tabular-nums">
                  {batch.successfulCount ?? 0}/{batch.totalCount ?? 0} paid
                  {(batch.failedCount ?? 0) > 0 && <span className="text-red-500"> · {batch.failedCount} failed</span>}
                </p>
              </div>
              {needed > 0 && (
                <div>
                  <p className="text-xs text-cash-green/70 mb-0.5">Approvals</p>
                  <p className="text-sm font-medium text-deep-cash tabular-nums">{approvedCount} of {needed}</p>
                </div>
              )}
              {batch.scheduledAt && (
                <div>
                  <p className="text-xs text-cash-green/70 mb-0.5">Scheduled For</p>
                  <p className="text-sm font-medium text-deep-cash">{formatDate(batch.scheduledAt)}</p>
                </div>
              )}
              {batch.executionStartedAt && (
                <div>
                  <p className="text-xs text-cash-green/70 mb-0.5">Execution Started</p>
                  <p className="text-sm font-medium text-deep-cash">{formatDate(batch.executionStartedAt)}</p>
                </div>
              )}
              {batch.completedAt && (
                <div>
                  <p className="text-xs text-cash-green/70 mb-0.5">Completed</p>
                  <p className="text-sm font-medium text-deep-cash">{formatDate(batch.completedAt)}</p>
                </div>
              )}
              {batch.retryCount > 0 && (
                <div>
                  <p className="text-xs text-cash-green/70 mb-0.5">Retry Attempts</p>
                  <p className="text-sm font-medium text-deep-cash tabular-nums">{batch.retryCount}</p>
                </div>
              )}
            </>
          )}
        </div>
        {batch?.failureReason && (
          <p className="text-sm text-red-500 mt-4 bg-red-50 rounded-lg px-3 py-2">{batch.failureReason}</p>
        )}
        {batch?.manualConfirmationReference && (
          <p className="text-sm text-cash-green/70 mt-4">
            Manually confirmed — ref <span className="font-mono">{batch.manualConfirmationReference}</span>
            {batch.manualConfirmationRemarks && <> — {batch.manualConfirmationRemarks}</>}
            {batch.manualConfirmedAt && <> ({formatDate(batch.manualConfirmedAt)})</>}
          </p>
        )}
      </div>

      {walletShortfall && canManage && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 mb-5 text-sm text-red-600">
          Insufficient wallet balance — top up{' '}
          <span className="font-semibold">{formatMoney(walletShortfall.shortfallMinor / 100, walletShortfall.currency)}</span>{' '}
          more to {walletShortfall.action === 'retry' ? 'retry the failed transactions' : 'fund this batch'}.{' '}
          <Link to={PATHS.PAYMENTS_WALLET} className="font-medium underline">Go to wallet</Link>
        </div>
      )}

      {/* No batch yet, or the newest batch is terminal - initiate here */}
      {showInitiate && (
        <div className="bg-white rounded-xl border border-mint-light p-6 mb-5">
          {canManage ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-cash-green/70">
                {batch
                  ? `The latest disbursement for this pay run was ${(batchStatusLabel[batch.status] ?? batch.status).toLowerCase()}. Starting a new one creates a fresh batch for every payslip.`
                  : 'No disbursement has been started for this pay run yet.'}{' '}
                It will use the configured
                provider ({settings ? PROVIDER_LABELS[settings.defaultProvider] : '…'}) and execution
                policy ({settings?.executionPolicy ?? '…'}) from Disbursement Settings.
              </p>
              {batch && (batch.successfulCount ?? 0) > 0 && (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  {batch.successfulCount} worker(s) were already paid in the previous batch. A new batch
                  pays everyone again — only continue if those payments were reversed.
                </p>
              )}
              {settings?.executionPolicy === 'scheduled' && (
                <Input
                  label="Run at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                  hint="Local date and time. It still goes through approval first; execution starts at this time only once approved."
                />
              )}
              {(() => {
                const providerIsFileBased = settings?.defaultProvider === 'manual_bank_file';
                const walletFundingDisabled = walletBalanceMinor <= 0 || providerIsFileBased;
                return (
                  <label className={`flex items-start gap-2 text-sm ${!walletFundingDisabled ? 'text-deep-cash' : 'text-cash-green/40'}`}>
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={fundViaWallet}
                      disabled={walletFundingDisabled}
                      onChange={(e) => setFundViaWallet(e.target.checked)}
                    />
                    <span>
                      Fund from wallet balance instead of the configured provider
                      {providerIsFileBased ? (
                        <span className="block text-xs mt-0.5 opacity-80">
                          Not available — the configured provider is Manual Bank File, which has no API
                          to pay out through. Switch the default provider in Disbursement Settings to use this.
                        </span>
                      ) : wallet && (
                        <span className="block text-xs mt-0.5 opacity-80">
                          Available: {formatMoney(minorToMajor(wallet.balanceMinor, wallet.currency), wallet.currency)}
                          {walletBalanceMinor <= 0 && ' — top up the wallet to use this'}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })()}
              <div className="flex gap-2">
                {batch?.status === 'failed' && (
                  <Button variant="ghost" onClick={() => setStartNewOpen(false)}>Cancel</Button>
                )}
                <Button
                  variant="primary"
                  loading={initiateMutation.isPending}
                  disabled={settings?.executionPolicy === 'scheduled' && !scheduledAt}
                  onClick={() => initiateMutation.mutate()}
                >
                  <Play size={15} />
                  {batch ? 'Start New Disbursement' : 'Initiate Disbursement'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center py-6">
              <Inbox size={32} className="text-cash-green/30" />
              <p className="text-sm text-cash-green/70">Disbursement hasn't been initiated for this pay run yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {batch && canManage && (
        <div className="bg-white rounded-xl border border-mint-light p-5 mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            {batch.status === 'pending_approval' && (
              <>
                <Button variant="primary" size="sm" onClick={() => setApproveOpen(true)}>
                  <ThumbsUp size={14} /> Approve
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowRejectForm((v) => !v)}>
                  <ThumbsDown size={14} /> Reject
                </Button>
              </>
            )}
            {(batch.status === 'approved' || batch.status === 'awaiting_schedule') && (
              <Button variant="primary" size="sm" onClick={() => setExecuteOpen(true)}>
                <Play size={14} /> Execute
              </Button>
            )}
            {hasInFlightTransfers && (
              <Button
                variant="secondary"
                size="sm"
                loading={syncStatusMutation.isPending}
                onClick={() => syncStatusMutation.mutate()}
              >
                <RefreshCw size={14} /> Check status with {PROVIDER_LABELS[batch.providerType] ?? 'provider'}
              </Button>
            )}
            {canRetry && (
              <Button variant="secondary" size="sm" onClick={() => setShowRetryOptions((v) => !v)}>
                <RotateCcw size={14} /> Retry
              </Button>
            )}
            {retryBlockedReason && (
              <span className="text-xs text-cash-green/60">{retryBlockedReason}</span>
            )}
            {batch.status === 'failed' && !startNewOpen && (
              <Button variant="secondary" size="sm" onClick={() => setStartNewOpen(true)}>
                <Play size={14} /> Start a new disbursement
              </Button>
            )}
            {batch.status === 'awaiting_confirmation' && (
              <Button variant="secondary" size="sm" onClick={() => setShowConfirmForm((v) => !v)}>
                <BadgeCheck size={14} /> Confirm Payment
              </Button>
            )}
            {batch.totalCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setDownloadOpen(true)}>
                <DownloadCloud size={14} /> Download File
              </Button>
            )}
            {CANCELLABLE_BATCH_STATUSES.includes(batch.status) && (
              <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>
                <XCircle size={14} className="text-red-400" /> Cancel Batch
              </Button>
            )}
          </div>

          {showRejectForm && (
            <div className="mt-4 pt-4 border-t border-mint-light flex flex-col gap-3">
              <p className="text-sm text-cash-green/70">Explain why this batch is being rejected.</p>
              <textarea
                className="w-full border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Bank details need review"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowRejectForm(false); setRejectReason(''); }}>Cancel</Button>
                <Button variant="primary" size="sm" loading={rejectMutation.isPending} disabled={!rejectReason.trim()} onClick={() => rejectMutation.mutate()}>
                  Reject Batch
                </Button>
              </div>
            </div>
          )}

          {showConfirmForm && (
            <div className="mt-4 pt-4 border-t border-mint-light flex flex-col gap-3">
              <p className="text-sm text-cash-green/70">
                Confirm this manual bank file batch was actually paid — e.g. once you've checked the bank statement.
              </p>
              <Input label="Bank reference" value={confirmReference} onChange={(e) => setConfirmReference(e.target.value)} placeholder="e.g. TRF-20260710-001" />
              <Input label="Remarks (optional)" value={confirmRemarks} onChange={(e) => setConfirmRemarks(e.target.value)} placeholder="e.g. Confirmed via GTB statement" />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowConfirmForm(false)}>Cancel</Button>
                <Button variant="primary" size="sm" loading={confirmMutation.isPending} disabled={!confirmReference.trim()} onClick={() => confirmMutation.mutate()}>
                  Confirm Payment
                </Button>
              </div>
            </div>
          )}

          {showRetryOptions && canRetry && (
            <div className="mt-4 pt-4 border-t border-mint-light flex flex-col gap-3">
              <p className="text-sm text-cash-green/70">
                Retries every failed transaction in this batch with {PROVIDER_LABELS[batch.providerType]} by default.
                Switch providers below if that one is down or gated — the batch adopts it permanently going forward.
              </p>
              {providerOptions.length > 0 && (
                <Select
                  label="Retry with a different provider (optional)"
                  value={retryProvider}
                  onChange={setRetryProvider}
                  options={[{ value: '', label: `Same provider (${PROVIDER_LABELS[batch.providerType]})` }, ...providerOptions]}
                />
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowRetryOptions(false); setRetryProvider(''); }}>Cancel</Button>
                <Button variant="primary" size="sm" loading={retryMutation.isPending} onClick={() => retryMutation.mutate()}>
                  Retry Failed Transactions
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transactions */}
      {batch && (
        <div className="bg-white rounded-xl border border-mint-light p-5">
          <p className="text-sm font-semibold text-deep-cash mb-3">Transactions</p>
          {transactionsLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !transactions || transactions.length === 0 ? (
            <p className="text-sm text-cash-green/60 py-4">No transactions in this batch yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mint-light">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Worker</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Account</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Amount</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-mint-light/50">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-deep-cash">{tx.workerName}</p>
                        {tx.failureReason && <p className="text-xs text-red-500 mt-0.5">{tx.failureReason}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-cash-green/70">
                        {tx.bankName ?? tx.bankCode}
                        <br />
                        <span className="font-mono">{tx.accountNumber}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <MoneyDisplay amount={minorToMajor(tx.amountMinor)} currency={tx.currency} size="sm" />
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={txStatusVariant[tx.status]} label={txStatusLabel[tx.status]} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {/* Backend assertMarkable(): only failed/skipped, or processing on a
                            manual bank file batch (no provider can still move that money). */}
                        {isMarkable(tx) && canManage && (
                          <Button variant="ghost" size="sm" onClick={() => setMarkPaidTarget(tx)}>
                            Mark Paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={() => approveMutation.mutate()}
        title="Approve Disbursement Batch"
        message="Are you sure you want to approve this disbursement batch? Approved batches become eligible for execution."
        confirmLabel="Approve"
        isLoading={approveMutation.isPending}
      />

      <ConfirmModal
        isOpen={executeOpen}
        onClose={() => setExecuteOpen(false)}
        onConfirm={() => executeMutation.mutate()}
        title="Execute Disbursement Batch"
        message="Are you sure you want to execute this disbursement batch? This will start sending payments and cannot be undone."
        confirmLabel="Execute"
        variant="danger"
        isLoading={executeMutation.isPending}
      />

      <ConfirmModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Cancel Disbursement Batch"
        message="Cancel this disbursement batch? Any pending transactions will be stopped. You can start a fresh disbursement for this pay run afterward."
        confirmLabel="Cancel Batch"
        variant="danger"
        isLoading={cancelMutation.isPending}
      />

      <Modal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} title="Download Bulk Payment File" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">Choose the file format your bank (or NIBSS bulk upload portal) expects.</p>
          <Select label="Format" value={downloadFormat} options={BULK_FILE_FORMAT_OPTIONS} onChange={(v) => setDownloadFormat(v as 'csv' | 'excel' | 'nibss')} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDownloadOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={downloading} onClick={handleDownload}>Download</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!markPaidTarget}
        onClose={() => { setMarkPaidTarget(null); setMarkPaidReference(''); setMarkPaidNote(''); }}
        title="Mark Transaction Paid"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">
            Manually record {markPaidTarget?.workerName}'s payment as complete outside the normal flow.
          </p>
          <Input label="Reference (optional)" value={markPaidReference} onChange={(e) => setMarkPaidReference(e.target.value)} placeholder="e.g. TRF-20260710-001" />
          <Input label="Note (optional)" value={markPaidNote} onChange={(e) => setMarkPaidNote(e.target.value)} placeholder="e.g. Paid via bank transfer" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setMarkPaidTarget(null); setMarkPaidReference(''); setMarkPaidNote(''); }}>Cancel</Button>
            <Button variant="primary" loading={markPaidMutation.isPending} onClick={() => markPaidMutation.mutate()}>Mark Paid</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
