import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Layers, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClient, apiClientWithMeta, fetchAllPages } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { transformPaginatedResponse, mapWorkerFields } from '@/lib/api/transforms';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import Avatar from '@/components/ui/Avatar';
import type { Employee } from '@contracts/types/employee';
import type { BackendWorker, BackendCalculationMethod, CreateWorkerPayElementRequest } from '@/lib/api/types';
import type { PayElementDefinition } from '@contracts/types/payroll';

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

const CALCULATION_METHOD_OPTIONS = [
  { value: 'fixed', label: 'Fixed amount' },
  { value: 'percentage_of_basic', label: 'Percentage of basic' },
  { value: 'percentage_of_gross', label: 'Percentage of gross' },
  { value: 'formula', label: "Formula (uses the element's own formula)" },
];

const blankBulkAssignForm = {
  payElementId: '',
  calculationMethod: 'fixed' as BackendCalculationMethod,
  amount: '',
  percentage: '',
  formulaOverride: '',
  effectiveDate: '',
  endDate: '',
  remarks: '',
};

interface BulkAssignResult {
  worker: BackendWorker;
  status: 'success' | 'error';
  error?: string;
}

// Same bounded-concurrency runner used by ImportEmployees.tsx's bulk actions -
// fires at most `limit` requests at once instead of every selected worker in
// one go, and collects a result (success or the real backend error) per
// worker rather than stopping at the first failure.
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function runNext(): Promise<void> {
    const i = next++;
    if (i >= items.length) return;
    results[i] = await worker(items[i], i);
    return runNext();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext));
  return results;
}

export default function EmployeeList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canAdd =
    role === 'hr_manager' ||
    role === 'hr_officer' ||
    role === 'tenant_admin' ||
    role === 'super_admin';
  // Same gate EmployeeDetail.tsx uses for its own single-worker "Assign Pay
  // Element" button - bulk assignment is the same write, just to many workers
  // at once, so it should require the same permission.
  const canWritePayElements = role === 'hr_manager' || role === 'tenant_admin' || role === 'super_admin';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [legalEntityId, setLegalEntityId] = useState('');

  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignForm, setBulkAssignForm] = useState(blankBulkAssignForm);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
  const [bulkAssignResults, setBulkAssignResults] = useState<BulkAssignResult[] | null>(null);
  const [bulkAssignSubmitting, setBulkAssignSubmitting] = useState(false);

  const { data: allActiveWorkers, isLoading: loadingAllWorkers } = useQuery<BackendWorker[]>({
    queryKey: ['workers-all-active'],
    queryFn: () =>
      fetchAllPages<BackendWorker>((p) =>
        `${ENDPOINTS.WORKERS.LIST}?${buildPaginationParams({ page: p, limit: 100 })}&status=active`,
      ),
    enabled: bulkAssignOpen,
  });

  // Excludes BASIC_SALARY (system-managed, never assignable) and any
  // auto-apply tax element - the calculation engine applies those to every
  // worker automatically regardless of assignment, and silently ignores
  // whatever amount/method a manual assignment would set, so offering them
  // here would just be a no-op that looks like it did something.
  const { data: bulkPayElementCatalog } = useQuery<PayElementDefinition[]>({
    queryKey: ['pay-elements-assignable'],
    queryFn: async () => {
      const response = await apiClient<any>(`${ENDPOINTS.PAY_ELEMENTS.LIST}?${buildPaginationParams({ limit: 100 })}`);
      const items: PayElementDefinition[] = Array.isArray(response) ? response : (response.data ?? []);
      return items.filter(
        (pe) => pe.isActive && pe.code !== 'BASIC_SALARY' && !(pe.type === 'tax' && pe.autoApply),
      );
    },
    enabled: bulkAssignOpen,
  });

  function openBulkAssign() {
    setBulkAssignForm(blankBulkAssignForm);
    setSelectedWorkerIds(new Set());
    setBulkAssignResults(null);
    setBulkAssignOpen(true);
  }

  function closeBulkAssign() {
    setBulkAssignOpen(false);
    setBulkAssignForm(blankBulkAssignForm);
    setSelectedWorkerIds(new Set());
    setBulkAssignResults(null);
  }

  function toggleWorkerSelected(id: string) {
    setSelectedWorkerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitBulkAssign() {
    const targets = (allActiveWorkers ?? []).filter((w) => selectedWorkerIds.has(w.id));
    if (targets.length === 0) return;

    const body: CreateWorkerPayElementRequest = {
      payElementId: bulkAssignForm.payElementId,
      calculationMethod: bulkAssignForm.calculationMethod,
      effectiveDate: bulkAssignForm.effectiveDate,
      endDate: bulkAssignForm.endDate || undefined,
      remarks: bulkAssignForm.remarks || undefined,
    };
    if (bulkAssignForm.calculationMethod === 'fixed') {
      body.amountMinor = Math.round(parseFloat(bulkAssignForm.amount) * 100);
    } else if (bulkAssignForm.calculationMethod === 'percentage_of_basic' || bulkAssignForm.calculationMethod === 'percentage_of_gross') {
      body.percentage = parseFloat(bulkAssignForm.percentage);
    } else if (bulkAssignForm.calculationMethod === 'formula') {
      body.formulaOverride = bulkAssignForm.formulaOverride || undefined;
    }

    setBulkAssignSubmitting(true);
    const results = await runWithConcurrency(targets, 6, async (worker): Promise<BulkAssignResult> => {
      try {
        await apiClient(ENDPOINTS.WORKER_PAY_ELEMENTS.ASSIGN(worker.id), {
          method: 'POST',
          body: JSON.stringify(body),
        });
        return { worker, status: 'success' };
      } catch (err) {
        return { worker, status: 'error', error: err instanceof Error ? err.message : 'Failed to assign' };
      }
    });
    setBulkAssignSubmitting(false);
    setBulkAssignResults(results);
    qc.invalidateQueries({ queryKey: ['workers-list'] });
  }

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
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: 'clamp(1rem, 3vw, 2rem) clamp(0.5rem, 2vw, 1.5rem)' }}>
      <PageHeader
        title="Employees"
        action={
          <div className="flex items-center gap-2">
            {canWritePayElements && (
              <Button
                variant="secondary"
                onClick={openBulkAssign}
                className="!text-xs sm:!text-sm !px-2.5 sm:!px-4 !py-1.5 sm:!py-2 whitespace-nowrap"
              >
                <Layers size={16} />
                <span className="sm:hidden">Bulk Assign</span>
                <span className="hidden sm:inline">Bulk Assign Pay Element</span>
              </Button>
            )}
            {canAdd && (
              <Button
                variant="primary"
                onClick={() => navigate('/employees/new')}
                className="!text-xs sm:!text-sm !px-2.5 sm:!px-4 !py-1.5 sm:!py-2 whitespace-nowrap"
              >
                <Plus size={16} />
                Add Employee
              </Button>
            )}
          </div>
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

      <Modal
        isOpen={bulkAssignOpen}
        onClose={closeBulkAssign}
        title="Bulk Assign Pay Element"
        size="md"
      >
        {bulkAssignResults ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-cash-green/70">
              {bulkAssignResults.filter((r) => r.status === 'success').length} of {bulkAssignResults.length} assigned successfully.
            </p>
            <div className="max-h-80 overflow-y-auto flex flex-col gap-2">
              {bulkAssignResults.map((r) => (
                <div key={r.worker.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-mint-light bg-soft-white">
                  <p className="text-sm font-medium text-deep-cash truncate">
                    {r.worker.firstName} {r.worker.lastName}
                  </p>
                  {r.status === 'success' ? (
                    <Check size={14} className="text-fresh-cash shrink-0" />
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0 text-red-500 text-right">
                      <AlertCircle size={14} className="shrink-0" />
                      <span className="text-xs">{r.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={closeBulkAssign}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Select
              label="Pay Element"
              value={bulkAssignForm.payElementId}
              options={(bulkPayElementCatalog ?? []).map((pe) => ({ value: pe.id, label: `${pe.code} — ${pe.name}` }))}
              onChange={(v) => setBulkAssignForm((f) => ({ ...f, payElementId: v }))}
              placeholder={bulkPayElementCatalog ? 'Select a pay element' : 'Loading...'}
              hint="BASIC_SALARY and auto-apply tax elements aren't listed — they apply to everyone automatically and can't be usefully assigned manually."
            />
            <Select
              label="Calculation Method"
              value={bulkAssignForm.calculationMethod}
              options={CALCULATION_METHOD_OPTIONS}
              onChange={(v) => setBulkAssignForm((f) => ({ ...f, calculationMethod: v as BackendCalculationMethod }))}
            />
            {bulkAssignForm.calculationMethod === 'fixed' && (
              <Input
                label="Amount"
                type="number"
                min={0}
                value={bulkAssignForm.amount}
                onChange={(e) => setBulkAssignForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 50000"
                hint="Applied identically to every worker selected below."
              />
            )}
            {(bulkAssignForm.calculationMethod === 'percentage_of_basic' || bulkAssignForm.calculationMethod === 'percentage_of_gross') && (
              <Input
                label="Percentage"
                type="number"
                min={0}
                max={1000}
                value={bulkAssignForm.percentage}
                onChange={(e) => setBulkAssignForm((f) => ({ ...f, percentage: e.target.value }))}
                placeholder="e.g. 15"
                hint="0-1000%. Since this is a % rather than a flat amount, each worker still ends up with a different naira value based on their own basic salary."
              />
            )}
            {bulkAssignForm.calculationMethod === 'formula' && (
              <Input
                label="Formula override (optional)"
                value={bulkAssignForm.formulaOverride}
                onChange={(e) => setBulkAssignForm((f) => ({ ...f, formulaOverride: e.target.value }))}
                placeholder="Leave blank to use the pay element's default formula"
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-cash-green font-medium mb-1">Effective from</p>
                <input
                  type="date"
                  className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                  value={bulkAssignForm.effectiveDate}
                  onChange={(e) => setBulkAssignForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                />
              </div>
              <div>
                <p className="text-sm text-cash-green font-medium mb-1">End date (optional)</p>
                <input
                  type="date"
                  className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                  value={bulkAssignForm.endDate}
                  min={bulkAssignForm.effectiveDate || undefined}
                  onChange={(e) => setBulkAssignForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <Input
              label="Remarks (optional)"
              value={bulkAssignForm.remarks}
              maxLength={1000}
              onChange={(e) => setBulkAssignForm((f) => ({ ...f, remarks: e.target.value.slice(0, 1000) }))}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-cash-green font-medium">
                  Employees ({selectedWorkerIds.size} selected)
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedWorkerIds(
                      selectedWorkerIds.size === (allActiveWorkers ?? []).length
                        ? new Set()
                        : new Set((allActiveWorkers ?? []).map((w) => w.id)),
                    )
                  }
                  className="text-xs font-medium text-fresh-cash hover:text-cash-green"
                >
                  {selectedWorkerIds.size === (allActiveWorkers ?? []).length && (allActiveWorkers ?? []).length > 0
                    ? 'Deselect all'
                    : 'Select all'}
                </button>
              </div>
              {loadingAllWorkers ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : (
                <div className="max-h-64 overflow-y-auto flex flex-col gap-1.5 border border-mint-light rounded-lg p-2">
                  {(allActiveWorkers ?? []).map((w) => (
                    <label
                      key={w.id}
                      className="flex items-center gap-3 p-2 rounded-lg border border-mint-light cursor-pointer hover:bg-soft-white"
                    >
                      <input
                        type="checkbox"
                        checked={selectedWorkerIds.has(w.id)}
                        onChange={() => toggleWorkerSelected(w.id)}
                        className="shrink-0"
                      />
                      <span className="text-sm text-deep-cash truncate">
                        {w.firstName} {w.lastName}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={closeBulkAssign}>Cancel</Button>
              <Button
                variant="primary"
                loading={bulkAssignSubmitting}
                disabled={
                  !bulkAssignForm.payElementId ||
                  !bulkAssignForm.effectiveDate ||
                  selectedWorkerIds.size === 0 ||
                  (!!bulkAssignForm.endDate && bulkAssignForm.endDate < bulkAssignForm.effectiveDate) ||
                  (bulkAssignForm.calculationMethod === 'fixed' && !bulkAssignForm.amount) ||
                  ((bulkAssignForm.calculationMethod === 'percentage_of_basic' || bulkAssignForm.calculationMethod === 'percentage_of_gross') && !bulkAssignForm.percentage)
                }
                onClick={submitBulkAssign}
              >
                Assign to {selectedWorkerIds.size || ''} Employee{selectedWorkerIds.size === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
