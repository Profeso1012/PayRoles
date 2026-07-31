import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle, ChevronRight, Plus, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import BankSelect from '@/components/ui/BankSelect';
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

  const { data: legalEntities } = useQuery<LegalEntity[]>({
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

  const createMutation = useMutation({
    mutationFn: async () => {
      // CreateWorkerDto (worker.dto.ts) has no `gender` field at all - the
      // real backend does not whitelist it, so it must not be sent.
      // nationalId/bankAccount are sent plain (backend encrypts at rest);
      // there is no `*Encrypted` request field.
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
      };

      const employee = await apiClient<Employee>(ENDPOINTS.WORKERS.CREATE, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Create compensation if provided. CreateCompensationDto's amount field
      // is `amountMinor`, not `basicSalaryMinor`.
      if (compensation.basicSalary && compensation.effectiveDate) {
        // Build breakdown object from components
        const breakdown = compensation.breakdownComponents.length > 0
          ? compensation.breakdownComponents.reduce((acc, comp) => {
              if (comp.label && comp.amount) {
                acc[comp.label] = parseFloat(comp.amount);
              }
              return acc;
            }, {} as Record<string, number>)
          : undefined;

        await apiClient(ENDPOINTS.COMPENSATION.CREATE, {
          method: 'POST',
          body: JSON.stringify({
            workerId: employee.id,
            amountMinor: Math.round(parseFloat(compensation.basicSalary) * 100),
            currency: 'NGN',
            salaryType: compensation.salaryType,
            payFrequency: compensation.payFrequency,
            effectiveDate: compensation.effectiveDate,
            expiryDate: compensation.expiryDate || undefined,
            notes: compensation.notes || undefined,
            breakdown,
          }),
        });
      }
      
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
          <p className="text-sm text-cash-green/70 mb-5">Optional — can be added later from the employee profile.</p>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-cash-green font-medium mb-1">Total Amount (₦)</p>
              <input
                type="number"
                className={fieldClass}
                value={compensation.basicSalary}
                onChange={(e) => setCompensation((f) => ({ ...f, basicSalary: e.target.value }))}
                placeholder="e.g. 500000"
                min={0}
              />
              <p className="text-xs text-cash-green/60 mt-1">Total gross salary amount</p>
            </div>

            {/* Salary Breakdown Builder */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-cash-green font-medium">
                  Salary Breakdown (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setCompensation((f) => ({
                    ...f,
                    breakdownComponents: [...f.breakdownComponents, { label: '', amount: '' }],
                  }))}
                  className="text-xs text-fresh-cash hover:text-deep-cash font-medium flex items-center gap-1"
                >
                  <Plus size={12} />
                  Add Component
                </button>
              </div>
              {compensation.breakdownComponents.length > 0 && (
                <div className="flex flex-col gap-2 p-3 bg-soft-white rounded-lg border border-mint-light">
                  {compensation.breakdownComponents.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Basic Salary"
                        className="flex-1 bg-white border border-mint-light rounded-md px-3 py-2 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                        value={comp.label}
                        onChange={(e) => {
                          const updated = [...compensation.breakdownComponents];
                          updated[idx].label = e.target.value;
                          setCompensation((f) => ({ ...f, breakdownComponents: updated }));
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        className="w-32 bg-white border border-mint-light rounded-md px-3 py-2 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                        value={comp.amount}
                        onChange={(e) => {
                          const updated = [...compensation.breakdownComponents];
                          updated[idx].amount = e.target.value;
                          setCompensation((f) => ({ ...f, breakdownComponents: updated }));
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = compensation.breakdownComponents.filter((_, i) => i !== idx);
                          setCompensation((f) => ({ ...f, breakdownComponents: updated }));
                        }}
                        className="p-2 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Salary Type"
                value={compensation.salaryType}
                options={SALARY_TYPE_OPTIONS}
                onChange={(v) => setCompensation((f) => ({ ...f, salaryType: v }))}
              />
              <Select
                label="Pay Frequency"
                value={compensation.payFrequency}
                options={PAY_FREQUENCY_OPTIONS}
                onChange={(v) => setCompensation((f) => ({ ...f, payFrequency: v }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-cash-green font-medium mb-1">Effective From</p>
                <input
                  type="date"
                  className={fieldClass}
                  value={compensation.effectiveDate}
                  onChange={(e) => setCompensation((f) => ({ ...f, effectiveDate: e.target.value }))}
                />
              </div>
              <div>
                <p className="text-sm text-cash-green font-medium mb-1">Expiry Date (Optional)</p>
                <input
                  type="date"
                  className={fieldClass}
                  value={compensation.expiryDate}
                  onChange={(e) => setCompensation((f) => ({ ...f, expiryDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <p className="text-sm text-cash-green font-medium mb-1">Notes (Optional)</p>
              <textarea
                className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                rows={2}
                value={compensation.notes}
                onChange={(e) => setCompensation((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Initial salary offer"
              />
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
                <dt className="text-cash-green/60">Total Amount</dt>
                <dd className="text-deep-cash font-semibold">
                  ₦{Number(compensation.basicSalary).toLocaleString()}
                </dd>
                <dt className="text-cash-green/60">Salary Type</dt>
                <dd className="text-deep-cash capitalize">{compensation.salaryType}</dd>
                <dt className="text-cash-green/60">Pay Frequency</dt>
                <dd className="text-deep-cash capitalize">{compensation.payFrequency}</dd>
                <dt className="text-cash-green/60">Effective From</dt>
                <dd className="text-deep-cash">{new Date(compensation.effectiveDate).toLocaleDateString()}</dd>
                {compensation.expiryDate && (
                  <>
                    <dt className="text-cash-green/60">Expiry Date</dt>
                    <dd className="text-deep-cash">{new Date(compensation.expiryDate).toLocaleDateString()}</dd>
                  </>
                )}
                {compensation.notes && (
                  <>
                    <dt className="text-cash-green/60">Notes</dt>
                    <dd className="text-deep-cash col-span-2">{compensation.notes}</dd>
                  </>
                )}
                {compensation.breakdownComponents.length > 0 && (
                  <>
                    <dt className="text-cash-green/60">Breakdown</dt>
                    <dd className="text-deep-cash col-span-2">
                      <div className="flex flex-col gap-1 text-xs">
                        {compensation.breakdownComponents.map((comp, idx) => (
                          comp.label && comp.amount ? (
                            <div key={idx} className="flex justify-between">
                              <span>{comp.label}:</span>
                              <span className="font-mono">₦{Number(comp.amount).toLocaleString()}</span>
                            </div>
                          ) : null
                        ))}
                      </div>
                    </dd>
                  </>
                )}
              </dl>
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
              (step === 1 && (!employment.employeeNumber || !employment.hireDate || !employment.legalEntityId))
            }
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="primary"
            loading={createMutation.isPending}
            disabled={!personal.firstName || !personal.lastName || !personal.email || !employment.employeeNumber || !employment.hireDate}
            onClick={() => createMutation.mutate()}
          >
            Add Employee
          </Button>
        )}
      </div>
    </div>
  );
}

