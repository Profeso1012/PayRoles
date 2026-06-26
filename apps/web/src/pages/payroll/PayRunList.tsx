import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { formatPeriod, formatDate } from '@/lib/utils';
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

async function fetchList<T>(path: string): Promise<PaginatedResult<T>> {
  const { token, clearSession } = useAuthStore.getState();
  const res = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) {
    clearSession();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? 'Request failed');
  return { data: json.data, meta: json.meta ?? { page: 1, pageSize: 20, total: (json.data as unknown[])?.length ?? 0 } };
}

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'calculating', label: 'Calculating' },
  { value: 'calculated', label: 'Calculated' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
];

const statusVariantMap: Record<PayRunStatus, 'draft' | 'info' | 'warning' | 'success' | 'error'> = {
  draft: 'draft',
  calculating: 'warning',
  calculated: 'info',
  in_review: 'warning',
  approved: 'success',
  paid: 'success',
  posted: 'success',
  reversed: 'error',
  failed: 'error',
};

const statusLabelMap: Record<PayRunStatus, string> = {
  draft: 'Draft',
  calculating: 'Calculating',
  calculated: 'Calculated',
  in_review: 'In Review',
  approved: 'Approved',
  paid: 'Paid',
  posted: 'Posted',
  reversed: 'Reversed',
  failed: 'Failed',
};

export default function PayRunList() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canCreate = role === 'PAYROLL_MANAGER' || role === 'COMPANY_SUPER_ADMIN';

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const params = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (status) params.set('status', status);

  const { data, isLoading, isError } = useQuery<PaginatedResult<PayRun>>({
    queryKey: ['pay-runs-list', page, status],
    queryFn: () => fetchList<PayRun>(`/pay-runs?${params}`),
  });

  const columns = [
    {
      key: 'period',
      header: 'Period',
      render: (row: PayRun) => (
        <span className="font-medium text-deep-cash">{formatPeriod(row.period)}</span>
      ),
    },
    {
      key: 'payGroupName',
      header: 'Pay Group',
      render: (row: PayRun) => <span className="text-sm text-cash-green">{row.payGroupName}</span>,
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
