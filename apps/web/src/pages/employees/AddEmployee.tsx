import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { Employee } from '@contracts/types/employee';

interface Department { id: string; name: string; }
interface Location { id: string; name: string; legalEntityId: string; }
interface JobGrade { id: string; name: string; }
interface PayGroup { id: string; name: string; }

type PersonalForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationalId: string;
};

type EmploymentForm = {
  jobTitle: string;
  departmentId: string;
  locationId: string;
  jobGradeId: string;
  employmentType: string;
  effectiveFrom: string;
};

type CompensationForm = {
  grossSalary: string;
  payGroupId: string;
  effectiveFrom: string;
};

type BankForm = {
  bankName: string;
  accountNumber: string;
  accountName: string;
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

const employmentTypeOptions = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
];

export default function AddEmployee() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);

  const [personal, setPersonal] = useState<PersonalForm>({
    firstName: '', lastName: '', email: '', phone: '',
    dateOfBirth: '', gender: '', nationalId: '',
  });

  const [employment, setEmployment] = useState<EmploymentForm>({
    jobTitle: '', departmentId: '', locationId: '', jobGradeId: '',
    employmentType: 'full_time', effectiveFrom: '',
  });

  const [compensation, setCompensation] = useState<CompensationForm>({
    grossSalary: '', payGroupId: '', effectiveFrom: '',
  });

  const [bank, setBank] = useState<BankForm>({
    bankName: '', accountNumber: '', accountName: '',
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const { token } = useAuthStore.getState();
      const res = await fetch('/api/organisation/departments', {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      return (await res.json()).data ?? [];
    },
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const { token } = useAuthStore.getState();
      const res = await fetch('/api/organisation/locations', {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      return (await res.json()).data ?? [];
    },
  });

  const { data: jobGrades } = useQuery<JobGrade[]>({
    queryKey: ['job-grades'],
    queryFn: async () => {
      const { token } = useAuthStore.getState();
      const res = await fetch('/api/organisation/job-grades', {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      return (await res.json()).data ?? [];
    },
  });

  const { data: payGroups } = useQuery<PayGroup[]>({
    queryKey: ['pay-groups'],
    queryFn: async () => {
      const { token } = useAuthStore.getState();
      const res = await fetch('/api/organisation/pay-groups', {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      return (await res.json()).data ?? [];
    },
  });

  const deptOptions = (departments ?? []).map((d) => ({ value: d.id, label: d.name }));
  const locOptions = (locations ?? []).map((l) => ({ value: l.id, label: l.name }));
  const gradeOptions = (jobGrades ?? []).map((g) => ({ value: g.id, label: g.name }));
  const pgOptions = (payGroups ?? []).map((p) => ({ value: p.id, label: p.name }));

  const createMutation = useMutation({
    mutationFn: async () => {
      const employee = await apiClient<Employee>('/employees', {
        method: 'POST',
        body: JSON.stringify({
          ...personal,
          bankDetails: bank.bankName ? [{ ...bank, isPrimary: true }] : [],
        }),
      });
      if (employment.jobTitle) {
        await apiClient(`/employees/${employee.id}/assignments`, {
          method: 'POST',
          body: JSON.stringify(employment),
        });
      }
      if (compensation.grossSalary && compensation.payGroupId) {
        await apiClient(`/employees/${employee.id}/compensations`, {
          method: 'POST',
          body: JSON.stringify({
            ...compensation,
            grossSalary: Math.round(parseFloat(compensation.grossSalary) * 100),
            currency: 'NGN',
          }),
        });
      }
      return employee;
    },
    onSuccess: (employee) => {
      toast.success('Employee added successfully');
      navigate(`/employees/${employee.id}`);
    },
    onError: () => toast.error('Failed to add employee'),
  });

  const fieldClass =
    'w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors placeholder:text-cash-green/40';

  return (
    <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
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
          </div>
        </div>
      )}

      {/* Step 1: Employment */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-mint-light p-6">
          <h2 className="text-base font-semibold text-deep-cash mb-5">Employment Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Job Title"
                value={employment.jobTitle}
                onChange={(e) => setEmployment((f) => ({ ...f, jobTitle: e.target.value }))}
                placeholder="e.g. HR Manager"
              />
            </div>
            <Select
              label="Department"
              value={employment.departmentId}
              options={deptOptions}
              onChange={(v) => setEmployment((f) => ({ ...f, departmentId: v }))}
              placeholder="Select department"
            />
            <Select
              label="Location"
              value={employment.locationId}
              options={locOptions}
              onChange={(v) => setEmployment((f) => ({ ...f, locationId: v }))}
              placeholder="Select location"
            />
            <Select
              label="Job Grade"
              value={employment.jobGradeId}
              options={gradeOptions}
              onChange={(v) => setEmployment((f) => ({ ...f, jobGradeId: v }))}
              placeholder="Select grade (optional)"
            />
            <Select
              label="Employment Type"
              value={employment.employmentType}
              options={employmentTypeOptions}
              onChange={(v) => setEmployment((f) => ({ ...f, employmentType: v }))}
            />
            <div className="col-span-2">
              <p className="text-sm text-cash-green font-medium mb-1">Effective From</p>
              <input
                type="date"
                className={fieldClass}
                value={employment.effectiveFrom}
                onChange={(e) => setEmployment((f) => ({ ...f, effectiveFrom: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Compensation */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-mint-light p-6">
          <h2 className="text-base font-semibold text-deep-cash mb-5">Compensation</h2>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-cash-green font-medium mb-1">Gross Annual Salary (₦)</p>
              <input
                type="number"
                className={fieldClass}
                value={compensation.grossSalary}
                onChange={(e) => setCompensation((f) => ({ ...f, grossSalary: e.target.value }))}
                placeholder="e.g. 1200000"
                min={0}
              />
              <p className="text-xs text-cash-green/60 mt-1">Enter as a whole number (e.g. 1200000 for ₦1,200,000)</p>
            </div>
            <Select
              label="Pay Group"
              value={compensation.payGroupId}
              options={pgOptions}
              onChange={(v) => setCompensation((f) => ({ ...f, payGroupId: v }))}
              placeholder="Select pay group"
            />
            <div>
              <p className="text-sm text-cash-green font-medium mb-1">Effective From</p>
              <input
                type="date"
                className={fieldClass}
                value={compensation.effectiveFrom}
                onChange={(e) => setCompensation((f) => ({ ...f, effectiveFrom: e.target.value }))}
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
            <Input
              label="Bank Name"
              value={bank.bankName}
              onChange={(e) => setBank((f) => ({ ...f, bankName: e.target.value }))}
              placeholder="e.g. GTBank"
            />
            <Input
              label="Account Number"
              value={bank.accountNumber}
              onChange={(e) => setBank((f) => ({ ...f, accountNumber: e.target.value }))}
              placeholder="0123456789"
            />
            <Input
              label="Account Name"
              value={bank.accountName}
              onChange={(e) => setBank((f) => ({ ...f, accountName: e.target.value }))}
              placeholder="Full name as on account"
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
              <dt className="text-cash-green/60">Email</dt>
              <dd className="text-deep-cash">{personal.email}</dd>
              <dt className="text-cash-green/60">Phone</dt>
              <dd className="text-deep-cash">{personal.phone}</dd>
              <dt className="text-cash-green/60">Gender</dt>
              <dd className="text-deep-cash capitalize">{personal.gender.replace(/_/g, ' ')}</dd>
            </dl>
          </div>
          {employment.jobTitle && (
            <div>
              <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-3">Employment</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <dt className="text-cash-green/60">Job Title</dt>
                <dd className="text-deep-cash font-medium">{employment.jobTitle}</dd>
                <dt className="text-cash-green/60">Type</dt>
                <dd className="text-deep-cash capitalize">{employment.employmentType.replace(/_/g, ' ')}</dd>
              </dl>
            </div>
          )}
          {compensation.grossSalary && (
            <div>
              <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-3">Compensation</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <dt className="text-cash-green/60">Gross Salary</dt>
                <dd className="text-deep-cash font-semibold">
                  ₦{Number(compensation.grossSalary).toLocaleString()}
                </dd>
              </dl>
            </div>
          )}
          {bank.bankName && (
            <div>
              <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-3">Bank Details</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <dt className="text-cash-green/60">Bank</dt>
                <dd className="text-deep-cash">{bank.bankName}</dd>
                <dt className="text-cash-green/60">Account</dt>
                <dd className="text-deep-cash font-mono">{bank.accountNumber}</dd>
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
              step === 0 && (!personal.firstName || !personal.lastName || !personal.email)
            }
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="primary"
            loading={createMutation.isPending}
            disabled={!personal.firstName || !personal.lastName || !personal.email}
            onClick={() => createMutation.mutate()}
          >
            Add Employee
          </Button>
        )}
      </div>
    </div>
  );
}
