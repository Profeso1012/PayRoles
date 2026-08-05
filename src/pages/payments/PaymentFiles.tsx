import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DownloadCloud, Inbox, FileText, CheckCircle2, Clock, ThumbsUp, ThumbsDown, Play, RotateCcw, XCircle, ListChecks, BadgeCheck, Settings2, LayoutDashboard, FileBarChart } from 'lucide-react';
import { apiClient, apiClientWithMeta, downloadFile } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { mapPayrollRunFields, minorToMajor } from '@/lib/api/transforms';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Spinner from '@/components/ui/Spinner';
import type { BackendDisbursementBatch, BackendBatchStatus, BackendDisbursementTransaction, BackendTransactionStatus } from '@/lib/api/types';
import type { PayRun } from '@contracts/types/payroll';

// Batch statuses where money has already moved or the batch is otherwise
// resolved - these no longer count toward "still pending disbursement".
// completed/reconciled/expired/reversed never actually occur in the current
// backend (dead states - see disbursement audit), but are excluded anyway so
// the stat card stays correct if that ever changes.
const RESOLVED_BATCH_STATUSES: BackendBatchStatus[] = [
  'paid', 'completed', 'reconciled', 'cancelled', 'expired', 'reversed',
];

const BULK_FILE_FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'nibss', label: 'NIBSS (pipe-delimited)' },
];

const txStatusVariant: Record<BackendTransactionStatus, 'draft' | 'info' | 'warning' | 'success' | 'error'> = {
  pending: 'draft',
  scheduled: 'info',
  queued: 'info',
  processing: 'warning',
  successful: 'success',
  failed: 'error',
  retried: 'warning',
  cancelled: 'error',
  reversed: 'error',
  manual: 'success',
  skipped: 'info',
};

const txStatusLabel: Record<BackendTransactionStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  queued: 'Queued',
  processing: 'Processing',
  successful: 'Successful',
  failed: 'Failed',
  retried: 'Retried',
  cancelled: 'Cancelled',
  reversed: 'Reversed',
  manual: 'Manually Confirmed',
  skipped: 'Skipped',
};

// Helper to format period from start/end dates or single period string
function formatPeriod(periodStart?: string, periodEnd?: string, period?: string): string {
  if (period) return period;
  if (!periodStart) return '—';
  const start = new Date(periodStart);
  return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// A payroll run paired with its disbursement batch (if one has been initiated).
// Runs only become disbursement-eligible once approved by Finance.
interface DisbursementRow {
  run: PayRun;
  batch: BackendDisbursementBatch | null;
}

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

export default function PaymentFiles() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  // Backend has one permission (DISBURSEMENT_MANAGE) covering initiate,
  // approve, reject, execute, retry, cancel, confirm, and mark-paid - there
  // is no separate "approve" permission, so every DISBURSEMENT_MANAGE holder
  // (tenant_admin/super_admin/finance_manager/payroll_manager) can do all of
  // it. DISBURSEMENT_CONFIGURE (provider/settings) is narrower - see canConfigure.
  const canManage = role === 'finance_manager' || role === 'payroll_manager' || role === 'tenant_admin' || role === 'super_admin';
  const canConfigure = role === 'tenant_admin' || role === 'super_admin';

  const [rejectTarget, setRejectTarget] = useState<DisbursementRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<DisbursementRow | null>(null);
  const [transactionsTarget, setTransactionsTarget] = useState<DisbursementRow | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<BackendDisbursementTransaction | null>(null);
  const [markPaidReference, setMarkPaidReference] = useState('');
  const [markPaidNote, setMarkPaidNote] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<DisbursementRow | null>(null);
  const [confirmReference, setConfirmReference] = useState('');
  const [confirmRemarks, setConfirmRemarks] = useState('');
  const [approveTarget, setApproveTarget] = useState<DisbursementRow | null>(null);
  const [executeTarget, setExecuteTarget] = useState<DisbursementRow | null>(null);
  const [downloadTarget, setDownloadTarget] = useState<DisbursementRow | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'csv' | 'excel' | 'nibss'>('csv');
  const [downloading, setDownloading] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<string | null>(null); // payrollRunId
  const [scheduledAt, setScheduledAt] = useState('');

  // Shares the ['disbursement-settings'] cache key with DisbursementSettings.tsx -
  // Initiate needs to know the tenant's configured executionPolicy instead of
  // always hardcoding 'manual' regardless of what's configured.
  const { data: settings } = useQuery<{ executionPolicy: 'manual' | 'scheduled' | 'immediate' }>({
    queryKey: ['disbursement-settings'],
    queryFn: () => apiClient(ENDPOINTS.DISBURSEMENT.SETTINGS),
  });

  const { data: rows = [], isLoading, isError, refetch } = useQuery<DisbursementRow[]>({
    queryKey: ['disbursement-batches'],
    queryFn: async () => {
      const params = buildPaginationParams({ page: 1, limit: 50, sortBy: 'createdAt', sortDir: 'desc' });
      const { data: runs } = await apiClientWithMeta<any[]>(`${ENDPOINTS.PAYROLL.RUNS.LIST}?${params}`);

      // Only approved-or-later runs can have a disbursement batch.
      const eligible = runs
        .map((r) => mapPayrollRunFields(r, 'toFrontend') as PayRun)
        .filter((r) => ['approved', 'processing', 'paid'].includes(r.status));

      return Promise.all(
        eligible.map(async (run): Promise<DisbursementRow> => {
          try {
            const batch = await apiClient<BackendDisbursementBatch>(
              ENDPOINTS.DISBURSEMENT.FOR_RUN(run.id),
            );
            return { run, batch };
          } catch {
            return { run, batch: null }; // No batch initiated yet
          }
        }),
      );
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['disbursement-batches'] });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<BackendDisbursementTransaction[]>({
    queryKey: ['disbursement-transactions', transactionsTarget?.batch?.id],
    queryFn: () =>
      apiClient<BackendDisbursementTransaction[]>(
        ENDPOINTS.DISBURSEMENT.TRANSACTIONS(transactionsTarget!.run.id, transactionsTarget!.batch!.id),
      ),
    enabled: !!transactionsTarget?.batch,
  });

  const markPaidMutation = useMutation({
    mutationFn: () =>
      apiClient(
        ENDPOINTS.DISBURSEMENT.MARK_TRANSACTION_PAID(
          transactionsTarget!.run.id,
          transactionsTarget!.batch!.id,
          markPaidTarget!.id,
        ),
        {
          method: 'PATCH',
          body: JSON.stringify({
            transactionReference: markPaidReference || undefined,
            note: markPaidNote || undefined,
          }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disbursement-transactions', transactionsTarget?.batch?.id] });
      invalidate();
      toast.success('Transaction marked as paid');
      setMarkPaidTarget(null);
      setMarkPaidReference('');
      setMarkPaidNote('');
    },
    onError: (err) => toast.error('Failed to mark transaction paid', err instanceof Error ? err.message : undefined),
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.DISBURSEMENT.CONFIRM(confirmTarget!.run.id, confirmTarget!.batch!.id), {
        method: 'POST',
        body: JSON.stringify({
          reference: confirmReference,
          remarks: confirmRemarks || undefined,
        }),
      }),
    onSuccess: () => {
      invalidate();
      toast.success('Payment confirmed');
      setConfirmTarget(null);
      setConfirmReference('');
      setConfirmRemarks('');
    },
    onError: (err) => toast.error('Failed to confirm payment', err instanceof Error ? err.message : undefined),
  });

  const initiateMutation = useMutation({
    mutationFn: ({ runId, scheduledAt: at }: { runId: string; scheduledAt?: string }) =>
      apiClient(ENDPOINTS.DISBURSEMENT.INITIATE(runId), {
        method: 'POST',
        body: JSON.stringify({
          executionPolicy: settings?.executionPolicy ?? 'manual',
          ...(at ? { scheduledAt: new Date(at).toISOString() } : {}),
        }),
      }),
    onSuccess: () => {
      toast.success('Disbursement initiated');
      setScheduleTarget(null);
      setScheduledAt('');
      invalidate();
    },
    onError: (err) => toast.error('Failed to initiate disbursement', err instanceof Error ? err.message : undefined),
  });

  // Manual/immediate need no extra input - a single click initiates. Scheduled
  // needs a time the backend has nowhere else to get, so it opens a small
  // modal to collect one instead of silently omitting it.
  function handleInitiateClick(runId: string) {
    if (settings?.executionPolicy === 'scheduled') {
      setScheduleTarget(runId);
    } else {
      initiateMutation.mutate({ runId });
    }
  }

  const approveMutation = useMutation({
    mutationFn: (row: DisbursementRow) =>
      apiClient(ENDPOINTS.DISBURSEMENT.APPROVE(row.run.id, row.batch!.id), {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      toast.success('Batch approved');
      setApproveTarget(null);
      invalidate();
    },
    onError: (err) => toast.error('Failed to approve batch', err instanceof Error ? err.message : undefined),
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.DISBURSEMENT.REJECT(rejectTarget!.run.id, rejectTarget!.batch!.id), {
        method: 'POST',
        body: JSON.stringify({ remarks: rejectReason }),
      }),
    onSuccess: () => {
      toast.success('Batch rejected');
      setRejectTarget(null);
      setRejectReason('');
      invalidate();
    },
    onError: (err) => toast.error('Failed to reject batch', err instanceof Error ? err.message : undefined),
  });

  const executeMutation = useMutation({
    mutationFn: (row: DisbursementRow) =>
      apiClient(ENDPOINTS.DISBURSEMENT.EXECUTE(row.run.id, row.batch!.id), { method: 'POST' }),
    onSuccess: () => {
      toast.success('Execution started');
      setExecuteTarget(null);
      invalidate();
    },
    onError: (err) => toast.error('Failed to execute batch', err instanceof Error ? err.message : undefined),
  });

  const retryMutation = useMutation({
    mutationFn: (row: DisbursementRow) =>
      apiClient(ENDPOINTS.DISBURSEMENT.RETRY(row.run.id, row.batch!.id), { method: 'POST' }),
    onSuccess: () => {
      toast.success('Retry started');
      invalidate();
    },
    onError: (err) => toast.error('Failed to retry batch', err instanceof Error ? err.message : undefined),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      apiClient(
        `${ENDPOINTS.DISBURSEMENT.CANCEL(cancelTarget!.run.id, cancelTarget!.batch!.id)}?reason=${encodeURIComponent('Cancelled from Payments page')}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      toast.success('Batch cancelled');
      setCancelTarget(null);
      invalidate();
    },
    onError: (err) => toast.error('Failed to cancel batch', err instanceof Error ? err.message : undefined),
  });

  const fileExtension: Record<typeof downloadFormat, string> = { csv: 'csv', excel: 'xlsx', nibss: 'txt' };

  const handleDownload = async () => {
    if (!downloadTarget?.batch) return;
    setDownloading(true);
    try {
      await downloadFile(
        ENDPOINTS.DISBURSEMENT.BULK_FILE(downloadTarget.run.id, downloadTarget.batch.id, downloadFormat),
        `${downloadTarget.batch.reference}.${fileExtension[downloadFormat]}`,
      );
      toast.success('File downloaded');
      setDownloadTarget(null);
    } catch (err) {
      toast.error('Failed to download file', err instanceof Error ? err.message : undefined);
    } finally {
      setDownloading(false);
    }
  };

  const readyToInitiateCount = rows.filter((r) => !r.batch).length;
  const totalNetPending = rows
    .filter((r) => r.batch && !RESOLVED_BATCH_STATUSES.includes(r.batch.status))
    .reduce((sum, r) => sum + r.run.totalNet, 0);

  const columns = [
    {
      key: 'period',
      header: 'Period',
      render: (row: DisbursementRow) => (
        <div>
          <p className="font-medium text-deep-cash">{row.run.period || formatPeriod(row.run.periodStart, row.run.periodEnd)}</p>
          <p className="text-xs text-cash-green/60">{row.run.payGroupName || row.run.name}</p>
        </div>
      ),
    },
    {
      key: 'totalNet',
      header: 'Net Payable',
      render: (row: DisbursementRow) => (
        <MoneyDisplay amount={row.run.totalNet} currency={row.run.currency} size="sm" />
      ),
    },
    {
      key: 'batchStatus',
      header: 'Disbursement Status',
      // Falls back instead of rendering nothing if the batch's status is
      // somehow outside the 17 known values - a silently-blank cell here
      // previously made it look like the row had no batch/actions at all,
      // since every action button below also does exact status matching.
      render: (row: DisbursementRow) =>
        row.batch ? (
          <Badge
            variant={batchStatusVariant[row.batch.status] ?? 'error'}
            label={batchStatusLabel[row.batch.status] ?? `Unknown (${row.batch.status})`}
          />
        ) : (
          <Badge variant="draft" label="Not started" />
        ),
    },
    {
      key: 'progress',
      header: 'Transactions',
      render: (row: DisbursementRow) =>
        row.batch ? (
          <span className="text-xs tabular-nums text-cash-green/80">
            {row.batch.successfulCount ?? 0}/{row.batch.totalCount ?? 0} paid
            {(row.batch.failedCount ?? 0) > 0 && <span className="text-red-500"> · {row.batch.failedCount} failed</span>}
          </span>
        ) : (
          <span className="text-cash-green/40 text-xs">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: DisbursementRow) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {!row.batch && canManage && (
            <Button variant="secondary" size="sm" loading={initiateMutation.isPending} onClick={() => handleInitiateClick(row.run.id)}>
              <Play size={13} />
              Initiate
            </Button>
          )}
          {row.batch?.status === 'pending_approval' && canManage && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setApproveTarget(row)}>
                <ThumbsUp size={13} />
                Approve
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRejectTarget(row)}>
                <ThumbsDown size={13} />
              </Button>
            </>
          )}
          {(row.batch?.status === 'approved' || row.batch?.status === 'awaiting_schedule') && canManage && (
            <Button variant="secondary" size="sm" onClick={() => setExecuteTarget(row)}>
              <Play size={13} />
              Execute
            </Button>
          )}
          {(row.batch?.status === 'failed' || row.batch?.status === 'partially_paid') && canManage && (
            <Button variant="secondary" size="sm" loading={retryMutation.isPending} onClick={() => retryMutation.mutate(row)}>
              <RotateCcw size={13} />
              Retry
            </Button>
          )}
          {row.batch?.status === 'awaiting_confirmation' && canManage && (
            <Button variant="secondary" size="sm" onClick={() => setConfirmTarget(row)}>
              <BadgeCheck size={13} />
              Confirm
            </Button>
          )}
          {row.batch && row.batch.totalCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setTransactionsTarget(row)}>
              <ListChecks size={13} />
            </Button>
          )}
          {row.batch && row.batch.totalCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setDownloadTarget(row); setDownloadFormat('csv'); }}>
              <DownloadCloud size={13} />
            </Button>
          )}
          {row.batch &&
            canManage &&
            (['draft', 'pending_approval', 'approved', 'awaiting_schedule'].includes(row.batch.status) ||
              // A batch whose status doesn't match anything we recognize would
              // otherwise show zero actions at all - offer Cancel as a
              // best-effort recovery path. The backend still has the final
              // say on whether this status is actually cancellable; if not,
              // the real error message surfaces via the existing toast.
              !(row.batch.status in batchStatusVariant)) && (
              <Button variant="ghost" size="sm" onClick={() => setCancelTarget(row)}>
                <XCircle size={13} className="text-red-400" />
              </Button>
            )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title="Payments"
        action={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <p className="text-sm text-cash-green/70">
              Initiate and track salary disbursement for approved pay runs
            </p>
            <div className="flex items-center gap-1">
              {canManage && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/payments/overview')}>
                  <LayoutDashboard size={14} />
                  <span className="hidden sm:inline">Overview</span>
                </Button>
              )}
              {canManage && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/payments/reports')}>
                  <FileBarChart size={14} />
                  <span className="hidden sm:inline">Reports</span>
                </Button>
              )}
              {canConfigure && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/payments/settings')}>
                  <Settings2 size={14} />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              )}
            </div>
          </div>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="bg-white rounded-xl border border-mint-light px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-mint-light flex items-center justify-center shrink-0">
            <FileText size={18} className="text-cash-green" />
          </div>
          <div>
            <p className="text-xs text-cash-green/70 mb-0.5">Approved Runs</p>
            <p className="text-2xl font-bold text-deep-cash tabular-nums">{rows.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-mint-light px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Clock size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-cash-green/70 mb-0.5">Not Yet Initiated</p>
            <p className="text-2xl font-bold text-deep-cash tabular-nums">{readyToInitiateCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-mint-light px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-mint-light flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-fresh-cash" />
          </div>
          <div>
            <p className="text-xs text-cash-green/70 mb-0.5">Pending Disbursement</p>
            <MoneyDisplay amount={totalNetPending} currency="NGN" size="sm" className="text-deep-cash" />
          </div>
        </div>
      </div>

      {!isLoading && !isError && rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-mint-light p-16 flex flex-col items-center gap-3 text-center">
          <Inbox size={40} className="text-cash-green/30" />
          <p className="text-sm font-medium text-deep-cash">No approved pay runs yet</p>
          <p className="text-xs text-cash-green/60">Disbursement becomes available once Finance approves a pay run.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          isError={isError}
          rowKey={(row) => row.run.id}
          emptyMessage="No approved pay runs found"
        />
      )}

      <Modal
        isOpen={!!scheduleTarget}
        onClose={() => { setScheduleTarget(null); setScheduledAt(''); }}
        title="Schedule Disbursement"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">
            Your tenant's execution policy is set to Scheduled — pick when this batch should run.
            It still goes through approval first; execution starts at this time only once approved.
          </p>
          <Input
            label="Run at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
            hint="Local date and time"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setScheduleTarget(null); setScheduledAt(''); }}>Cancel</Button>
            <Button
              variant="primary"
              loading={initiateMutation.isPending}
              disabled={!scheduledAt}
              onClick={() => scheduleTarget && initiateMutation.mutate({ runId: scheduleTarget, scheduledAt })}
            >
              Schedule
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={() => approveTarget && approveMutation.mutate(approveTarget)}
        title="Approve Disbursement Batch"
        message={`Are you sure you want to approve this disbursement batch for pay run "${approveTarget ? approveTarget.run.period || formatPeriod(approveTarget.run.periodStart, approveTarget.run.periodEnd) : ''}"? Approved batches become eligible for execution.`}
        confirmLabel="Approve"
        isLoading={approveMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!executeTarget}
        onClose={() => setExecuteTarget(null)}
        onConfirm={() => executeTarget && executeMutation.mutate(executeTarget)}
        title="Execute Disbursement Batch"
        message={`Are you sure you want to execute this disbursement batch for pay run "${executeTarget ? executeTarget.run.period || formatPeriod(executeTarget.run.periodStart, executeTarget.run.periodEnd) : ''}"? This will start sending payments and cannot be undone.`}
        confirmLabel="Execute"
        variant="danger"
        isLoading={executeMutation.isPending}
      />

      <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Disbursement Batch" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">Explain why this batch is being rejected.</p>
          <textarea
            className="w-full border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Bank details need review"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              variant="primary"
              loading={rejectMutation.isPending}
              disabled={!rejectReason.trim()}
              onClick={() => rejectMutation.mutate()}
            >
              Reject Batch
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelMutation.mutate()}
        title="Cancel Disbursement Batch"
        message="Cancel this disbursement batch? Any pending transactions will be stopped."
        confirmLabel="Cancel Batch"
        variant="danger"
        isLoading={cancelMutation.isPending}
      />

      <Modal
        isOpen={!!downloadTarget}
        onClose={() => setDownloadTarget(null)}
        title="Download Bulk Payment File"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">
            Choose the file format your bank (or NIBSS bulk upload portal) expects.
          </p>
          <Select
            label="Format"
            value={downloadFormat}
            options={BULK_FILE_FORMAT_OPTIONS}
            onChange={(v) => setDownloadFormat(v as 'csv' | 'excel' | 'nibss')}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDownloadTarget(null)}>Cancel</Button>
            <Button variant="primary" loading={downloading} onClick={handleDownload}>
              Download
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!transactionsTarget}
        onClose={() => setTransactionsTarget(null)}
        title="Batch Transactions"
      >
        <div className="flex flex-col gap-3">
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
                        {(tx.status === 'failed' || tx.status === 'pending') && canManage && (
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
          <Input
            label="Reference (optional)"
            value={markPaidReference}
            onChange={(e) => setMarkPaidReference(e.target.value)}
            placeholder="e.g. TRF-20260710-001"
          />
          <Input
            label="Note (optional)"
            value={markPaidNote}
            onChange={(e) => setMarkPaidNote(e.target.value)}
            placeholder="e.g. Paid via bank transfer"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setMarkPaidTarget(null); setMarkPaidReference(''); setMarkPaidNote(''); }}>
              Cancel
            </Button>
            <Button variant="primary" loading={markPaidMutation.isPending} onClick={() => markPaidMutation.mutate()}>
              Mark Paid
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!confirmTarget}
        onClose={() => { setConfirmTarget(null); setConfirmReference(''); setConfirmRemarks(''); }}
        title="Confirm Payment"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">
            Confirm this manual bank file batch was actually paid — e.g. once you've checked the bank
            statement. This moves the batch to completed.
          </p>
          <Input
            label="Bank reference"
            value={confirmReference}
            onChange={(e) => setConfirmReference(e.target.value)}
            placeholder="e.g. TRF-20260710-001"
          />
          <Input
            label="Remarks (optional)"
            value={confirmRemarks}
            onChange={(e) => setConfirmRemarks(e.target.value)}
            placeholder="e.g. Confirmed via GTB statement"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setConfirmTarget(null); setConfirmReference(''); setConfirmRemarks(''); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={confirmMutation.isPending}
              disabled={!confirmReference.trim()}
              onClick={() => confirmMutation.mutate()}
            >
              Confirm Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
