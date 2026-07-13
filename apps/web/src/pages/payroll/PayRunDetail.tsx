import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play, Send, ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle2,
  Clock, BarChart3, Users, ChevronRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { mapPayrollRunFields, mapPayrollStatus } from '@/lib/api/transforms';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { formatMoney, formatDate } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import type { PayRun, PayRunEmployee, PayRunStatus } from '@contracts/types/payroll';

const statusVariant: Record<PayRunStatus, 'draft' | 'info' | 'warning' | 'success' | 'error'> = {
  draft: 'draft',
  calculating: 'warning',
  calculated: 'info',
  in_review: 'warning',
  pending_approval: 'warning',
  approved: 'success',
  processing: 'warning',
  paid: 'success',
  completed: 'success',
  rejected: 'error',
  cancelled: 'error',
  reversed: 'error',
  failed: 'error',
};

const statusLabel: Record<PayRunStatus, string> = {
  draft: 'Draft',
  calculating: 'Calculating…',
  calculated: 'Calculated',
  in_review: 'In Review',
  pending_approval: 'In Review',
  approved: 'Approved',
  processing: 'Processing',
  paid: 'Paid',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  reversed: 'Reversed',
  failed: 'Failed',
};

// 'calculating' is a transient state — not shown in the progress bar
const DISPLAY_STEPS: PayRunStatus[] = ['draft', 'calculated', 'in_review', 'approved', 'paid'];

function displayStepIndex(s: PayRunStatus): number {
  if (s === 'calculating') return 0; // still at draft visually
  const i = DISPLAY_STEPS.indexOf(s);
  return i === -1 ? 0 : i;
}

// Helper to format period from start/end dates or single period string
function formatPeriod(periodStart?: string, periodEnd?: string, period?: string): string {
  if (period) return period;
  if (!periodStart) return '—';
  const start = new Date(periodStart);
  const month = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return month;
}

export default function PayRunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);

  const { data: run, isLoading, isError, refetch } = useQuery<PayRun>({
    queryKey: ['pay-run', id],
    queryFn: async () => {
      const response = await apiClient<any>(ENDPOINTS.PAYROLL.RUNS.DETAIL(id!));
      const transformed = mapPayrollRunFields(response, 'toFrontend');
      
      // Build period string from dates if not present
      if (!transformed.period && transformed.periodStart) {
        transformed.period = formatPeriod(transformed.periodStart, transformed.periodEnd);
      }
      
      // Map payGroupName to name if present
      if (transformed.name && !transformed.payGroupName) {
        transformed.payGroupName = transformed.name;
      }
      
      // Backend uses PROCESSING status, map to calculating
      if (transformed.status === 'processing') {
        transformed.status = 'calculating';
      }
      
      return transformed;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      return query.state.data?.status === 'calculating' ? 2000 : false;
    },
  });

  const { data: register } = useQuery<PayRunEmployee[]>({
    queryKey: ['pay-run-register', id],
    queryFn: async () => {
      const response = await apiClient<any>(ENDPOINTS.PAYROLL.RUNS.PAYSLIPS(id!));
      const payslips = Array.isArray(response) ? response : (response.data || []);
      
      // Transform payslips to employee register format
      return payslips.map((payslip: any) => ({
        employeeId: payslip.workerId,
        employeeName: `${payslip.workerFirstName || ''} ${payslip.workerLastName || ''}`.trim(),
        employeeNumber: payslip.workerEmployeeNumber || '—',
        grossPay: payslip.totalGross || 0,
        totalDeductions: payslip.totalDeductions || 0,
        netPay: payslip.netPay || 0,
        status: payslip.status || 'ok',
        flagReason: payslip.flagReason || undefined,
      }));
    },
    enabled: !!id && !!run && ['calculated', 'in_review', 'approved', 'paid'].includes(run.status),
  });

  const calculateMutation = useMutation({
    mutationFn: () => apiClient(ENDPOINTS.PAYROLL.RUNS.SUBMIT(id!), { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-run', id] });
      toast.success('Calculation started');
    },
    onError: () => toast.error('Failed to start calculation'),
  });

  const submitMutation = useMutation({
    mutationFn: () => apiClient(ENDPOINTS.PAYROLL.RUNS.SUBMIT(id!), { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-run', id] });
      toast.success('Submitted for review');
    },
    onError: () => toast.error('Failed to submit'),
  });

  const approveMutation = useMutation({
    mutationFn: () => apiClient(ENDPOINTS.PAYROLL.RUNS.APPROVE(id!), { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-run', id] });
      toast.success('Pay run approved');
    },
    onError: () => toast.error('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiClient(ENDPOINTS.PAYROLL.RUNS.REJECT(id!), { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-run', id] });
      toast.success('Pay run returned to payroll');
    },
    onError: () => toast.error('Failed to reject'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !run) {
    return <ErrorState onRetry={refetch} />;
  }

  const currentStep = displayStepIndex(run.status);
  const period = run.period || formatPeriod(run.periodStart, run.periodEnd);

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        title={`${period} — ${run.payGroupName}`}
        breadcrumbs={[
          { label: 'Pay Runs', path: '/payroll/runs' },
          { label: period },
        ]}
        action={<Badge variant={statusVariant[run.status]} label={statusLabel[run.status]} />}
      />

      {/* State machine progress bar */}
      <div className="bg-white rounded-xl border border-mint-light p-5 mb-5">
        <div className="flex items-center overflow-x-auto pb-1">
          {DISPLAY_STEPS.map((s, i) => {
            const done = currentStep > i;
            const active = currentStep === i;
            return (
              <div key={s} className="flex items-center shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      done
                        ? 'bg-fresh-cash text-white'
                        : active
                        ? 'bg-deep-cash text-white'
                        : 'bg-mint-light text-cash-green/50'
                    }`}
                  >
                    {done ? <CheckCircle2 size={16} /> : i + 1}
                  </div>
                  <span
                    className={`text-xs whitespace-nowrap ${
                      active ? 'text-deep-cash font-semibold' : done ? 'text-fresh-cash' : 'text-cash-green/40'
                    }`}
                  >
                    {statusLabel[s]}
                  </span>
                </div>
                {i < DISPLAY_STEPS.length - 1 && (
                  <div className={`h-0.5 w-12 mx-1 mb-5 ${currentStep > i ? 'bg-fresh-cash' : 'bg-mint-light'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary cards */}
      {run.totalGross > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          {[
            ...(run.employeeCount ? [{ label: 'Employees', value: String(run.employeeCount), icon: Users }] : []),
            { label: 'Total Gross', value: formatMoney(run.totalGross, run.currency), icon: BarChart3 },
            { label: 'Deductions', value: formatMoney(run.totalDeductions || 0, run.currency), icon: BarChart3 },
            { label: 'Net Payable', value: formatMoney(run.totalNet, run.currency), icon: BarChart3 },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-mint-light px-5 py-4">
              <p className="text-xs text-cash-green/70 mb-1">{card.label}</p>
              <p className="text-lg font-bold text-deep-cash tabular-nums">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Status-specific action panels */}
      {run.status === 'draft' && (
        <div className="bg-white rounded-xl border border-mint-light p-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-mint-light flex items-center justify-center shrink-0">
              <Play size={18} className="text-cash-green" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-deep-cash mb-1">Ready to calculate</p>
              <p className="text-sm text-cash-green/70">
                This pay run is in draft. Click below to trigger payroll calculation for all
                employees in <strong>{run.payGroupName}</strong>.
              </p>
              <div className="mt-4">
                <Button
                  variant="primary"
                  loading={calculateMutation.isPending}
                  onClick={() => calculateMutation.mutate()}
                >
                  <Play size={15} />
                  Calculate Payroll
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {run.status === 'calculating' && (
        <div className="bg-white rounded-xl border border-cash-gold/40 p-6 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-cash-gold/10 flex items-center justify-center shrink-0">
              <Clock size={18} className="text-cash-gold animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-deep-cash mb-1">Calculating payroll…</p>
              <p className="text-sm text-cash-green/70">
                Processing employee earnings, deductions, and taxes. This usually takes a few seconds.
              </p>
            </div>
            <Spinner className="ml-auto" />
          </div>
        </div>
      )}

      {run.status === 'calculated' && (role === 'payroll_manager' || role === 'payroll_officer' || role === 'tenant_admin' || role === 'super_admin') && (
        <div className="bg-white rounded-xl border border-mint-light p-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-mint-light flex items-center justify-center shrink-0">
              <Send size={18} className="text-cash-green" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-deep-cash mb-1">Review calculations</p>
              <p className="text-sm text-cash-green/70 mb-4">
                Check the employee register below, then submit to Finance for approval.
              </p>
              <Button
                variant="primary"
                loading={submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                <Send size={15} />
                Submit for Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {run.status === 'in_review' && role === 'finance_manager' && (
        <div className="bg-white rounded-xl border border-mint-light p-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-mint-light flex items-center justify-center shrink-0">
              <ThumbsUp size={18} className="text-cash-green" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-deep-cash mb-1">Awaiting your approval</p>
              <p className="text-sm text-cash-green/70 mb-4">
                Review the payroll register and approve or return it to the payroll team.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  loading={approveMutation.isPending}
                  onClick={() => approveMutation.mutate()}
                >
                  <ThumbsUp size={15} />
                  Approve Pay Run
                </Button>
                <Button
                  variant="secondary"
                  loading={rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate()}
                >
                  <ThumbsDown size={15} />
                  Return to Payroll
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {run.status === 'in_review' && role !== 'finance_manager' && (
        <div className="bg-white rounded-xl border border-cash-gold/30 p-4 mb-5 flex items-center gap-3">
          <Clock size={16} className="text-cash-gold shrink-0" />
          <p className="text-sm text-cash-green/80">
            Submitted for Finance Director approval. Awaiting review.
          </p>
        </div>
      )}

      {run.status === 'approved' && (
        <div className="bg-mint-light/40 rounded-xl border border-fresh-cash/30 p-4 mb-5 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-fresh-cash shrink-0" />
          <div>
            <p className="text-sm font-semibold text-deep-cash">Pay run approved</p>
            {run.approvedAt && (
              <p className="text-xs text-cash-green/60 mt-0.5">
                Approved on {formatDate(run.approvedAt)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Employee register */}
      {register && register.length > 0 && (
        <div className="bg-white rounded-xl border border-mint-light overflow-hidden">
          <div className="px-5 py-3 border-b border-mint-light flex items-center justify-between">
            <p className="text-sm font-semibold text-deep-cash">Employee Register</p>
            <span className="text-xs text-cash-green/60">{register.length} employees</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mint-light bg-soft-white">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Employee</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Gross</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Deductions</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Net Pay</th>
                  <th className="px-5 py-3 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {register.map((emp, idx) => (
                  <tr
                    key={emp.employeeId}
                    className={idx < register.length - 1 ? 'border-b border-mint-light/50' : ''}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-deep-cash">{emp.employeeName}</p>
                      <p className="text-xs text-cash-green/60 font-mono">{emp.employeeNumber}</p>
                      {emp.flagReason && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle size={11} className="text-cash-gold" />
                          <span className="text-xs text-cash-gold">{emp.flagReason}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <MoneyDisplay amount={emp.grossPay} currency="NGN" size="sm" />
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-red-500">
                      {formatMoney(emp.totalDeductions, 'NGN')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <MoneyDisplay amount={emp.netPay} currency="NGN" size="sm" className="text-fresh-cash" />
                    </td>
                    <td className="px-5 py-3">
                      {emp.status === 'flagged' ? (
                        <Badge variant="warning" label="Flagged" />
                      ) : emp.status === 'error' ? (
                        <Badge variant="error" label="Error" />
                      ) : (
                        <Badge variant="success" label="OK" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

