import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import { apiClientWithMeta } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { transformPaginatedResponse, mapPayrollRunFields } from '@/lib/api/transforms';
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
        const response = await apiClientWithMeta<any>(`${ENDPOINTS.LEGAL_ENTITIES.LIST}?${buildPaginationParams({ limit: 100 })}`);
        const entities = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        return entities;
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

  const { data, isLoading, isError } = useQuery<PaginatedResult<PayRun>>({
    queryKey: ['pay-runs-list', page, status, legalEntityId],
    queryFn: async () => {
      // GET /payroll/runs binds @Query() to plain PaginationDto (page/limit/
      // sortBy/sortDir only) - there is no status field on it, and the global
      // ValidationPipe's forbidNonWhitelisted rejects the WHOLE request if an
      // unknown query key like "status" or "legalEntityId" is present. So they
      // can't be sent to the server at all - filtered client-side below instead.
      // Always fetch the max page size (100) - previously "All statuses" used
      // a real 20-row server page while a status filter fetched 100 rows to
      // filter within, so e.g. draft runs older than the 20 most-recent-created
      // runs were invisible under "All" but reappeared under "Draft".
      const params = buildPaginationParams({
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortDir: 'desc',
      });

      const response = await apiClientWithMeta<any>(`${ENDPOINTS.PAYROLL.RUNS.LIST}?${params}`);

      // Transform response
      const paginatedData = transformPaginatedResponse(response.data, response.meta);

      // Transform each payroll run from backend format to frontend format
      let transformedRuns = paginatedData.data.map((run: any) => {
        const transformed = mapPayrollRunFields(run, 'toFrontend');

        // Build period string from dates if not present
        if (!transformed.period && transformed.periodStart) {
          transformed.period = formatPeriod(transformed.periodStart, transformed.periodEnd);
        }

        // Map payGroupName to name if present
        if (transformed.name && !transformed.payGroupName) {
          transformed.payGroupName = transformed.name;
        }

        return transformed;
      });

      if (status) {
        // run.status is already frontend-normalized by mapPayrollRunFields
        // above (e.g. 'pending_approval' -> 'in_review'), and `status` here
        // comes from the same frontend-facing statusOptions list - compare
        // directly, no mapPayrollStatus conversion needed (that would wrongly
        // convert 'in_review' -> 'pending_approval' and mismatch).
        transformedRuns = transformedRuns.filter((run) => run.status === status);
      }

      if (legalEntityId) {
        transformedRuns = transformedRuns.filter((run) => run.legalEntityId === legalEntityId);
      }

      return {
        data: transformedRuns,
        meta: { page: 1, pageSize: transformedRuns.length, total: transformedRuns.length },
      };
    },
  });

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
      render: (row: PayRun) => (
        <span className="text-sm text-cash-green">{row.payGroupName || row.name || '—'}</span>
      ),
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
        pagination={data?.meta}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/payroll/runs/${row.id}`)}
        rowKey={(row) => row.id}
        emptyMessage="No pay runs found"
      />
    </div>
  );
}

