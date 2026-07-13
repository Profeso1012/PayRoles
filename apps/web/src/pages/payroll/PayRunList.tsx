import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import { apiClientWithMeta } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams, addFilterParams } from '@/lib/api/adapter';
import { transformPaginatedResponse, mapPayrollRunFields, mapPayrollStatus } from '@/lib/api/transforms';
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
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'calculating', label: 'Processing' },
  { value: 'paid', label: 'Completed' },
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

  const { data, isLoading, isError } = useQuery<PaginatedResult<PayRun>>({
    queryKey: ['pay-runs-list', page, status],
    queryFn: async () => {
      const params = buildPaginationParams({ page, limit: 20, sortBy: 'createdAt', sortDir: 'desc' });
      if (status) {
        addFilterParams(params, { status: mapPayrollStatus(status, 'toBackend') });
      }
      
      const response = await apiClientWithMeta<any>(`${ENDPOINTS.PAYROLL.RUNS.LIST}?${params}`);

      // Transform response
      const paginatedData = transformPaginatedResponse(response.data, response.meta);
      
      // Transform each payroll run from backend format to frontend format
      const transformedRuns = paginatedData.data.map((run: any) => {
        const transformed = mapPayrollRunFields(run, 'toFrontend');
        
        // Build period string from dates if not present
        if (!transformed.period && transformed.periodStart) {
          transformed.period = formatPeriod(transformed.periodStart, transformed.periodEnd);
        }
        
        // Handle missing employeeCount (not in backend response)
        if (!transformed.employeeCount) {
          transformed.employeeCount = 0;
        }
        
        // Map payGroupName to name if present
        if (transformed.name && !transformed.payGroupName) {
          transformed.payGroupName = transformed.name;
        }
        
        return transformed;
      });
      
      return {
        data: transformedRuns,
        meta: paginatedData,
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
      key: 'employeeCount',
      header: 'Employees',
      render: (row: PayRun) => <span className="text-sm tabular-nums">{row.employeeCount}</span>,
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
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
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

      <div className="mb-5 w-48">
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

