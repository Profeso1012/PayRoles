import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import type { Employee } from '@contracts/types/employee';

interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

interface Department {
  id: string;
  name: string;
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
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'exited', label: 'Exited' },
];

const statusVariantMap: Record<string, 'success' | 'warning' | 'error'> = {
  active: 'success',
  on_leave: 'warning',
  exited: 'error',
};

const statusLabelMap: Record<string, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  exited: 'Exited',
};

export default function EmployeeList() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canAdd = role === 'HR_MANAGER' || role === 'COMPANY_SUPER_ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const { token } = useAuthStore.getState();
      const res = await fetch('/api/organisation/departments', {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const deptOptions = [
    { value: '', label: 'All departments' },
    ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
  ];

  const params = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (departmentId) params.set('departmentId', departmentId);

  const { data, isLoading, isError } = useQuery<PaginatedResult<Employee>>({
    queryKey: ['employees-list', page, search, status, departmentId],
    queryFn: () => fetchList<Employee>(`/employees?${params}`),
  });

  const columns = [
    {
      key: 'employeeNumber',
      header: 'Emp. No.',
      width: '100px',
      render: (row: Employee) => (
        <span className="font-mono text-xs text-cash-green">{row.employeeNumber}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (row: Employee) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={`${row.firstName} ${row.lastName}`} size="sm" />
          <div>
            <p className="font-medium text-deep-cash text-sm">
              {row.firstName} {row.lastName}
            </p>
            <p className="text-xs text-cash-green/70">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row: Employee) => <span className="text-sm text-cash-green">{row.phone}</span>,
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (row: Employee) => (
        <span className="text-xs text-cash-green/70">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Employee) => (
        <Badge
          variant={statusVariantMap[row.status] ?? 'info'}
          label={statusLabelMap[row.status] ?? row.status}
        />
      ),
    },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        title="Employees"
        action={
          canAdd ? (
            <Button variant="primary" onClick={() => navigate('/employees/new')}>
              <Plus size={16} />
              Add Employee
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-cash-green/50"
          />
          <input
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-mint-light rounded-md bg-white outline-none focus:border-fresh-cash transition-colors text-deep-cash placeholder:text-cash-green/40"
            placeholder="Search by name, email or number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-44">
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
        <div className="w-52">
          <Select
            value={departmentId}
            options={deptOptions}
            onChange={(v) => {
              setDepartmentId(v);
              setPage(1);
            }}
            placeholder="All departments"
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
        onRowClick={(row) => navigate(`/employees/${row.id}`)}
        rowKey={(row) => row.id}
        emptyMessage="No employees found"
        rowClassName={(row) => (row.status === 'exited' ? 'opacity-60' : '')}
      />
    </div>
  );
}
