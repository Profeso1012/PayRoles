import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, AlertCircle, CreditCard, User, Briefcase, Receipt, Plus, Layers, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { mapWorkerFields } from '@/lib/api/transforms';
import { formatDate, formatPeriod } from '@/lib/utils';
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
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { Employee, EmployeeAssignment, Compensation } from '@contracts/types/employee';
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

const TAB_IDS = ['profile', 'assignments', 'compensation', 'payElements', 'payslips'];

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'assignments', label: 'Assignments' },
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
  const [tab, setTab] = useState('profile');
  const [addCompOpen, setAddCompOpen] = useState(false);
  const [compForm, setCompForm] = useState(blankCompForm);
  const [assignWpeOpen, setAssignWpeOpen] = useState(false);
  const [wpeForm, setWpeForm] = useState(blankWpeForm);
  const [editingWpeId, setEditingWpeId] = useState<string | null>(null);

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

  // Note: Backend doesn't have assignments endpoint yet
  // Using mock endpoint for now, will fallback gracefully
  const { data: assignments } = useQuery<EmployeeAssignment[]>({
    queryKey: ['worker-assignments', id],
    queryFn: async () => {
      try {
        return await apiClient<EmployeeAssignment[]>(`/employees/${id}/assignments`);
      } catch {
        // Backend doesn't have this endpoint yet
        return [];
      }
    },
    enabled: !!id && tab === 'assignments',
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
    queryFn: () => apiClient<Payslip[]>(ENDPOINTS.WORKERS.PAYSLIPS(id!)),
    enabled: !!id && tab === 'payslips',
  });

  const { data: workerPayElements } = useQuery<BackendWorkerPayElement[]>({
    queryKey: ['worker-pay-elements', id],
    queryFn: async () => {
      const response = await apiClient<any>(ENDPOINTS.WORKER_PAY_ELEMENTS.LIST(id!));
      return Array.isArray(response) ? response : (response.data || []);
    },
    enabled: !!id && tab === 'payElements',
  });

  // Catalog of tenant-wide pay element definitions, only needed to populate the assign modal's picker.
  const { data: payElementCatalog } = useQuery<BackendPayElement[]>({
    queryKey: ['pay-elements'],
    queryFn: async () => {
      const response = await apiClient<any>(ENDPOINTS.PAY_ELEMENTS.LIST);
      return Array.isArray(response) ? response : (response.data || []);
    },
    enabled: assignWpeOpen,
  });

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

  const unassignPayElementMutation = useMutation({
    mutationFn: (wpeId: string) =>
      apiClient(ENDPOINTS.WORKER_PAY_ELEMENTS.UNASSIGN(id!, wpeId), { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker-pay-elements', id] });
      toast.success('Pay element unassigned');
    },
    onError: (err) => toast.error('Failed to unassign pay element', err instanceof Error ? err.message : undefined),
  });

  const addCompensationMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.COMPENSATION.CREATE, {
        method: 'POST',
        body: JSON.stringify({
          workerId: id!,
          amountMinor: Math.round(parseFloat(compForm.amount) * 100),
          currency: compForm.currency,
          salaryType: compForm.salaryType as CreateCompensationRequest['salaryType'],
          payFrequency: compForm.payFrequency as CreateCompensationRequest['payFrequency'],
          effectiveDate: compForm.effectiveDate,
        } satisfies CreateCompensationRequest),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker-compensations', id] });
      toast.success('Compensation added');
      setAddCompOpen(false);
      setCompForm(blankCompForm);
    },
    onError: (err) => toast.error('Failed to add compensation', err instanceof Error ? err.message : undefined),
  });

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

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title={fullName}
        breadcrumbs={[
          { label: 'Employees', path: '/employees' },
          { label: fullName },
        ]}
        action={
          <Button variant="secondary" onClick={() => navigate(`/employees/${id}/edit`)}>
            <Pencil size={15} />
            Edit
          </Button>
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

      {/* Assignments tab */}
      {tab === 'assignments' && (
        <div className="bg-white rounded-xl border border-mint-light p-6">
          <div className="flex items-center gap-2 mb-5">
            <Briefcase size={16} className="text-cash-green" />
            <h3 className="text-sm font-semibold text-deep-cash">Assignment History</h3>
          </div>
          {!assignments ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-cash-green/60">No assignments found.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-mint-light" />
              <div className="flex flex-col gap-4">
                {[...assignments].reverse().map((asn) => (
                  <div key={asn.id} className="relative pl-10">
                    <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                      !asn.effectiveTo ? 'border-fresh-cash bg-fresh-cash' : 'border-mint-light bg-white'
                    }`} />
                    <div className="bg-soft-white rounded-lg p-4 border border-mint-light">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-semibold text-deep-cash text-sm">{asn.jobTitle}</p>
                          <p className="text-xs text-cash-green/70 mt-0.5 capitalize">
                            {asn.employmentType.replace(/_/g, ' ')}
                          </p>
                        </div>
                        {!asn.effectiveTo && <Badge variant="success" label="Current" />}
                      </div>
                      <p className="text-xs text-cash-green/60 mt-2">
                        {formatDate(asn.effectiveFrom)}
                        {asn.effectiveTo ? ` — ${formatDate(asn.effectiveTo)}` : ' — present'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                {[...compensations].reverse().map((comp) => (
                  <div key={comp.id} className="relative pl-10">
                    <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                      !comp.effectiveTo ? 'border-fresh-cash bg-fresh-cash' : 'border-mint-light bg-white'
                    }`} />
                    <div className="bg-soft-white rounded-lg p-4 border border-mint-light">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <MoneyDisplay amount={comp.grossSalary} currency={comp.currency} size="md" />
                        {!comp.effectiveTo && <Badge variant="success" label="Current" />}
                      </div>
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
              <Button variant="secondary" size="sm" onClick={() => setAssignWpeOpen(true)}>
                <Plus size={14} />
                Assign Pay Element
              </Button>
            )}
          </div>
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
                        loading={unassignPayElementMutation.isPending}
                        onClick={() => unassignPayElementMutation.mutate(wpe.id)}
                      >
                        <X size={13} className="text-red-400" />
                        Unassign
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mint-light bg-soft-white">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-cash-green uppercase">Period</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-cash-green uppercase">Pay Group</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-cash-green uppercase">Gross</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-cash-green uppercase">Net</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {payslips.map((slip) => (
                  <tr key={slip.id} className="border-b border-mint-light/50 hover:bg-soft-white transition-colors">
                    <td className="px-5 py-3 font-medium text-deep-cash">{formatPeriod(slip.period)}</td>
                    <td className="px-5 py-3 text-cash-green">{slip.payGroupName}</td>
                    <td className="px-5 py-3 text-right">
                      <MoneyDisplay amount={slip.grossPay} currency={slip.currency} size="sm" />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <MoneyDisplay amount={slip.netPay} currency={slip.currency} size="sm" />
                    </td>
                    <td className="px-5 py-3 text-right">
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
          )}
        </div>
      )}

      <Modal
        isOpen={addCompOpen}
        onClose={() => { setAddCompOpen(false); setCompForm(blankCompForm); }}
        title="Add Compensation"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">
            This supersedes the current compensation record going forward — the old
            one stays in history with an end date, nothing is overwritten.
          </p>
          <Input
            label="Amount"
            type="number"
            value={compForm.amount}
            onChange={(e) => setCompForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="e.g. 500000"
          />
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
          <Select
            label="Pay Frequency"
            value={compForm.payFrequency}
            options={PAY_FREQUENCY_OPTIONS}
            onChange={(v) => setCompForm((f) => ({ ...f, payFrequency: v }))}
          />
          <div>
            <p className="text-sm text-cash-green font-medium mb-1">Effective from</p>
            <input
              type="date"
              className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
              value={compForm.effectiveDate}
              onChange={(e) => setCompForm((f) => ({ ...f, effectiveDate: e.target.value }))}
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
        isOpen={assignWpeOpen}
        onClose={() => { setAssignWpeOpen(false); setWpeForm(blankWpeForm); setEditingWpeId(null); }}
        title={editingWpeId ? 'Edit Pay Element' : 'Assign Pay Element'}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Select
            label="Pay Element"
            value={wpeForm.payElementId}
            options={(payElementCatalog ?? []).filter((pe) => pe.isActive).map((pe) => ({ value: pe.id, label: `${pe.code} — ${pe.name}` }))}
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
    </div>
  );
}
