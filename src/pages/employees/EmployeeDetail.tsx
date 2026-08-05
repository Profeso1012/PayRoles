import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, AlertCircle, CreditCard, User, Briefcase, Receipt, Plus, Layers, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { mapWorkerFields, minorToMajor } from '@/lib/api/transforms';
import { formatDate } from '@/lib/utils';
import { PATHS } from '@/router/paths';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { Employee, Compensation } from '@contracts/types/employee';
import type { Payslip } from '@contracts/types/payroll';
import type {
  BackendWorker,
  BackendCompensation,
  CreateCompensationRequest,
  BackendWorkerPayElement,
  CreateWorkerPayElementRequest,
  UpdateWorkerPayElementRequest,
  BackendPayElement,
  BackendCalculationMethod,
} from '@/lib/api/types';

const SALARY_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'commission', label: 'Commission' },
];

const PAY_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'semimonthly', label: 'Semi-monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
];

const blankCompForm = {
  amount: '',
  currency: 'NGN',
  salaryType: 'fixed',
  payFrequency: 'monthly',
  effectiveDate: '',
  expiryDate: '',
  notes: '',
  breakdownComponents: [] as Array<{ label: string; amount: string }>,
};

const CALCULATION_METHOD_OPTIONS = [
  { value: 'fixed', label: 'Fixed amount' },
  { value: 'percentage_of_basic', label: 'Percentage of basic' },
  { value: 'percentage_of_gross', label: 'Percentage of gross' },
  { value: 'formula', label: 'Formula' },
];

const blankWpeForm = {
  payElementId: '',
  calculationMethod: 'fixed' as BackendCalculationMethod,
  amount: '',
  percentage: '',
  formulaOverride: '',
  effectiveDate: '',
  endDate: '',
  remarks: '',
};

// Helper to format period from start/end dates or single period string
function formatPeriod(periodStart?: string, periodEnd?: string, period?: string): string {
  if (period) return period;
  if (!periodStart) return '—';
  const start = new Date(periodStart);
  return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const TAB_IDS = ['profile', 'compensation', 'payElements', 'payslips'];

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'compensation', label: 'Compensation' },
  { id: 'payElements', label: 'Pay Elements' },
  { id: 'payslips', label: 'Payslips' },
];

const wpeStatusVariant: Record<string, 'success' | 'info' | 'draft'> = {
  active: 'success',
  inactive: 'draft',
  expired: 'info',
};

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  active: 'success',
  inactive: 'info',
  suspended: 'warning',
  archived: 'error',
};

const statusLabel: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  archived: 'Archived',
};

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canWritePayElements = role === 'hr_manager' || role === 'tenant_admin' || role === 'super_admin';
  // Matches Permission.WORKER_WRITE grants (roles.enum.ts): hr_manager,
  // hr_officer, tenant_admin, super_admin.
  const canWriteWorker = role === 'hr_manager' || role === 'hr_officer' || role === 'tenant_admin' || role === 'super_admin';
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [terminationDate, setTerminationDate] = useState('');
  const [terminationReason, setTerminationReason] = useState('');
  const [tab, setTab] = useState('profile');
  const [addCompOpen, setAddCompOpen] = useState(false);
  const [compForm, setCompForm] = useState(blankCompForm);
  const [assignWpeOpen, setAssignWpeOpen] = useState(false);
  const [wpeForm, setWpeForm] = useState(blankWpeForm);
  const [editingWpeId, setEditingWpeId] = useState<string | null>(null);
  const [unassignTarget, setUnassignTarget] = useState<BackendWorkerPayElement | null>(null);

  const { data: employee, isLoading, isError, refetch } = useQuery<Employee>({
    queryKey: ['worker', id],
    queryFn: async () => {
      const worker = await apiClient<BackendWorker>(ENDPOINTS.WORKERS.DETAIL(id!));
      const mapped = mapWorkerFields(worker, 'toFrontend');
      return {
        ...mapped,
        status: mapped.status || 'active',
        createdAt: mapped.createdAt || new Date().toISOString(),
        // Real Worker entity keeps bank fields flat (bankName/bankAccount/bankRoutingCode),
        // not a bankDetails[] array - keep the array empty for legacy consumers.
        bankDetails: [],
      } as Employee;
    },
    enabled: !!id,
  });

  // Fetch legal entity name for breadcrumb
  const { data: legalEntity } = useQuery({
    queryKey: ['legal-entity', employee?.legalEntityId],
    queryFn: async () => {
      if (!employee?.legalEntityId) return null;
      try {
        return await apiClient<any>(ENDPOINTS.LEGAL_ENTITIES.DETAIL(employee.legalEntityId));
      } catch {
        return null;
      }
    },
    enabled: !!employee?.legalEntityId,
  });

  const terminateMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.WORKERS.TERMINATE(id!), {
        method: 'PATCH',
        body: JSON.stringify({ terminationDate, reason: terminationReason || undefined }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker', id] });
      toast.success('Employee terminated');
      setTerminateModalOpen(false);
      setTerminationDate('');
      setTerminationReason('');
    },
    onError: (err) => toast.error('Failed to terminate employee', err instanceof Error ? err.message : undefined),
  });

  const { data: compensations } = useQuery<Compensation[]>({
    queryKey: ['worker-compensations', id],
    queryFn: async () => {
      try {
        const result = await apiClient<BackendCompensation[]>(
          ENDPOINTS.COMPENSATION.LIST(id!)
        );
        // Transform backend compensation to frontend format. Real field names:
        // workerId, amountMinor (bigint string), effectiveDate, expiryDate.
        return result.map((comp) => ({
          id: comp.id,
          employeeId: comp.workerId,
          effectiveFrom: comp.effectiveDate,
          effectiveTo: comp.expiryDate,
          grossSalary: parseInt(comp.amountMinor, 10) / 100, // Convert from minor units
          currency: comp.currency,
          salaryType: comp.salaryType,
          payFrequency: comp.payFrequency,
          breakdown: comp.breakdown ?? undefined,
          notes: comp.notes ?? undefined,
          voidedAt: comp.voidedAt ?? undefined,
          voidReason: comp.voidReason ?? undefined,
        })) satisfies Compensation[];
      } catch (error) {
        console.error('Failed to fetch compensations:', error);
        return [];
      }
    },
    enabled: !!id && tab === 'compensation',
  });

  const { data: payslips } = useQuery<Payslip[]>({
    queryKey: ['worker-payslips', id],
    queryFn: async () => {
      const backendPayslips = await apiClient<any[]>(ENDPOINTS.WORKERS.PAYSLIPS(id!));
      
      // Fetch pay run data for each payslip to get period and pay group name
      const payslipsWithRunData = await Promise.all(
        backendPayslips.map(async (slip): Promise<Payslip> => {
          let period: string | undefined = undefined;
          let payGroupName = '—';
          
          // Fetch the payroll run to get period and name
          try {
            const run = await apiClient<any>(ENDPOINTS.PAYROLL.RUNS.DETAIL(slip.payrollRunId));
            period = formatPeriod(run.periodStart, run.periodEnd);
            payGroupName = run.name || '—';
          } catch {
            // If run fetch fails, continue with defaults
          }
          
          return {
            id: slip.id,
            payRunId: slip.payrollRunId, // Backend uses payrollRunId
            employeeId: slip.workerId,
            employeeName: employee ? `${employee.firstName} ${employee.lastName}` : '',
            employeeNumber: employee?.employeeNumber || '',
            period,
            name: slip.name || undefined,
            payGroupName,
            elements: slip.payElements?.map((el: any) => ({
              ...el,
              amount: minorToMajor(el.amountMinor),
            })) || [],
            grossPay: minorToMajor(slip.grossPayMinor),
            totalDeductions: minorToMajor(slip.deductionsMinor),
            netPay: minorToMajor(slip.netPayMinor),
            currency: slip.currency,
            createdAt: slip.createdAt,
            generatedAt: slip.generatedAt,
            issuedAt: slip.issuedAt,
            payrollWorkerId: slip.payrollWorkerId,
          };
        }),
      );
      
      return payslipsWithRunData;
    },
    enabled: !!id && tab === 'payslips' && !!employee,
  });

  const { data: workerPayElements } = useQuery<BackendWorkerPayElement[]>({
    queryKey: ['worker-pay-elements', id],
    queryFn: async () => {
      const response = await apiClient<any>(ENDPOINTS.WORKER_PAY_ELEMENTS.LIST(id!));
      return Array.isArray(response) ? response : (response.data || []);
    },
    enabled: !!id && tab === 'payElements',
  });

  // Catalog of tenant-wide pay element definitions, used to populate the
  // assign modal's picker AND to know upfront (before the modal ever opens)
  // whether the tenant has any pay elements to assign at all - loads
  // alongside workerPayElements as soon as this tab is viewed, rather than
  // only once the modal is already open, so the Assign button itself can be
  // guarded instead of opening onto an empty, dead-end picker.
  const { data: payElementCatalog } = useQuery<BackendPayElement[]>({
    queryKey: ['pay-elements'],
    queryFn: async () => {
      // No params here defaults to PaginationDto's limit: 20, silently
      // truncating the picker for any tenant with more than 20 pay elements.
      const response = await apiClient<any>(`${ENDPOINTS.PAY_ELEMENTS.LIST}?${buildPaginationParams({ limit: 100 })}`);
      return Array.isArray(response) ? response : (response.data || []);
    },
    enabled: tab === 'payElements',
  });
  const hasNoPayElements = !!payElementCatalog && payElementCatalog.length === 0;

  const assignPayElementMutation = useMutation({
    mutationFn: () => {
      const body: CreateWorkerPayElementRequest | UpdateWorkerPayElementRequest = {
        payElementId: wpeForm.payElementId,
        calculationMethod: wpeForm.calculationMethod,
        effectiveDate: wpeForm.effectiveDate,
        endDate: wpeForm.endDate || undefined,
        remarks: wpeForm.remarks || undefined,
      };
      if (wpeForm.calculationMethod === 'fixed') {
        body.amountMinor = Math.round(parseFloat(wpeForm.amount) * 100);
      } else if (wpeForm.calculationMethod === 'percentage_of_basic' || wpeForm.calculationMethod === 'percentage_of_gross') {
        body.percentage = parseFloat(wpeForm.percentage);
      } else if (wpeForm.calculationMethod === 'formula') {
        body.formulaOverride = wpeForm.formulaOverride || undefined;
      }
      return editingWpeId
        ? apiClient(ENDPOINTS.WORKER_PAY_ELEMENTS.UPDATE(id!, editingWpeId), {
            method: 'PATCH',
            body: JSON.stringify(body),
          })
        : apiClient(ENDPOINTS.WORKER_PAY_ELEMENTS.ASSIGN(id!), {
            method: 'POST',
            body: JSON.stringify(body),
          });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker-pay-elements', id] });
      toast.success(editingWpeId ? 'Pay element updated' : 'Pay element assigned');
      setAssignWpeOpen(false);
      setWpeForm(blankWpeForm);
      setEditingWpeId(null);
    },
    // Includes date-overlap conflicts (409) - the backend's message names the
    // exact conflicting assignment and how to resolve it, worth showing in full.
    onError: (err) =>
      toast.error(
        editingWpeId ? 'Failed to update pay element' : 'Failed to assign pay element',
        err instanceof Error ? err.message : undefined,
      ),
  });

  function openEditWpe(wpe: BackendWorkerPayElement) {
    setEditingWpeId(wpe.id);
    setWpeForm({
      payElementId: wpe.payElementId,
      calculationMethod: wpe.calculationMethod,
      amount: wpe.amountMinor != null ? String(parseInt(wpe.amountMinor, 10) / 100) : '',
      percentage: wpe.percentage != null ? String(wpe.percentage) : '',
      formulaOverride: wpe.formulaOverride ?? '',
      effectiveDate: wpe.effectiveDate,
      endDate: wpe.endDate ?? '',
      remarks: wpe.remarks ?? '',
    });
    setAssignWpeOpen(true);
  }

  // Unassigning only flips the old row to inactive (it's kept, not deleted) -
  // the backend has no unique constraint blocking a fresh assign() for the
  // same worker+pay element pair, so "reassign" is just opening the Assign
  // modal pre-filled from the old row, minus its now-stale effective/end
  // dates. editingWpeId stays null so submit POSTs a new assignment instead
  // of PATCHing the old (inactive) one.
  function openReassignWpe(wpe: BackendWorkerPayElement) {
    setEditingWpeId(null);
    setWpeForm({
      payElementId: wpe.payElementId,
      calculationMethod: wpe.calculationMethod,
      amount: wpe.amountMinor != null ? String(parseInt(wpe.amountMinor, 10) / 100) : '',
      percentage: wpe.percentage != null ? String(wpe.percentage) : '',
      formulaOverride: wpe.formulaOverride ?? '',
      effectiveDate: '',
      endDate: '',
      remarks: '',
    });
    setAssignWpeOpen(true);
  }

  const unassignPayElementMutation = useMutation({
    mutationFn: (wpeId: string) =>
      apiClient(ENDPOINTS.WORKER_PAY_ELEMENTS.UNASSIGN(id!, wpeId), { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker-pay-elements', id] });
      toast.success('Pay element unassigned');
      setUnassignTarget(null);
    },
    onError: (err) => toast.error('Failed to unassign pay element', err instanceof Error ? err.message : undefined),
  });

  const addCompensationMutation = useMutation({
    mutationFn: () => {
      // Build breakdown object from components
      const breakdown = compForm.breakdownComponents.length > 0
        ? compForm.breakdownComponents.reduce((acc, comp) => {
            if (comp.label && comp.amount) {
              acc[comp.label] = parseFloat(comp.amount);
            }
            return acc;
          }, {} as Record<string, number>)
        : undefined;

      return apiClient(ENDPOINTS.COMPENSATION.CREATE, {
        method: 'POST',
        body: JSON.stringify({
          workerId: id!,
          amountMinor: Math.round(parseFloat(compForm.amount) * 100),
          currency: compForm.currency,
          salaryType: compForm.salaryType as CreateCompensationRequest['salaryType'],
          payFrequency: compForm.payFrequency as CreateCompensationRequest['payFrequency'],
          effectiveDate: compForm.effectiveDate,
          expiryDate: compForm.expiryDate || undefined,
          notes: compForm.notes || undefined,
          breakdown,
        } satisfies CreateCompensationRequest),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker-compensations', id] });
      toast.success('Compensation added');
      setAddCompOpen(false);
      setCompForm(blankCompForm);
    },
    onError: (err) => toast.error('Failed to add compensation', err instanceof Error ? err.message : undefined),
  });

  // UpdateCompensationDto is a full PartialType of create, so any field is
  // editable - useful for fixing a data-entry mistake without creating a
  // confusing extra supersession record in the history.
  const [editCompTarget, setEditCompTarget] = useState<Compensation | null>(null);
  const [editCompForm, setEditCompForm] = useState(blankCompForm);
  const [voidCompTarget, setVoidCompTarget] = useState<Compensation | null>(null);
  const [voidReason, setVoidReason] = useState('');
  
  const editCompensationMutation = useMutation({
    mutationFn: () => {
      // Build breakdown object from components
      const breakdown = editCompForm.breakdownComponents.length > 0
        ? editCompForm.breakdownComponents.reduce((acc, comp) => {
            if (comp.label && comp.amount) {
              acc[comp.label] = parseFloat(comp.amount);
            }
            return acc;
          }, {} as Record<string, number>)
        : undefined;

      return apiClient(ENDPOINTS.COMPENSATION.UPDATE(editCompTarget!.id), {
        method: 'PATCH',
        body: JSON.stringify({
          amountMinor: Math.round(parseFloat(editCompForm.amount) * 100),
          currency: editCompForm.currency,
          salaryType: editCompForm.salaryType as CreateCompensationRequest['salaryType'],
          payFrequency: editCompForm.payFrequency as CreateCompensationRequest['payFrequency'],
          effectiveDate: editCompForm.effectiveDate,
          expiryDate: editCompForm.expiryDate || undefined,
          notes: editCompForm.notes || undefined,
          breakdown,
        } satisfies Partial<CreateCompensationRequest>),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker-compensations', id] });
      toast.success('Compensation updated');
      setEditCompTarget(null);
    },
    onError: (err) => toast.error('Failed to update compensation', err instanceof Error ? err.message : undefined),
  });

  const voidCompensationMutation = useMutation({
    mutationFn: () => {
      return apiClient(ENDPOINTS.COMPENSATION.VOID(voidCompTarget!.id), {
        method: 'PATCH',
        body: JSON.stringify({ reason: voidReason || undefined }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker-compensations', id] });
      toast.success('Compensation voided');
      setVoidCompTarget(null);
      setVoidReason('');
    },
    onError: (err) => toast.error('Failed to void compensation', err instanceof Error ? err.message : undefined),
  });

  function openEditCompensation(comp: Compensation) {
    // Parse breakdown back into components array
    const breakdownComponents: Array<{ label: string; amount: string }> = [];
    if (comp.breakdown && typeof comp.breakdown === 'object') {
      Object.entries(comp.breakdown).forEach(([label, amount]) => {
        if (typeof amount === 'number') {
          breakdownComponents.push({ label, amount: String(amount) });
        }
      });
    }

    setEditCompTarget(comp);
    setEditCompForm({
      amount: String(comp.grossSalary),
      currency: comp.currency,
      salaryType: comp.salaryType ?? 'fixed',
      payFrequency: comp.payFrequency ?? 'monthly',
      effectiveDate: comp.effectiveFrom.slice(0, 10),
      expiryDate: comp.effectiveTo ? comp.effectiveTo.slice(0, 10) : '',
      notes: comp.notes ?? '',
      breakdownComponents,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !employee) {
    return <ErrorState onRetry={refetch} />;
  }

  const fullName = `${employee.firstName} ${employee.lastName}`;
  
  // Build breadcrumb with legal entity if available
  const breadcrumbs = legalEntity
    ? [
        { label: legalEntity.name, path: '/organisation/legal-entities' },
        { label: 'Employees', path: '/employees' },
        { label: fullName },
      ]
    : [
        { label: 'Employees', path: '/employees' },
        { label: fullName },
      ];

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title={fullName}
        breadcrumbs={breadcrumbs}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(`/employees/${id}/edit`)}>
              <Pencil size={15} />
              Edit
            </Button>
            {canWriteWorker && employee.status === 'active' && (
              <Button variant="danger" onClick={() => setTerminateModalOpen(true)}>
                <X size={15} />
                Terminate
              </Button>
            )}
          </div>
        }
      />

      {/* Employee card */}
      <div className="bg-white rounded-xl border border-mint-light p-6 mb-6 flex flex-wrap items-center gap-5">
        <Avatar name={fullName} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-deep-cash">{fullName}</h2>
            <Badge
              variant={statusVariant[employee.status] ?? 'info'}
              label={statusLabel[employee.status] ?? employee.status}
            />
          </div>
          <p className="text-sm text-cash-green mt-0.5">{employee.email}</p>
          <p className="text-xs text-cash-green/60 mt-1 font-mono">{employee.employeeNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-cash-green/60">Joined</p>
          <p className="text-sm font-medium text-deep-cash">{formatDate(employee.createdAt)}</p>
        </div>
      </div>

      {/* No bank details warning */}
      {!employee.bankName && (
        <div className="flex items-start gap-3 p-4 bg-cash-gold/10 border border-cash-gold/30 rounded-lg mb-6">
          <AlertCircle size={18} className="text-cash-gold shrink-0 mt-0.5" />
          <p className="text-sm text-deep-cash">
            No bank details on file. Salary cannot be disbursed until bank information is added.
          </p>
        </div>
      )}

      <Tabs tabs={TABS} activeTab={tab} onChange={setTab} className="mb-6" />

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="grid gap-6">
          <div className="bg-white rounded-xl border border-mint-light p-6">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-cash-green" />
              <h3 className="text-sm font-semibold text-deep-cash">Personal Information</h3>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <dt className="text-cash-green/60">Full Name</dt>
              <dd className="text-deep-cash font-medium">{fullName}</dd>
              <dt className="text-cash-green/60">Email</dt>
              <dd className="text-deep-cash">{employee.email}</dd>
              <dt className="text-cash-green/60">Phone</dt>
              <dd className="text-deep-cash">{employee.phone}</dd>
              <dt className="text-cash-green/60">Date of Birth</dt>
              <dd className="text-deep-cash">{formatDate(employee.dateOfBirth)}</dd>
              {employee.gender && (
                <>
                  <dt className="text-cash-green/60">Gender</dt>
                  <dd className="text-deep-cash capitalize">{employee.gender.replace(/_/g, ' ')}</dd>
                </>
              )}
              <dt className="text-cash-green/60">National ID</dt>
              <dd className="text-deep-cash font-mono text-xs">
                {employee.nationalId === '****' ? 'Protected' : employee.nationalId}
              </dd>
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-mint-light p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={16} className="text-cash-green" />
              <h3 className="text-sm font-semibold text-deep-cash">Bank Details</h3>
            </div>
            {!employee.bankName ? (
              <p className="text-sm text-cash-green/60">No bank details on file.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-4 rounded-lg border border-fresh-cash/40 bg-mint-light/30">
                  <div>
                    <p className="text-sm font-medium text-deep-cash">{employee.bankName}</p>
                    <p className="text-xs text-cash-green font-mono mt-0.5">
                      {employee.bankAccount === '****' ? 'Protected' : employee.bankAccount}
                    </p>
                  </div>
                  <Badge variant="success" label="Primary" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compensation tab */}
      {tab === 'compensation' && (
        <div className="bg-white rounded-xl border border-mint-light p-6">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-cash-green" />
              <h3 className="text-sm font-semibold text-deep-cash">Compensation History</h3>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setAddCompOpen(true)}>
              <Plus size={14} />
              Add Compensation
            </Button>
          </div>
          {!compensations ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : compensations.length === 0 ? (
            <p className="text-sm text-cash-green/60">No compensation records found.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-mint-light" />
              <div className="flex flex-col gap-4">
                {[...compensations]
                  .sort((a, b) => {
                    // Sort: voided last, then by effectiveFrom descending
                    if (a.voidedAt && !b.voidedAt) return 1;
                    if (!a.voidedAt && b.voidedAt) return -1;
                    return new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime();
                  })
                  .map((comp) => (
                  <div key={comp.id} className="relative pl-10">
                    <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                      comp.voidedAt 
                        ? 'border-red-400 bg-red-100'
                        : !comp.effectiveTo 
                        ? 'border-fresh-cash bg-fresh-cash' 
                        : 'border-mint-light bg-white'
                    }`} />
                    <div className={`bg-soft-white rounded-lg p-4 border ${
                      comp.voidedAt ? 'border-red-200 bg-red-50/30' : 'border-mint-light'
                    }`}>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <MoneyDisplay amount={comp.grossSalary} currency={comp.currency} size="md" />
                        <div className="flex items-center gap-2">
                          {comp.voidedAt ? (
                            <Badge variant="error" label="VOIDED" />
                          ) : !comp.effectiveTo ? (
                            <Badge variant="success" label="Current" />
                          ) : null}
                          {canWritePayElements && !comp.voidedAt && (
                            <>
                              <button
                                onClick={() => openEditCompensation(comp)}
                                className="p-1 rounded hover:bg-mint-light text-cash-green transition-colors"
                                title="Edit"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => setVoidCompTarget(comp)}
                                className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                title="Void (entered in error)"
                              >
                                <X size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {comp.voidedAt && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                          <p className="text-red-700 font-medium">
                            Voided on {formatDate(comp.voidedAt)}
                          </p>
                          {comp.voidReason && (
                            <p className="text-red-600 mt-0.5">Reason: {comp.voidReason}</p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-cash-green/60 mt-1">
                        {formatDate(comp.effectiveFrom)}
                        {comp.effectiveTo ? ` — ${formatDate(comp.effectiveTo)}` : ' — present'}
                      </p>
                      <p className="text-xs text-cash-green/50 mt-0.5 capitalize">
                        {comp.currency} · {comp.payFrequency ? `${comp.payFrequency} gross` : 'Gross'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pay Elements tab */}
      {tab === 'payElements' && (
        <div className="bg-white rounded-xl border border-mint-light p-6">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-cash-green" />
              <h3 className="text-sm font-semibold text-deep-cash">Assigned Pay Elements</h3>
            </div>
            {canWritePayElements && (
              <Button variant="secondary" size="sm" disabled={hasNoPayElements} onClick={() => setAssignWpeOpen(true)}>
                <Plus size={14} />
                Assign Pay Element
              </Button>
            )}
          </div>

          {/* BASIC_SALARY Info Note */}
          <div className="flex items-start gap-3 p-4 bg-mint-light/30 border border-mint-light rounded-lg mb-4">
            <div>
              <p className="text-sm font-semibold text-deep-cash mb-1">BASIC_SALARY is auto-managed</p>
              <p className="text-sm text-cash-green">
                Basic salary is automatically pulled from the employee's compensation record during payroll calculations.
                You don't need to manually assign it here. Use this tab to assign additional allowances, deductions, or benefits.
              </p>
            </div>
          </div>

          {canWritePayElements && hasNoPayElements && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-deep-cash">
                No pay elements exist for this tenant yet, so there's nothing to assign. Create allowances,
                deductions, or benefits under{' '}
                <a href="/payroll/pay-elements" className="text-fresh-cash underline">Payroll → Pay Elements</a>{' '}
                first.
              </p>
            </div>
          )}

          {!workerPayElements ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : workerPayElements.length === 0 ? (
            <p className="text-sm text-cash-green/60">
              No pay elements assigned yet. Allowances and deductions defined in Payroll → Pay
              Elements have to be assigned to this employee here before they apply.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {workerPayElements.map((wpe) => (
                <div key={wpe.id} className="flex items-start justify-between gap-3 p-4 rounded-lg border border-mint-light bg-soft-white flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-deep-cash text-sm">
                        {wpe.payElement?.name ?? wpe.payElementId}
                      </p>
                      <Badge variant={wpeStatusVariant[wpe.status] ?? 'info'} label={wpe.status} />
                    </div>
                    <p className="text-xs text-cash-green/70 mt-1">
                      {wpe.calculationMethod === 'fixed' && wpe.amountMinor != null && (
                        <MoneyDisplay amount={parseInt(wpe.amountMinor, 10) / 100} currency="NGN" size="sm" />
                      )}
                      {(wpe.calculationMethod === 'percentage_of_basic' || wpe.calculationMethod === 'percentage_of_gross') && wpe.percentage != null && (
                        <span>{wpe.percentage}% of {wpe.calculationMethod === 'percentage_of_basic' ? 'basic' : 'gross'}</span>
                      )}
                      {wpe.calculationMethod === 'formula' && (
                        <span className="font-mono">{wpe.formulaOverride || 'Uses pay element default formula'}</span>
                      )}
                    </p>
                    <p className="text-xs text-cash-green/50 mt-1">
                      {formatDate(wpe.effectiveDate)}
                      {wpe.endDate ? ` — ${formatDate(wpe.endDate)}` : ' — ongoing'}
                    </p>
                    {wpe.remarks && <p className="text-xs text-cash-green/50 mt-0.5">{wpe.remarks}</p>}
                  </div>
                  {canWritePayElements && wpe.status === 'active' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEditWpe(wpe)}>
                        <Pencil size={13} />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUnassignTarget(wpe)}
                      >
                        <X size={13} className="text-red-400" />
                        Unassign
                      </Button>
                    </div>
                  )}
                  {canWritePayElements && wpe.status !== 'active' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openReassignWpe(wpe)}>
                        <Layers size={13} />
                        Reassign
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payslips tab */}
      {tab === 'payslips' && (
        <div className="bg-white rounded-xl border border-mint-light overflow-hidden">
          {!payslips ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : payslips.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-cash-green/60">No payslips found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mint-light bg-soft-white">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Period</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Pay Group</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Gross</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Net</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((slip) => (
                    <tr key={slip.id} className="border-b border-mint-light/50 hover:bg-soft-white transition-colors">
                      <td className="px-5 py-3 font-medium text-deep-cash whitespace-nowrap">{formatPeriod(slip.period)}</td>
                      <td className="px-5 py-3 text-cash-green whitespace-nowrap">{slip.payGroupName}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <MoneyDisplay amount={slip.grossPay} currency={slip.currency} size="sm" />
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <MoneyDisplay amount={slip.netPay} currency={slip.currency} size="sm" />
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => navigate(PATHS.PAYSLIP_VIEWER(slip.payRunId, slip.id))}
                          className="text-xs text-fresh-cash hover:text-cash-green underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={addCompOpen}
        onClose={() => { setAddCompOpen(false); setCompForm(blankCompForm); }}
        title="Add Compensation"
        size="md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">
            This supersedes the current compensation record going forward — the old
            one stays in history with an end date, nothing is overwritten.
          </p>
          <Input
            label="Total Amount"
            type="number"
            value={compForm.amount}
            onChange={(e) => setCompForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="e.g. 500000"
            hint="Total gross salary amount"
          />
          
          {/* Salary Breakdown Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-cash-green font-medium">
                Salary Breakdown (Optional)
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCompForm((f) => ({
                  ...f,
                  breakdownComponents: [...f.breakdownComponents, { label: '', amount: '' }],
                }))}
              >
                <Plus size={14} />
                Add Component
              </Button>
            </div>
            {compForm.breakdownComponents.length > 0 && (
              <div className="flex flex-col gap-2 p-3 bg-soft-white rounded-lg border border-mint-light">
                {compForm.breakdownComponents.map((comp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Basic Salary"
                      className="flex-1 bg-white border border-mint-light rounded-md px-3 py-2 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                      value={comp.label}
                      onChange={(e) => {
                        const updated = [...compForm.breakdownComponents];
                        updated[idx].label = e.target.value;
                        setCompForm((f) => ({ ...f, breakdownComponents: updated }));
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      className="w-32 bg-white border border-mint-light rounded-md px-3 py-2 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                      value={comp.amount}
                      onChange={(e) => {
                        const updated = [...compForm.breakdownComponents];
                        updated[idx].amount = e.target.value;
                        setCompForm((f) => ({ ...f, breakdownComponents: updated }));
                      }}
                    />
                    <button
                      onClick={() => {
                        const updated = compForm.breakdownComponents.filter((_, i) => i !== idx);
                        setCompForm((f) => ({ ...f, breakdownComponents: updated }));
                      }}
                      className="p-2 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {compForm.breakdownComponents.length === 0 && (
              <p className="text-xs text-cash-green/60 mt-1">
                Break down the salary into components like Basic, Housing, Transport, etc.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Currency"
              value={compForm.currency}
              onChange={(e) => setCompForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              placeholder="NGN"
            />
            <Select
              label="Salary Type"
              value={compForm.salaryType}
              options={SALARY_TYPE_OPTIONS}
              onChange={(v) => setCompForm((f) => ({ ...f, salaryType: v }))}
            />
          </div>
          
          <Select
            label="Pay Frequency"
            value={compForm.payFrequency}
            options={PAY_FREQUENCY_OPTIONS}
            onChange={(v) => setCompForm((f) => ({ ...f, payFrequency: v }))}
          />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-cash-green font-medium mb-1">Effective From</p>
              <input
                type="date"
                className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                value={compForm.effectiveDate}
                onChange={(e) => setCompForm((f) => ({ ...f, effectiveDate: e.target.value }))}
              />
            </div>
            <div>
              <p className="text-sm text-cash-green font-medium mb-1">Expiry Date (Optional)</p>
              <input
                type="date"
                className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                value={compForm.expiryDate}
                onChange={(e) => setCompForm((f) => ({ ...f, expiryDate: e.target.value }))}
              />
            </div>
          </div>
          
          <div>
            <p className="text-sm text-cash-green font-medium mb-1">Notes (Optional)</p>
            <textarea
              className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
              rows={2}
              value={compForm.notes}
              onChange={(e) => setCompForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Annual salary review increase"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setAddCompOpen(false); setCompForm(blankCompForm); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={addCompensationMutation.isPending}
              disabled={!compForm.amount || !compForm.effectiveDate}
              onClick={() => addCompensationMutation.mutate()}
            >
              Add Compensation
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!editCompTarget}
        onClose={() => setEditCompTarget(null)}
        title="Edit Compensation"
        size="md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">
            Corrects this record directly — use this for a data-entry mistake, not for a raise (add a
            new Compensation record for that instead, so history stays accurate).
          </p>
          <Input
            label="Total Amount"
            type="number"
            value={editCompForm.amount}
            onChange={(e) => setEditCompForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="e.g. 500000"
            hint="Total gross salary amount"
          />
          
          {/* Salary Breakdown Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-cash-green font-medium">
                Salary Breakdown (Optional)
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditCompForm((f) => ({
                  ...f,
                  breakdownComponents: [...f.breakdownComponents, { label: '', amount: '' }],
                }))}
              >
                <Plus size={14} />
                Add Component
              </Button>
            </div>
            {editCompForm.breakdownComponents.length > 0 && (
              <div className="flex flex-col gap-2 p-3 bg-soft-white rounded-lg border border-mint-light">
                {editCompForm.breakdownComponents.map((comp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Basic Salary"
                      className="flex-1 bg-white border border-mint-light rounded-md px-3 py-2 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                      value={comp.label}
                      onChange={(e) => {
                        const updated = [...editCompForm.breakdownComponents];
                        updated[idx].label = e.target.value;
                        setEditCompForm((f) => ({ ...f, breakdownComponents: updated }));
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      className="w-32 bg-white border border-mint-light rounded-md px-3 py-2 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                      value={comp.amount}
                      onChange={(e) => {
                        const updated = [...editCompForm.breakdownComponents];
                        updated[idx].amount = e.target.value;
                        setEditCompForm((f) => ({ ...f, breakdownComponents: updated }));
                      }}
                    />
                    <button
                      onClick={() => {
                        const updated = editCompForm.breakdownComponents.filter((_, i) => i !== idx);
                        setEditCompForm((f) => ({ ...f, breakdownComponents: updated }));
                      }}
                      className="p-2 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {editCompForm.breakdownComponents.length === 0 && (
              <p className="text-xs text-cash-green/60 mt-1">
                Break down the salary into components like Basic, Housing, Transport, etc.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Currency"
              value={editCompForm.currency}
              onChange={(e) => setEditCompForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              placeholder="NGN"
            />
            <Select
              label="Salary Type"
              value={editCompForm.salaryType}
              options={SALARY_TYPE_OPTIONS}
              onChange={(v) => setEditCompForm((f) => ({ ...f, salaryType: v }))}
            />
          </div>
          
          <Select
            label="Pay Frequency"
            value={editCompForm.payFrequency}
            options={PAY_FREQUENCY_OPTIONS}
            onChange={(v) => setEditCompForm((f) => ({ ...f, payFrequency: v }))}
          />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-cash-green font-medium mb-1">Effective From</p>
              <input
                type="date"
                className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                value={editCompForm.effectiveDate}
                onChange={(e) => setEditCompForm((f) => ({ ...f, effectiveDate: e.target.value }))}
              />
            </div>
            <div>
              <p className="text-sm text-cash-green font-medium mb-1">Expiry Date (Optional)</p>
              <input
                type="date"
                className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                value={editCompForm.expiryDate}
                onChange={(e) => setEditCompForm((f) => ({ ...f, expiryDate: e.target.value }))}
              />
            </div>
          </div>
          
          <div>
            <p className="text-sm text-cash-green font-medium mb-1">Notes (Optional)</p>
            <textarea
              className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
              rows={2}
              value={editCompForm.notes}
              onChange={(e) => setEditCompForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Correcting data entry error"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditCompTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={editCompensationMutation.isPending}
              disabled={!editCompForm.amount || !editCompForm.effectiveDate}
              onClick={() => editCompensationMutation.mutate()}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={assignWpeOpen}
        onClose={() => { setAssignWpeOpen(false); setWpeForm(blankWpeForm); setEditingWpeId(null); }}
        title={editingWpeId ? 'Edit Pay Element' : 'Assign Pay Element'}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Select
            label="Pay Element"
            value={wpeForm.payElementId}
            options={(payElementCatalog ?? [])
              .filter((pe) => pe.isActive && pe.code !== 'BASIC_SALARY')  // Filter out BASIC_SALARY
              .map((pe) => ({ value: pe.id, label: `${pe.code} — ${pe.name}` }))}
            onChange={(v) => setWpeForm((f) => ({ ...f, payElementId: v }))}
            placeholder={payElementCatalog ? 'Select a pay element' : 'Loading...'}
          />
          <Select
            label="Calculation Method"
            value={wpeForm.calculationMethod}
            options={CALCULATION_METHOD_OPTIONS}
            onChange={(v) => setWpeForm((f) => ({ ...f, calculationMethod: v as BackendCalculationMethod }))}
          />
          {wpeForm.calculationMethod === 'fixed' && (
            <Input
              label="Amount"
              type="number"
              value={wpeForm.amount}
              onChange={(e) => setWpeForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 50000"
            />
          )}
          {(wpeForm.calculationMethod === 'percentage_of_basic' || wpeForm.calculationMethod === 'percentage_of_gross') && (
            <Input
              label="Percentage"
              type="number"
              value={wpeForm.percentage}
              onChange={(e) => setWpeForm((f) => ({ ...f, percentage: e.target.value }))}
              placeholder="e.g. 30"
            />
          )}
          {wpeForm.calculationMethod === 'formula' && (
            <Input
              label="Formula override (optional)"
              value={wpeForm.formulaOverride}
              onChange={(e) => setWpeForm((f) => ({ ...f, formulaOverride: e.target.value }))}
              placeholder="Leave blank to use the pay element's default formula"
            />
          )}
          <div>
            <p className="text-sm text-cash-green font-medium mb-1">Effective from</p>
            <input
              type="date"
              className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
              value={wpeForm.effectiveDate}
              onChange={(e) => setWpeForm((f) => ({ ...f, effectiveDate: e.target.value }))}
            />
          </div>
          <div>
            <p className="text-sm text-cash-green font-medium mb-1">End date (optional)</p>
            <input
              type="date"
              className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
              value={wpeForm.endDate}
              onChange={(e) => setWpeForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <Input
            label="Remarks (optional)"
            value={wpeForm.remarks}
            onChange={(e) => setWpeForm((f) => ({ ...f, remarks: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setAssignWpeOpen(false); setWpeForm(blankWpeForm); setEditingWpeId(null); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={assignPayElementMutation.isPending}
              disabled={
                !wpeForm.payElementId ||
                !wpeForm.effectiveDate ||
                (wpeForm.calculationMethod === 'fixed' && !wpeForm.amount) ||
                ((wpeForm.calculationMethod === 'percentage_of_basic' || wpeForm.calculationMethod === 'percentage_of_gross') && !wpeForm.percentage)
              }
              onClick={() => assignPayElementMutation.mutate()}
            >
              {editingWpeId ? 'Save Changes' : 'Assign'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={terminateModalOpen}
        onClose={() => { setTerminateModalOpen(false); setTerminationDate(''); setTerminationReason(''); }}
        title="Terminate Employee"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">
            This ends {employee.firstName}'s employment record. Their status moves to Inactive.
          </p>
          <div>
            <p className="text-sm text-cash-green font-medium mb-1">Termination date</p>
            <input
              type="date"
              className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
            />
          </div>
          <Input
            label="Reason (optional)"
            value={terminationReason}
            onChange={(e) => setTerminationReason(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => { setTerminateModalOpen(false); setTerminationDate(''); setTerminationReason(''); }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={terminateMutation.isPending}
              disabled={!terminationDate}
              onClick={() => terminateMutation.mutate()}
            >
              Terminate
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!unassignTarget}
        onClose={() => setUnassignTarget(null)}
        onConfirm={() => unassignTarget && unassignPayElementMutation.mutate(unassignTarget.id)}
        title="Unassign Pay Element"
        message={`Are you sure you want to unassign "${unassignTarget?.payElement?.name ?? 'this pay element'}" from ${employee?.firstName ?? 'this worker'}? This can be reassigned later if needed.`}
        confirmLabel="Unassign"
        variant="danger"
        isLoading={unassignPayElementMutation.isPending}
      />

      <Modal
        isOpen={!!voidCompTarget}
        onClose={() => { setVoidCompTarget(null); setVoidReason(''); }}
        title="Void Compensation Record"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>Warning:</strong> This marks the record as entered in error and removes it from salary history. 
              Use this only for data entry mistakes, not for salary changes.
            </p>
          </div>
          <div>
            <p className="text-sm text-cash-green/70 mb-2">
              Voiding compensation: <strong>₦{voidCompTarget?.grossSalary.toLocaleString()}</strong>
            </p>
            <p className="text-xs text-cash-green/60">
              Effective: {voidCompTarget && formatDate(voidCompTarget.effectiveFrom)}
              {voidCompTarget?.effectiveTo && ` — ${formatDate(voidCompTarget.effectiveTo)}`}
            </p>
          </div>
          <Input
            label="Reason (optional)"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="e.g. Wrong amount entered, duplicate entry"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => { setVoidCompTarget(null); setVoidReason(''); }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={voidCompensationMutation.isPending}
              onClick={() => voidCompensationMutation.mutate()}
            >
              Void Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
