import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Inbox, FileText, Clock, CheckCircle2, Settings2, LayoutDashboard, FileBarChart, WalletCards, ChevronRight } from 'lucide-react';
import { apiClient, apiClientWithMeta, ApiError } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { mapPayrollRunFields } from '@/lib/api/transforms';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import { batchStatusVariant, batchStatusLabel, RESOLVED_BATCH_STATUSES } from './disbursementConstants';
import type { BackendDisbursementBatch } from '@/lib/api/types';
import type { PayRun } from '@contracts/types/payroll';

// A payroll run paired with its disbursement batch (if one has been initiated).
// Runs only become disbursement-eligible once approved by Finance. Clicking a
// row opens DisbursementBatchDetail.tsx - the dedicated page for everything
// batch-specific (approve/reject/execute/retry/confirm/cancel, transactions,
// download) replaces what used to be a stack of popups over this table.
interface DisbursementRow {
  run: PayRun;
  batch: BackendDisbursementBatch | null;
}

// Helper to format period from start/end dates or single period string
function formatPeriod(periodStart?: string, periodEnd?: string, period?: string): string {
  if (period) return period;
  if (!periodStart) return '—';
  const start = new Date(periodStart);
  return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function PaymentFiles() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'finance_manager' || role === 'payroll_manager' || role === 'tenant_admin' || role === 'super_admin';
  const canConfigure = role === 'tenant_admin' || role === 'super_admin';

  const { data: rows = [], isLoading, isError, error } = useQuery<DisbursementRow[]>({
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
          } catch (err) {
            // A real failure (network, 500, unexpected 403) shouldn't be
            // silently swallowed as "not started" - only a clean 404 means
            // no batch exists yet.
            if (err instanceof ApiError && err.status === 404) return { run, batch: null };
            throw err;
          }
        }),
      );
    },
  });

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
      render: (row: DisbursementRow) =>
        row.batch ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant={batchStatusVariant[row.batch.status] ?? 'error'}
              label={batchStatusLabel[row.batch.status] ?? `Unknown (${row.batch.status})`}
            />
            {row.batch.fundedByWallet && <Badge variant="info" label="Wallet" />}
          </div>
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
      render: () => (
        <div className="flex items-center justify-end">
          <ChevronRight size={16} className="text-cash-green/40" />
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
                <Button variant="ghost" size="sm" onClick={() => navigate('/payments/wallet')}>
                  <WalletCards size={14} />
                  <span className="hidden sm:inline">Wallet</span>
                </Button>
              )}
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
          error={error}
          rowKey={(row) => row.run.id}
          onRowClick={(row) => navigate(`/payments/disbursements/${row.run.id}`)}
          emptyMessage="No approved pay runs found"
        />
      )}
    </div>
  );
}
