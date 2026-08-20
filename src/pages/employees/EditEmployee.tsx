import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { apiClient, fetchAllPages } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { mapWorkerFields } from '@/lib/api/transforms';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import BankSelect from '@/components/ui/BankSelect';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import type { Employee } from '@contracts/types/employee';
import type { BackendWorker } from '@/lib/api/types';

interface LegalEntity {
  id: string;
  name: string;
  country: string;
  status: string;
}

type PersonalForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationalId: string;
  annualRent: string;
};

type EmploymentForm = {
  employeeNumber: string;
  position: string;
  department: string;
  legalEntityId: string;
  employmentType: string;
  hireDate: string;
  managerId: string;
};

type BankForm = {
  bankName: string;
  accountNumber: string;
  routingCode: string;
};

const STEPS = [
  { id: 0, label: 'Personal Details' },
  { id: 1, label: 'Employment' },
  { id: 2, label: 'Bank Details' },
  { id: 3, label: 'Review' },
];

const employmentTypeOptions = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'intern', label: 'Intern' },
];

export default function EditEmployee() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [step, setStep] = useState(0);

  const [personal, setPersonal] = useState<PersonalForm>({
    firstName: '', middleName: '', lastName: '', email: '', phone: '',
    dateOfBirth: '', nationalId: '', annualRent: '',
  });

  const [employment, setEmployment] = useState<EmploymentForm>({
    employeeNumber: '',
    position: '',
    department: '',
    legalEntityId: '',
    employmentType: 'full_time',
    hireDate: '',
    managerId: '',
  });

  const [bank, setBank] = useState<BankForm>({
    bankName: '', accountNumber: '', routingCode: '',
  });

  const { data: legalEntities } = useQuery<LegalEntity[]>({
    queryKey: ['legal-entities'],
    queryFn: async () => {
      const response = await apiClient<any>(ENDPOINTS.LEGAL_ENTITIES.LIST);
      return Array.isArray(response) ? response : (response.data || []);
    },
  });

  const leOptions = (legalEntities ?? [])
    .filter((le) => le.status !== 'inactive')
    .map((le) => ({ value: le.id, label: le.name }));

  // For the optional "Manager" picker - managerId is a real, accepted
  // UpdateWorkerDto field the form previously never collected at all.
  const { data: potentialManagers } = useQuery<BackendWorker[]>({
    queryKey: ['workers-all-active'],
    queryFn: () =>
      fetchAllPages<BackendWorker>((page) =>
        `${ENDPOINTS.WORKERS.LIST}?${buildPaginationParams({ page, limit: 100 })}&status=active`,
      ),
  });
  // A worker can't manage themself - exclude the one currently being edited.
  const managerOptions = (potentialManagers ?? [])
    .filter((w) => w.id !== id)
    .map((w) => ({ value: w.id, label: `${w.firstName} ${w.lastName}${w.position ? ` — ${w.position}` : ''}` }));

  const { data: employee, isLoading, isError, error, refetch } = useQuery<Employee>({
    queryKey: ['worker', id],
    queryFn: async () => {
      const worker = await apiClient<BackendWorker>(ENDPOINTS.WORKERS.DETAIL(id!));
      const mapped = mapWorkerFields(worker, 'toFrontend');
      return { ...mapped, status: mapped.status || 'active' } as Employee;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (employee) {
      setPersonal({
        firstName: employee.firstName || '',
        middleName: employee.middleName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        dateOfBirth: employee.dateOfBirth || '',
        nationalId: employee.nationalId === '****' ? '' : employee.nationalId || '',
        annualRent: employee.annualRentMinor ? String(parseInt(employee.annualRentMinor, 10) / 100) : '',
      });
      setEmployment({
        employeeNumber: employee.employeeNumber || '',
        position: employee.position || '',
        department: employee.department || '',
        legalEntityId: employee.legalEntityId || '',
        employmentType: employee.employmentType || 'full_time',
        hireDate: employee.hireDate?.slice(0, 10) || '',
        managerId: employee.managerId || '',
      });
      setBank({
        bankName: employee.bankName || '',
        accountNumber: employee.bankAccount === '****' ? '' : employee.bankAccount || '',
        routingCode: employee.bankRoutingCode || '',
      });
    }
  }, [employee]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string | number | undefined> = {
        firstName: personal.firstName,
        middleName: personal.middleName || undefined,
        lastName: personal.lastName,
        email: personal.email || undefined,
        phone: personal.phone || undefined,
        dateOfBirth: personal.dateOfBirth || undefined,
        annualRentMinor: personal.annualRent ? Math.round(parseFloat(personal.annualRent) * 100) : undefined,
        employeeNumber: employment.employeeNumber || undefined,
        position: employment.position || undefined,
        department: employment.department || undefined,
        legalEntityId: employment.legalEntityId || undefined,
        managerId: employment.managerId || undefined,
        employmentType: employment.employmentType || undefined,
        hireDate: employment.hireDate || undefined,
        bankName: bank.bankName || undefined,
        bankRoutingCode: bank.routingCode || undefined,
      };

      if (personal.nationalId) payload.nationalId = personal.nationalId;
      if (bank.accountNumber) payload.bankAccount = bank.accountNumber;

      return apiClient<BackendWorker>(ENDPOINTS.WORKERS.UPDATE(id!), {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker', id] });
      qc.invalidateQueries({ queryKey: ['workers-list'] });
      toast.success('Employee updated successfully');
      navigate(`/employees/${id}`);
    },
    onError: (err) => toast.error('Failed to update employee', err instanceof Error ? err.message : undefined),
  });

  const fieldClass =
    'w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors placeholder:text-cash-green/40';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !employee) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title={`Edit — ${employee.firstName} ${employee.lastName}`}
        breadcrumbs={[
          { label: 'Employees', path: '/employees' },
          { label: `${employee.firstName} ${employee.lastName}`, path: `/employees/${id}` },
          { label: 'Edit' },
        ]}
      />

      {/* Step progress */}
      <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center">
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    done
                      ? 'bg-fresh-cash text-white'
                      : active
                      ? 'bg-deep-cash text-white'
                      : 'bg-mint-light text-cash-green'
                  }`}
                >
                  {done ? <CheckCircle size={14} /> : s.id + 1}
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    active ? 'text-deep-cash' : done ? 'text-fresh-cash' : 'text-cash-green/60'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight size={16} className="text-mint-light mx-2 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 0: Personal Details */}
      {step === 0 && (
        <div className="bg-white rounded-xl border border-mint-light p-6">
          <h2 className="text-base font-semibold text-deep-cash mb-5">Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={personal.firstName}
              onChange={(e) => setPersonal((f) => ({ ...f, firstName: e.target.value }))}
            />
            <Input
              label="Last Name"
              value={personal.lastName}
              onChange={(e) => setPersonal((f) => ({ ...f, lastName: e.target.value }))}
            />
            <div className="col-span-2">
              <Input
                label="Middle Name (optional)"
                value={personal.middleName}
                onChange={(e) => setPersonal((f) => ({ ...f, middleName: e.target.value }))}
              />
            </div>
            <Input
              label="Email Address"
              value={personal.email}
              onChange={(e) => setPersonal((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Phone Number"
              value={personal.phone}
              onChange={(e) => setPersonal((f) => ({ ...f, phone: e.target.value }))}
            />
            <div>
              <p className="text-sm text-cash-green font-medium mb-1">Date of Birth</p>
              <input
                type="date"
                className={fieldClass}
                value={personal.dateOfBirth}
                onChange={(e) => setPersonal((f) => ({ ...f, dateOfBirth: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Input
                label="National ID (NIN)"
                value={personal.nationalId}
                onChange={(e) => setPersonal((f) => ({ ...f, nationalId: e.target.value }))}
                placeholder={employee.nationalId === '****' ? 'Protected - enter to replace' : ''}
              />
            </div>
            <div className="col-span-2">
              <p className="text-sm text-cash-green font-medium mb-1">Annual Rent Paid (₦, optional)</p>
              <input
                type="number"
                className={fieldClass}
                min={0}
                value={personal.annualRent}
                onChange={(e) => setPersonal((f) => ({ ...f, annualRent: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Employment */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-mint-light p-6">
          <h2 className="text-base font-semibold text-deep-cash mb-5">Employment Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Employee Number"
              value={employment.employeeNumber}
              onChange={(e) => setEmployment((f) => ({ ...f, employeeNumber: e.target.value }))}
            />
            <div>
              <p className="text-sm text-cash-green font-medium mb-1">Hire Date</p>
              <input
                type="date"
                className={fieldClass}
                value={employment.hireDate}
                onChange={(e) => setEmployment((f) => ({ ...f, hireDate: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Input
                label="Job Title / Position"
                value={employment.position}
                onChange={(e) => setEmployment((f) => ({ ...f, position: e.target.value }))}
              />
            </div>
            <Input
              label="Department (optional)"
              value={employment.department}
              onChange={(e) => setEmployment((f) => ({ ...f, department: e.target.value }))}
            />
            <div>
              <Select
                label="Legal Entity"
                value={employment.legalEntityId}
                options={leOptions}
                onChange={(v) => setEmployment((f) => ({ ...f, legalEntityId: v }))}
                placeholder="Select legal entity"
              />
              {leOptions.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  No active legal entities — go to{' '}
                  <a href="/organisation/legal-entities" className="underline">Organisation → Legal Entities</a>{' '}
                  to create or reactivate one before changing this.
                </p>
              )}
            </div>
            <Select
              label="Employment Type"
              value={employment.employmentType}
              options={employmentTypeOptions}
              onChange={(v) => setEmployment((f) => ({ ...f, employmentType: v }))}
            />
            <div className="col-span-2">
              <Select
                label="Manager (optional)"
                value={employment.managerId}
                options={managerOptions}
                onChange={(v) => setEmployment((f) => ({ ...f, managerId: v }))}
                placeholder="Select this employee's manager"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Bank Details */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-mint-light p-6">
          <h2 className="text-base font-semibold text-deep-cash mb-1">Bank Details</h2>
          <div className="flex flex-col gap-4 mt-5">
            <BankSelect
              label="Bank"
              bankName={bank.bankName}
              bankCode={bank.routingCode}
              onChange={(bankName, routingCode) => setBank((f) => ({ ...f, bankName, routingCode }))}
            />
            <Input
              label="Account Number"
              value={bank.accountNumber}
              onChange={(e) => setBank((f) => ({ ...f, accountNumber: e.target.value }))}
              placeholder={employee.bankAccount === '****' ? 'Protected - enter to replace' : '0123456789'}
            />
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-mint-light p-6 space-y-6">
          <h2 className="text-base font-semibold text-deep-cash">Review & Submit</h2>
          <div>
            <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-3">Personal</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-cash-green/60">Name</dt>
              <dd className="text-deep-cash font-medium">
                {personal.firstName} {personal.middleName} {personal.lastName}
              </dd>
              <dt className="text-cash-green/60">Email</dt>
              <dd className="text-deep-cash">{personal.email || '—'}</dd>
              <dt className="text-cash-green/60">Phone</dt>
              <dd className="text-deep-cash">{personal.phone || '—'}</dd>
              <dt className="text-cash-green/60">Date of Birth</dt>
              <dd className="text-deep-cash">{personal.dateOfBirth || '—'}</dd>
              <dt className="text-cash-green/60">National ID</dt>
              <dd className="text-deep-cash">{personal.nationalId ? 'Updated' : (employee?.nationalId === '****' ? 'Protected (Unchanged)' : '—')}</dd>
              <dt className="text-cash-green/60">Annual Rent</dt>
              <dd className="text-deep-cash">{personal.annualRent ? `₦${Number(personal.annualRent).toLocaleString()}` : '—'}</dd>
            </dl>
          </div>
          <div>
            <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-3">Employment</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-cash-green/60">Employee Number</dt>
              <dd className="text-deep-cash font-medium">{employment.employeeNumber || '—'}</dd>
              <dt className="text-cash-green/60">Hire Date</dt>
              <dd className="text-deep-cash">{employment.hireDate || '—'}</dd>
              <dt className="text-cash-green/60">Position</dt>
              <dd className="text-deep-cash font-medium">{employment.position || '—'}</dd>
              <dt className="text-cash-green/60">Department</dt>
              <dd className="text-deep-cash">{employment.department || '—'}</dd>
              <dt className="text-cash-green/60">Legal Entity</dt>
              <dd className="text-deep-cash">{leOptions.find(o => o.value === employment.legalEntityId)?.label || '—'}</dd>
              <dt className="text-cash-green/60">Employment Type</dt>
              <dd className="text-deep-cash">{employmentTypeOptions.find(o => o.value === employment.employmentType)?.label || '—'}</dd>
              <dt className="text-cash-green/60">Manager</dt>
              <dd className="text-deep-cash">{managerOptions.find(o => o.value === employment.managerId)?.label || '—'}</dd>
            </dl>
          </div>
          <div>
            <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-3">Bank Details</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-cash-green/60">Bank</dt>
              <dd className="text-deep-cash">{bank.bankName || '—'}</dd>
              <dt className="text-cash-green/60">Account</dt>
              <dd className="text-deep-cash font-mono">{bank.accountNumber ? 'Updated' : (employee?.bankAccount === '****' ? 'Protected (Unchanged)' : '—')}</dd>
            </dl>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={() => (step > 0 ? setStep((s) => s - 1) : navigate(`/employees/${id}`))}
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < 3 ? (
          <Button
            variant="primary"
            disabled={
              (step === 0 && (!personal.firstName || !personal.lastName)) ||
              (step === 1 && (!employment.employeeNumber || !employment.legalEntityId))
            }
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="primary"
            loading={updateMutation.isPending}
            disabled={!personal.firstName || !personal.lastName || !employment.employeeNumber || !employment.legalEntityId}
            onClick={() => updateMutation.mutate()}
          >
            Save Changes
          </Button>
        )}
      </div>
    </div>
  );
}
