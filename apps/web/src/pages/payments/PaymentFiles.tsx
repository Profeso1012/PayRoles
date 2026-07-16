import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DownloadCloud, Inbox, FileText, CheckCircle2, Clock, ThumbsUp, ThumbsDown, Play, RotateCcw, XCircle } from 'lucide-react';
import { apiClient, apiClientWithMeta, BASE_URL } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { mapPayrollRunFields, minorToMajor } from '@/lib/api/transforms';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { BackendDisbursementBatch, BackendBatchStatus } from '@/lib/api/types';
import type { PayRun } from '@contracts/types/payroll';

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

/** Authenticated blob download - apiClient always parses JSON, this streams raw bytes instead. */
async function downloadFile(path: string, fallbackFilename: string) {
  const { accessToken } = useAuthStore.getState();
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  if (!response.ok) throw new Error('Download failed');
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] || fallbackFilename;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function PaymentFiles() {
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canApprove = role === 'finance_manager' || role === 'tenant_admin' || role === 'super_admin';
  const canManage = canApprove || role === 'payroll_manager' || role === 'payroll_officer';

  const [rejectTarget, setRejectTarget] = useState<DisbursementRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<DisbursementRow | null>(null);

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

  const initiateMutation = useMutation({
    mutationFn: (runId: string) =>
      apiClient(ENDPOINTS.DISBURSEMENT.INITIATE(runId), {
        method: 'POST',
        body: JSON.stringify({ executionPolicy: 'manual' }),
      }),
    onSuccess: () => {
      toast.success('Disbursement initiated');
      invalidate();
    },
    onError: () => toast.error('Failed to initiate disbursement'),
  });

  const approveMutation = useMutation({
    mutationFn: (row: DisbursementRow) =>
      apiClient(ENDPOINTS.DISBURSEMENT.APPROVE(row.run.id, row.batch!.id), {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      toast.success('Batch approved');
      invalidate();
    },
    onError: () => toast.error('Failed to approve batch'),
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
    onError: () => toast.error('Failed to reject batch'),
  });

  const executeMutation = useMutation({
    mutationFn: (row: DisbursementRow) =>
      apiClient(ENDPOINTS.DISBURSEMENT.EXECUTE(row.run.id, row.batch!.id), { method: 'POST' }),
    onSuccess: () => {
      toast.success('Execution started');
      invalidate();
    },
    onError: () => toast.error('Failed to execute batch'),
  });

  const retryMutation = useMutation({
    mutationFn: (row: DisbursementRow) =>
      apiClient(ENDPOINTS.DISBURSEMENT.RETRY(row.run.id, row.batch!.id), { method: 'POST' }),
    onSuccess: () => {
      toast.success('Retry started');
      invalidate();
    },
    onError: () => toast.error('Failed to retry batch'),
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
    onError: () => toast.error('Failed to cancel batch'),
  });

  const handleDownload = async (row: DisbursementRow) => {
    if (!row.batch) return;
    try {
      await downloadFile(
        ENDPOINTS.DISBURSEMENT.BULK_FILE(row.run.id, row.batch.id, 'csv'),
        `${row.batch.reference}.csv`,
      );
      toast.success('File downloaded');
    } catch {
      toast.error('Failed to download file');
    }
  };

  const readyToInitiateCount = rows.filter((r) => !r.batch).length;
  const totalNetPending = rows
    .filter((r) => r.batch && !['completed', 'reconciled', 'cancelled'].includes(r.batch.status))
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
      render: (row: DisbursementRow) =>
        row.batch ? (
          <Badge variant={batchStatusVariant[row.batch.status]} label={batchStatusLabel[row.batch.status]} />
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
            {row.batch.successfulCount}/{row.batch.totalCount} paid
            {row.batch.failedCount > 0 && <span className="text-red-500"> · {row.batch.failedCount} failed</span>}
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
            <Button variant="secondary" size="sm" loading={initiateMutation.isPending} onClick={() => initiateMutation.mutate(row.run.id)}>
              <Play size={13} />
              Initiate
            </Button>
          )}
          {row.batch?.status === 'pending_approval' && canApprove && (
            <>
              <Button variant="secondary" size="sm" loading={approveMutation.isPending} onClick={() => approveMutation.mutate(row)}>
                <ThumbsUp size={13} />
                Approve
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRejectTarget(row)}>
                <ThumbsDown size={13} />
              </Button>
            </>
          )}
          {(row.batch?.status === 'approved' || row.batch?.status === 'awaiting_schedule') && canManage && (
            <Button variant="secondary" size="sm" loading={executeMutation.isPending} onClick={() => executeMutation.mutate(row)}>
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
          {row.batch && row.batch.totalCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => handleDownload(row)}>
              <DownloadCloud size={13} />
            </Button>
          )}
          {row.batch && ['draft', 'pending_approval', 'approved', 'awaiting_schedule'].includes(row.batch.status) && canManage && (
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
          <p className="text-sm text-cash-green/70 pt-1">
            Initiate and track salary disbursement for approved pay runs
          </p>
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
    </div>
  );
}
