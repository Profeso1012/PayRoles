import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClient, apiClientWithMeta } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { transformPaginatedResponse, mapWorkerFields } from '@/lib/api/transforms';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import type { Employee } from '@contracts/types/employee';
import type { BackendWorker } from '@/lib/api/types';

// Matches transformPaginatedResponse's actual (flat) return shape - see lib/api/transforms.ts.
interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

interface LegalEntity {
  id: string;
  name: string;
}

// Real backend Status enum values (common.enum.ts): active | inactive | suspended | archived.
// There is no on_leave/terminated status on the wire - "Terminated" below is a derived
// display label for status === 'inactive' with a terminationDate set.
const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'archived', label: 'Archived' },
];

const statusVariantMap: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  active: 'success',
  inactive: 'info',
  suspended: 'warning',
  archived: 'error',
};

const statusLabelMap: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  archived: 'Archived',
};

function displayStatus(row: Employee): { key: string; label: string } {
  if (row.status === 'inactive' && row.terminationDate) {
    return { key: 'terminated', label: 'Terminated' };
  }
  return { key: row.status, label: statusLabelMap[row.status] ?? row.status };
}

export default function EmployeeList() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canAdd =
    role === 'hr_manager' ||
    role === 'hr_officer' ||
    role === 'tenant_admin' ||
    role === 'super_admin';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [legalEntityId, setLegalEntityId] = useState('');

  // Fetch legal entities (replaces departments for filtering)
  const { data: legalEntities } = useQuery<LegalEntity[]>({
    queryKey: ['legal-entities'],
    queryFn: async () => {
      try {
        const response = await apiClient<any>(ENDPOINTS.LEGAL_ENTITIES.LIST);
        // Handle both paginated and direct array responses
        if (Array.isArray(response)) {
          return response;
        }
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch legal entities:', error);
        return [];
      }
    },
  });

  const entityOptions = [
    { value: '', label: 'All entities' },
    ...(legalEntities ?? []).map((e) => ({ value: e.id, label: e.name })),
  ];

  // Build query params for backend
  const params = new URLSearchParams({ 
    page: String(page), 
    limit: '20',  // Backend uses 'limit' not 'pageSize'
    sortBy: 'createdAt',
    sortDir: 'desc',
  });
  if (search) params.set('search', search);
  if (status) params.set('status', status);  // Backend Status enum is lowercase - send as-is
  if (legalEntityId) params.set('legalEntityId', legalEntityId);

  const { data, isLoading, isError } = useQuery<PaginatedResult<Employee>>({
    queryKey: ['workers-list', page, search, status, legalEntityId],
    queryFn: async () => {
      try {
        // Call workers endpoint (backend)
        const { data: response, meta } = await apiClientWithMeta<BackendWorker[]>(
          `${ENDPOINTS.WORKERS.LIST}?${params}`
        );

        // Transform backend response to match frontend structure
        const workers = Array.isArray(response) ? response : [];

        // Map worker fields to employee format (handles encrypted fields, etc.)
        const employees = workers.map((worker) => {
          const mapped = mapWorkerFields(worker, 'toFrontend');
          return {
            ...mapped,
            status: mapped.status || 'active',
            createdAt: mapped.createdAt || new Date().toISOString(),
          } as Employee;
        });

        // Transform pagination
        return transformPaginatedResponse(employees, meta);
      } catch (error) {
        console.error('Failed to fetch workers:', error);
        throw error;
      }
    },
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
      render: (row: Employee) => {
        const { key, label } = displayStatus(row);
        return <Badge variant={statusVariantMap[key] ?? 'info'} label={label} />;
      },
    },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
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
            value={legalEntityId}
            options={entityOptions}
            onChange={(v) => {
              setLegalEntityId(v);
              setPage(1);
            }}
            placeholder="All entities"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isError={isError}
        pagination={data}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/employees/${row.id}`)}
        rowKey={(row) => row.id}
        emptyMessage="No employees found"
        rowClassName={(row) => (row.status === 'inactive' || row.status === 'archived' ? 'opacity-60' : '')}
      />
    </div>
  );
}
