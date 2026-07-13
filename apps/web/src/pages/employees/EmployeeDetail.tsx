import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Pencil, AlertCircle, CreditCard, User, Briefcase, Receipt } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { mapWorkerFields } from '@/lib/api/transforms';
import { formatDate, formatPeriod } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import Button from '@/components/ui/Button';
import type { Employee, EmployeeAssignment, Compensation } from '@contracts/types/employee';
import type { Payslip } from '@contracts/types/payroll';
import type { BackendWorker, BackendCompensation } from '@/lib/api/types';

const TAB_IDS = ['profile', 'assignments', 'compensation', 'payslips'];

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'compensation', label: 'Compensation' },
  { id: 'payslips', label: 'Payslips' },
];

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  active: 'success',
  inactive: 'info',
  on_leave: 'warning',
  terminated: 'error',
  exited: 'error',
};

const statusLabel: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  on_leave: 'On Leave',
  terminated: 'Terminated',
  exited: 'Terminated',
};

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');

  const { data: employee, isLoading, isError, refetch } = useQuery<Employee>({
    queryKey: ['worker', id],
    queryFn: async () => {
      const worker = await apiClient<BackendWorker>(ENDPOINTS.WORKERS.DETAIL(id!));
      const mapped = mapWorkerFields(worker, 'toFrontend');
      return {
        ...mapped,
        status: (mapped.status || '').toLowerCase(),
        createdAt: mapped.createdAt || new Date().toISOString(),
        // Provide default empty arrays for fields that might not exist
        bankDetails: [], // Backend doesn't return bank details array in same format
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
        // Transform backend compensation to frontend format
        return result.map(comp => ({
          id: comp.id,
          workerId: comp.workerId,
          effectiveFrom: comp.effectiveFrom,
          effectiveTo: comp.effectiveTo,
          grossSalary: parseInt(comp.baseSalaryMinor) / 100,  // Convert from minor units
          currency: comp.currency,
          createdAt: comp.createdAt,
        })) as Compensation[];
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
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
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
              <dt className="text-cash-green/60">Gender</dt>
              <dd className="text-deep-cash capitalize">{employee.gender.replace(/_/g, ' ')}</dd>
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
          <div className="flex items-center gap-2 mb-5">
            <Receipt size={16} className="text-cash-green" />
            <h3 className="text-sm font-semibold text-deep-cash">Compensation History</h3>
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
                      <p className="text-xs text-cash-green/50 mt-0.5">
                        {comp.currency} · Annual gross
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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
                        onClick={() => navigate(`/payroll/payslips/${slip.id}`)}
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
    </div>
  );
}
