import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import { fetchAllPages } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { mapPayrollRunFields } from '@/lib/api/transforms';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import type { PayRun, PayRunStatus } from '@contracts/types/payroll';

interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'calculating', label: 'Processing' },
  { value: 'calculated', label: 'Calculated' },
  { value: 'in_review', label: 'In Review' },
  // No 'approved' option - approve() jumps a run straight from in_review to
  // paid/completed on the real backend, so 'approved' is never an actual
  // resting status a run can be filtered to.
  { value: 'paid', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'reversed', label: 'Reversed' },
];

const statusVariantMap: Record<PayRunStatus, 'draft' | 'info' | 'warning' | 'success' | 'error'> = {
  draft: 'draft',
  calculating: 'warning',
  calculated: 'info',
  in_review: 'warning',
  pending_approval: 'warning',
  approved: 'success',
  processing: 'warning',
  paid: 'success',
  completed: 'success',
  rejected: 'error',
  cancelled: 'error',
  reversed: 'error',
  failed: 'error',
};

const statusLabelMap: Record<PayRunStatus, string> = {
  draft: 'Draft',
  calculating: 'Processing',
  calculated: 'Calculated',
  in_review: 'In Review',
  pending_approval: 'In Review',
  approved: 'Approved',
  processing: 'Processing',
  paid: 'Completed',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  reversed: 'Reversed',
  failed: 'Failed',
};

// Helper to format period from start/end dates
function formatPeriod(periodStart?: string, periodEnd?: string, period?: string): string {
  if (period) return period;
  if (!periodStart) return '—';
  const start = new Date(periodStart);
  const month = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return month;
}

const PAGE_SIZE = 20;

export default function PayRunList() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canCreate =
    role === 'payroll_manager' ||
    role === 'payroll_officer' ||
    role === 'tenant_admin' ||
    role === 'super_admin';

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [legalEntityId, setLegalEntityId] = useState('');

  // Fetch legal entities for filter dropdown
  const { data: legalEntities } = useQuery({
    queryKey: ['legal-entities-list'],
    queryFn: async () => {
      try {
        return await fetchAllPages<any>(
          (p) => `${ENDPOINTS.LEGAL_ENTITIES.LIST}?${buildPaginationParams({ page: p, limit: 100 })}`,
        );
      } catch (error) {
        console.error('Failed to fetch legal entities:', error);
        return [];
      }
    },
  });

  const legalEntityOptions = [
    { value: '', label: 'All legal entities' },
    ...(legalEntities || []).map((entity: any) => ({
      value: entity.id,
      label: entity.name,
    })),
  ];

  // GET /payroll/runs binds @Query() to plain PaginationDto (page/limit/
  // sortBy/sortDir only) - there is no status/legalEntityId filter, and the
  // global ValidationPipe's forbidNonWhitelisted rejects the WHOLE request if
  // an unknown query key is present. So every run is fetched (paging through
  // the 100-row cap) and filtered + paginated client-side - a single
  // server page would hide runs past the first 100.
  const { data: allRuns, isLoading, isError, error } = useQuery<PayRun[]>({
    queryKey: ['pay-runs-list'],
    queryFn: async () => {
      const runs = await fetchAllPages<any>(
        (p) =>
          `${ENDPOINTS.PAYROLL.RUNS.LIST}?${buildPaginationParams({ page: p, limit: 100, sortBy: 'createdAt', sortDir: 'desc' })}`,
      );
      return runs.map((run: any) => {
        const transformed = mapPayrollRunFields(run, 'toFrontend');

        // Build period string from dates if not present
        if (!transformed.period && transformed.periodStart) {
          transformed.period = formatPeriod(transformed.periodStart, transformed.periodEnd);
        }

        // Map payGroupName to name if present
        if (transformed.name && !transformed.payGroupName) {
          transformed.payGroupName = transformed.name;
        }

        return transformed as PayRun;
      });
    },
  });

  const data = useMemo<PaginatedResult<PayRun>>(() => {
    let runs = allRuns ?? [];
    // run.status is already frontend-normalized by mapPayrollRunFields
    // (e.g. 'pending_approval' -> 'in_review'), and `status` comes from the
    // same frontend-facing statusOptions list - compare directly.
    if (status) runs = runs.filter((run) => run.status === status);
    if (legalEntityId) runs = runs.filter((run) => run.legalEntityId === legalEntityId);
    const start = (page - 1) * PAGE_SIZE;
    return {
      data: runs.slice(start, start + PAGE_SIZE),
      meta: { page, pageSize: PAGE_SIZE, total: runs.length },
    };
  }, [allRuns, status, legalEntityId, page]);

  const columns = [
    {
      key: 'period',
      header: 'Period',
      render: (row: PayRun) => (
        <span className="font-medium text-deep-cash">
          {row.period || formatPeriod(row.periodStart, row.periodEnd)}
        </span>
      ),
    },
    {
      key: 'payGroupName',
      header: 'Name',
      render: (row: PayRun) => {
        const name = row.payGroupName || row.name || '—';
        return (
          <span className="text-sm text-cash-green line-clamp-3" title={name}>
            {name}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: PayRun) => (
        <Badge
          variant={statusVariantMap[row.status] ?? 'draft'}
          label={statusLabelMap[row.status] ?? row.status}
        />
      ),
    },
    {
      key: 'payDate',
      header: 'Pay Date',
      render: (row: PayRun) => (
        <span className="text-sm text-cash-green">{row.payDate ? formatDate(row.payDate) : '—'}</span>
      ),
    },
    {
      key: 'totalGross',
      header: 'Gross',
      render: (row: PayRun) =>
        row.totalGross > 0 ? (
          <MoneyDisplay amount={row.totalGross} currency={row.currency} size="sm" />
        ) : (
          <span className="text-cash-green/40 text-sm">—</span>
        ),
    },
    {
      key: 'totalNet',
      header: 'Net',
      render: (row: PayRun) =>
        row.totalNet > 0 ? (
          <MoneyDisplay amount={row.totalNet} currency={row.currency} size="sm" />
        ) : (
          <span className="text-cash-green/40 text-sm">—</span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: PayRun) => (
        <span className="text-xs text-cash-green/70">{formatDate(row.createdAt)}</span>
      ),
    },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: 'clamp(1rem, 3vw, 2rem) clamp(0.5rem, 2vw, 1.5rem)' }}>
      <PageHeader
        title="Pay Runs"
        action={
          canCreate ? (
            <Button variant="primary" onClick={() => navigate('/payroll/runs/new')}>
              <Plus size={16} />
              New Pay Run
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="w-48">
          <Select
            value={status}
            options={statusOptions}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            placeholder="All statuses"
          />
        </div>
        <div className="w-60">
          <Select
            value={legalEntityId}
            options={legalEntityOptions}
            onChange={(v) => {
              setLegalEntityId(v);
              setPage(1);
            }}
            placeholder="All legal entities"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isError={isError}
        error={error}
        pagination={data?.meta}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/payroll/runs/${row.id}`)}
        rowKey={(row) => row.id}
        emptyMessage="No pay runs found"
      />
    </div>
  );
}

