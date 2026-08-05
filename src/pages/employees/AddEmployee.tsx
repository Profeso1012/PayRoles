import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, CheckCircle, ChevronRight, Plus, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import BankSelect from '@/components/ui/BankSelect';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import type { Employee } from '@contracts/types/employee';

interface LegalEntity {
  id: string;
  name: string;
  country: string;
  status: string;
}

type PersonalForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
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
};

type CompensationForm = {
  basicSalary: string;
  currency: string;
  salaryType: string;
  payFrequency: string;
  effectiveDate: string;
  expiryDate: string;
  notes: string;
  breakdownComponents: Array<{ label: string; amount: string }>;
};

type BankForm = {
  bankName: string;
  accountNumber: string;
  routingCode: string;
};

const STEPS = [
  { id: 0, label: 'Personal Details' },
  { id: 1, label: 'Employment' },
  { id: 2, label: 'Compensation' },
  { id: 3, label: 'Bank Details' },
  { id: 4, label: 'Review' },
];

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

// Real backend EmploymentType enum (common.enum.ts) is lowercase snake_case.
const employmentTypeOptions = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'intern', label: 'Intern' },
];

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

// Compensation.currency is a plain string on the backend (no fixed enum) -
// this list just covers the countries Legal Entities already supports
// (NG/GB/CA/US), so a UK/Canada/US legal entity's employees aren't silently
// forced into NGN like every worker used to be regardless of country.
const CURRENCY_OPTIONS = [
  { value: 'NGN', label: 'NGN — Nigerian Naira' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'USD', label: 'USD — US Dollar' },
];

export default function AddEmployee() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);

  const [personal, setPersonal] = useState<PersonalForm>({
    firstName: '', lastName: '', email: '', phone: '',
    dateOfBirth: '', gender: '', nationalId: '', annualRent: '',
  });

  const [employment, setEmployment] = useState<EmploymentForm>({
    employeeNumber: '',
    position: '',
    department: '',
    legalEntityId: '',
    employmentType: 'full_time',
    hireDate: '',
  });

  const [compensation, setCompensation] = useState<CompensationForm>({
    basicSalary: '',
    currency: 'NGN',
    salaryType: 'fixed',
    payFrequency: 'monthly',
    effectiveDate: '',
    expiryDate: '',
    notes: '',
    breakdownComponents: [],
  });

  const [bank, setBank] = useState<BankForm>({
    bankName: '', accountNumber: '', routingCode: '',
  });

  const { data: legalEntities, isLoading: loadingEntities } = useQuery<LegalEntity[]>({
    queryKey: ['legal-entities'],
    queryFn: async () => {
      const response = await apiClient<any>(ENDPOINTS.LEGAL_ENTITIES.LIST);
      const entities = Array.isArray(response) ? response : (response.data || []);
      return entities;
    },
  });

  // GET /legal-entities returns deactivated entities too (no server-side
  // filter) - excluded here so a new employee can't be assigned to a
  // retired legal entity.
  const leOptions = (legalEntities ?? [])
    .filter((le) => le.status !== 'inactive')
    .map((le) => ({ value: le.id, label: le.name }));
  const hasNoLegalEntities = !loadingEntities && leOptions.length === 0;

  const createMutation = useMutation({
    mutationFn: async () => {
      // CreateWorkerDto now requires basicSalaryMinor/currency/payFrequency
      // and automatically creates the first Compensation record atomically.
      // No separate POST /compensation call needed - the backend creates it
      // in the same transaction as the worker (new system as of Jan 2025).
      const payload = {
        employeeNumber: employment.employeeNumber,
        firstName: personal.firstName,
        lastName: personal.lastName,
        email: personal.email || undefined,
        phone: personal.phone || undefined,
        dateOfBirth: personal.dateOfBirth || undefined,
        nationalId: personal.nationalId || undefined,
        // Minor units - feeds the Nigerian PAYE rent relief calc only, not a payroll deduction.
        annualRentMinor: personal.annualRent ? Math.round(parseFloat(personal.annualRent) * 100) : undefined,
        position: employment.position || undefined,
        department: employment.department || undefined,
        legalEntityId: employment.legalEntityId || undefined,
        employmentType: employment.employmentType,
        hireDate: employment.hireDate,
        bankName: bank.bankName || undefined,
        bankAccount: bank.accountNumber || undefined,
        bankRoutingCode: bank.routingCode || undefined,
        
        // NEW: Basic salary fields now required in worker creation
        // Backend automatically creates first compensation record
        basicSalaryMinor: Math.round(parseFloat(compensation.basicSalary) * 100),
        currency: compensation.currency || 'NGN',
        payFrequency: compensation.payFrequency || 'monthly',
      };

      const employee = await apiClient<Employee>(ENDPOINTS.WORKERS.CREATE, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      return employee;
    },
    onSuccess: (employee) => {
      toast.success('Employee added successfully');
      navigate(`/employees/${employee.id}`);
    },
    onError: (err) => toast.error('Failed to add employee', err instanceof Error ? err.message : undefined),
  });

  const fieldClass =
    'w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors placeholder:text-cash-green/40';

  if (loadingEntities) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  // Every worker needs a legalEntityId - guard upfront rather than letting
  // someone fill out four steps only to find the Legal Entity select empty
  // and the submit button silently disabled.
  if (hasNoLegalEntities) {
    return (
      <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
        <PageHeader
          title="Add Employee"
          breadcrumbs={[
            { label: 'Employees', path: '/employees' },
            { label: 'New Employee' },
          ]}
        />
        <div className="bg-white rounded-xl border border-mint-light">
          <EmptyState
            icon={Building2}
            title="No legal entities yet"
            description="Every employee must belong to a legal entity. Create one first, then come back to add employees."
            action={{ label: 'Go to Legal Entities', onClick: () => navigate('/organisation/legal-entities') }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title="Add Employee"
        breadcrumbs={[
          { label: 'Employees', path: '/employees' },
          { label: 'New Employee' },
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
              placeholder="e.g. Amaka"
            />
            <Input
              label="Last Name"
              value={personal.lastName}
              onChange={(e) => setPersonal((f) => ({ ...f, lastName: e.target.value }))}
              placeholder="e.g. Eze"
            />
            <Input
              label="Email Address"
              value={personal.email}
              onChange={(e) => setPersonal((f) => ({ ...f, email: e.target.value }))}
              placeholder="amaka@company.com"
            />
            <Input
              label="Phone Number"
              value={personal.phone}
              onChange={(e) => setPersonal((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+2348012345678"
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
            <Select
              label="Gender"
              value={personal.gender}
              options={genderOptions}
              onChange={(v) => setPersonal((f) => ({ ...f, gender: v }))}
              placeholder="Select gender"
            />
            <div className="col-span-2">
              <Input
                label="National ID (NIN)"
                value={personal.nationalId}
                onChange={(e) => setPersonal((f) => ({ ...f, nationalId: e.target.value }))}
                placeholder="NIN-000000000"
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
                placeholder="e.g. 1000000"
              />
              <p className="text-xs text-cash-green/60 mt-1">
                Used only to calculate this employee's Nigerian PAYE rent relief — not a payroll deduction.
              </p>
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
              placeholder="e.g. EMP-001"
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
                placeholder="e.g. HR Manager"
              />
            </div>
            <Input
              label="Department (optional)"
              value={employment.department}
              onChange={(e) => setEmployment((f) => ({ ...f, department: e.target.value }))}
              placeholder="e.g. Human Resources"
            />
            <Select
              label="Legal Entity"
              value={employment.legalEntityId}
              options={leOptions}
              onChange={(v) => setEmployment((f) => ({ ...f, legalEntityId: v }))}
              placeholder="Select legal entity"
            />
            <Select
              label="Employment Type"
              value={employment.employmentType}
              options={employmentTypeOptions}
              onChange={(v) => setEmployment((f) => ({ ...f, employmentType: v }))}
            />
          </div>
        </div>
      )}

      {/* Step 2: Compensation */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-mint-light p-6">
          <h2 className="text-base font-semibold text-deep-cash mb-1">Compensation</h2>
          <p className="text-sm text-cash-green/70 mb-5">
            Basic salary is required. This will automatically create the employee's first compensation record effective from their hire date.
          </p>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-cash-green font-medium mb-1">Total Amount *</p>
                <input
                  type="number"
                  className={fieldClass}
                  value={compensation.basicSalary}
                  onChange={(e) => setCompensation((f) => ({ ...f, basicSalary: e.target.value }))}
                  placeholder="e.g. 500000"
                  min={0}
                />
                <p className="text-xs text-cash-green/60 mt-1">Required - Employee's basic salary amount</p>
              </div>
              <Select
                label="Currency"
                value={compensation.currency}
                options={CURRENCY_OPTIONS}
                onChange={(v) => setCompensation((f) => ({ ...f, currency: v }))}
              />
            </div>

            <Select
              label="Pay Frequency"
              value={compensation.payFrequency}
              options={PAY_FREQUENCY_OPTIONS}
              onChange={(v) => setCompensation((f) => ({ ...f, payFrequency: v }))}
            />
            
            <div className="p-3 bg-mint-light/30 rounded-lg border border-mint-light">
              <p className="text-xs text-cash-green/80">
                ℹ️ <strong>Note:</strong> The compensation record will use the hire date as the effective date. 
                Additional fields like salary breakdown, notes, and salary type can be added later by creating a new compensation record if needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Bank Details */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-mint-light p-6">
          <h2 className="text-base font-semibold text-deep-cash mb-1">Bank Details</h2>
          <p className="text-sm text-cash-green/70 mb-5">Optional — can be added later from the employee profile.</p>
          <div className="flex flex-col gap-4">
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
              placeholder="0123456789"
            />
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="bg-white rounded-xl border border-mint-light p-6 space-y-6">
          <h2 className="text-base font-semibold text-deep-cash">Review & Submit</h2>
          <div>
            <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-3">Personal</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-cash-green/60">Name</dt>
              <dd className="text-deep-cash font-medium">{personal.firstName} {personal.lastName}</dd>
              {personal.email && (
                <>
                  <dt className="text-cash-green/60">Email</dt>
                  <dd className="text-deep-cash">{personal.email}</dd>
                </>
              )}
              {personal.phone && (
                <>
                  <dt className="text-cash-green/60">Phone</dt>
                  <dd className="text-deep-cash">{personal.phone}</dd>
                </>
              )}
              {personal.dateOfBirth && (
                <>
                  <dt className="text-cash-green/60">Date of Birth</dt>
                  <dd className="text-deep-cash">{new Date(personal.dateOfBirth).toLocaleDateString()}</dd>
                </>
              )}
              {personal.gender && (
                <>
                  <dt className="text-cash-green/60">Gender</dt>
                  <dd className="text-deep-cash capitalize">{personal.gender.replace(/_/g, ' ')}</dd>
                </>
              )}
              {personal.nationalId && (
                <>
                  <dt className="text-cash-green/60">National ID</dt>
                  <dd className="text-deep-cash font-mono">{personal.nationalId}</dd>
                </>
              )}
              {personal.annualRent && (
                <>
                  <dt className="text-cash-green/60">Annual Rent</dt>
                  <dd className="text-deep-cash">₦{Number(personal.annualRent).toLocaleString()}</dd>
                </>
              )}
            </dl>
          </div>
          <div>
            <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-3">Employment</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-cash-green/60">Employee Number</dt>
              <dd className="text-deep-cash font-medium">{employment.employeeNumber}</dd>
              {employment.position && (
                <>
                  <dt className="text-cash-green/60">Position</dt>
                  <dd className="text-deep-cash font-medium">{employment.position}</dd>
                </>
              )}
              {employment.department && (
                <>
                  <dt className="text-cash-green/60">Department</dt>
                  <dd className="text-deep-cash">{employment.department}</dd>
                </>
              )}
              {employment.legalEntityId && (
                <>
                  <dt className="text-cash-green/60">Legal Entity</dt>
                  <dd className="text-deep-cash">
                    {legalEntities?.find((le) => le.id === employment.legalEntityId)?.name || employment.legalEntityId}
                  </dd>
                </>
              )}
              <dt className="text-cash-green/60">Employment Type</dt>
              <dd className="text-deep-cash capitalize">{employment.employmentType.replace(/_/g, ' ')}</dd>
              <dt className="text-cash-green/60">Hire Date</dt>
              <dd className="text-deep-cash">{new Date(employment.hireDate).toLocaleDateString()}</dd>
            </dl>
          </div>
          {compensation.basicSalary && (
            <div>
              <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-3">Compensation</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <dt className="text-cash-green/60">Basic Salary</dt>
                <dd className="text-deep-cash font-semibold">
                  {compensation.currency} {Number(compensation.basicSalary).toLocaleString()}
                </dd>
                <dt className="text-cash-green/60">Pay Frequency</dt>
                <dd className="text-deep-cash capitalize">{compensation.payFrequency}</dd>
                <dt className="text-cash-green/60">Effective From</dt>
                <dd className="text-deep-cash">{new Date(employment.hireDate).toLocaleDateString()}</dd>
              </dl>
              <p className="text-xs text-cash-green/60 mt-2">
                First compensation record will be automatically created using the hire date as effective date.
              </p>
            </div>
          )}
          {bank.bankName && (
            <div>
              <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-3">Bank Details</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <dt className="text-cash-green/60">Bank</dt>
                <dd className="text-deep-cash">{bank.bankName}</dd>
                {bank.accountNumber && (
                  <>
                    <dt className="text-cash-green/60">Account Number</dt>
                    <dd className="text-deep-cash font-mono">{bank.accountNumber}</dd>
                  </>
                )}
                {bank.routingCode && (
                  <>
                    <dt className="text-cash-green/60">Routing Code</dt>
                    <dd className="text-deep-cash font-mono">{bank.routingCode}</dd>
                  </>
                )}
              </dl>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={() => (step > 0 ? setStep((s) => s - 1) : navigate('/employees'))}
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < 4 ? (
          <Button
            variant="primary"
            disabled={
              (step === 0 && (!personal.firstName || !personal.lastName || !personal.email)) ||
              (step === 1 && (!employment.employeeNumber || !employment.hireDate || !employment.legalEntityId)) ||
              (step === 2 && !(Number(compensation.basicSalary) > 0))
            }
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="primary"
            loading={createMutation.isPending}
            disabled={!personal.firstName || !personal.lastName || !personal.email || !employment.employeeNumber || !employment.hireDate || !(Number(compensation.basicSalary) > 0)}
            onClick={() => createMutation.mutate()}
          >
            Add Employee
          </Button>
        )}
      </div>
    </div>
  );
}

