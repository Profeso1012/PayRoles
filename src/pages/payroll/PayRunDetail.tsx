import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play, Send, ThumbsUp, ThumbsDown, CheckCircle2,
  Clock, BarChart3, Users, XCircle, RotateCcw, RefreshCw, Pencil,
} from 'lucide-react';
import { apiClient, apiClientWithMeta } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { mapPayrollRunFields, minorToMajor } from '@/lib/api/transforms';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { formatMoney, formatDate } from '@/lib/utils';
import { PATHS } from '@/router/paths';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import type { PayRun, PayRunStatus } from '@contracts/types/payroll';
import type { BackendPayslip, BackendWorker } from '@/lib/api/types';

// The real backend register (GET /payroll/runs/:id/payslips) has no worker
// name/employee number on the row itself - joined client-side against a
// fetched worker list. There is also no "flagged/error" calculation-status
// concept on Payslip; disbursementStatus reflects payment state, not calculation.
interface RegisterRow {
  payslipId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  disbursementStatus: string;
}

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

// 'calculating' and 'processing' are transient states — not shown as their
// own steps, just folded into the step they're transitioning from/to. The
// last step is the literal 'paid' - mapPayrollStatus (transforms.ts) aliases
// backend 'completed' to frontend 'paid', which is the value a finished run
// actually carries; using 'completed' here made indexOf() return -1 for every
// finished run, silently falling back to step 0 (Draft) instead of the last step.
const DISPLAY_STEPS: PayRunStatus[] = ['draft', 'calculated', 'in_review', 'approved', 'paid'];

function displayStepIndex(s: PayRunStatus): number {
  if (s === 'calculating') return 0; // still at draft visually
  if (s === 'processing') return 3; // disbursing post-approval, not yet completed
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
      console.log('Pay run detail response from backend:', response);
      console.log('Pay run status:', response.status);
      console.log('Pay run failureReason:', response.failureReason);
      console.log('Pay run notes:', response.notes);
      console.log('Pay run metadata:', response.metadata);
      console.log('Pay run workflowId:', response.workflowId);
      
      const transformed = mapPayrollRunFields(response, 'toFrontend');
      console.log('Pay run after transformation:', transformed);
      console.log('Transformed status:', transformed.status);
      
      // Build period string from dates if not present
      if (!transformed.period && transformed.periodStart) {
        transformed.period = formatPeriod(transformed.periodStart, transformed.periodEnd);
      }
      
      // Map payGroupName to name if present
      if (transformed.name && !transformed.payGroupName) {
        transformed.payGroupName = transformed.name;
      }

      return transformed;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'calculating' || s === 'processing' ? 2000 : false;
    },
  });

  const { data: register } = useQuery<RegisterRow[]>({
    queryKey: ['pay-run-register', id],
    queryFn: async () => {
      const { data: payslips } = await apiClientWithMeta<BackendPayslip[]>(
        `${ENDPOINTS.PAYROLL.RUNS.PAYSLIPS(id!)}?${buildPaginationParams({ limit: 100 })}`,
      );

      // The register row has no worker name - fetch workers and join client-side.
      const workerIds = Array.from(new Set(payslips.map((p) => p.workerId)));
      const workerMap = new Map<string, BackendWorker>();
      await Promise.all(
        workerIds.map(async (workerId) => {
          try {
            const worker = await apiClient<BackendWorker>(ENDPOINTS.WORKERS.DETAIL(workerId));
            workerMap.set(workerId, worker);
          } catch {
            // Worker may have been removed - fall back to showing the ID.
          }
        }),
      );

      return payslips.map((payslip): RegisterRow => {
        const worker = workerMap.get(payslip.workerId);
        return {
          payslipId: payslip.id,
          employeeId: payslip.workerId,
          employeeName: worker ? `${worker.firstName} ${worker.lastName}` : payslip.workerId,
          employeeNumber: worker?.employeeNumber || '—',
          grossPay: minorToMajor(payslip.grossPayMinor),
          totalDeductions: minorToMajor(payslip.deductionsMinor),
          netPay: minorToMajor(payslip.netPayMinor),
          disbursementStatus: payslip.disbursementStatus,
        };
      });
    },
    enabled: !!id && !!run && ['calculated', 'in_review', 'approved', 'processing', 'paid'].includes(run.status),
  });

  const calculateMutation = useMutation({
    mutationFn: () => {
      console.log('Starting calculation for pay run:', id);
      return apiClient(ENDPOINTS.PAYROLL.RUNS.CALCULATE(id!), { method: 'PATCH' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-run', id] });
      qc.invalidateQueries({ queryKey: ['pay-runs-list'] });
      toast.success('Calculation started');
      console.log('Calculation started successfully');
    },
    onError: (err) => {
      console.error('Calculation failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start calculation';
      toast.error(errorMessage);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => apiClient(ENDPOINTS.PAYROLL.RUNS.SUBMIT(id!), { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-run', id] });
      qc.invalidateQueries({ queryKey: ['pay-runs-list'] });
      toast.success('Submitted for review');
    },
    onError: (err) => toast.error('Failed to submit', err instanceof Error ? err.message : undefined),
  });

  const [approveNotes, setApproveNotes] = useState('');
  const approveMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.PAYROLL.RUNS.APPROVE(id!), {
        method: 'PATCH',
        body: JSON.stringify({ notes: approveNotes.trim() || undefined }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-run', id] });
      qc.invalidateQueries({ queryKey: ['pay-runs-list'] });
      toast.success('Pay run approved');
      setApproveModalOpen(false);
      setApproveNotes('');
    },
    onError: (err) => toast.error('Failed to approve', err instanceof Error ? err.message : undefined),
  });

  const [rejectReason, setRejectReason] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const rejectMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.PAYROLL.RUNS.REJECT(id!), {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-run', id] });
      qc.invalidateQueries({ queryKey: ['pay-runs-list'] });
      toast.success('Pay run rejected');
      setRejectModalOpen(false);
      setRejectReason('');
    },
    onError: (err) => toast.error('Failed to reject', err instanceof Error ? err.message : undefined),
  });

  const [approveModalOpen, setApproveModalOpen] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const cancelMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.PAYROLL.RUNS.CANCEL(id!), {
        method: 'PATCH',
        body: JSON.stringify(cancelReason ? { reason: cancelReason } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-run', id] });
      qc.invalidateQueries({ queryKey: ['pay-runs-list'] });
      toast.success('Pay run cancelled');
      setCancelModalOpen(false);
      setCancelReason('');
    },
    onError: (err) => toast.error('Failed to cancel pay run', err instanceof Error ? err.message : undefined),
  });

  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  const reverseMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.PAYROLL.RUNS.REVERSE(id!), {
        method: 'PATCH',
        body: JSON.stringify({ reason: reverseReason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-run', id] });
      qc.invalidateQueries({ queryKey: ['pay-runs-list'] });
      toast.success('Pay run reversed');
      setReverseModalOpen(false);
      setReverseReason('');
    },
    onError: (err) => toast.error('Failed to reverse pay run', err instanceof Error ? err.message : undefined),
  });

  // Edit modal state - must be declared before early returns
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    periodStart: '',
    periodEnd: '',
    payDate: '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; periodStart: string; periodEnd: string; payDate: string }) => {
      console.log('Updating pay run:', id, data);
      return apiClient(ENDPOINTS.PAYROLL.RUNS.UPDATE(id!), {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-run', id] });
      toast.success('Pay run updated');
      setEditModalOpen(false);
      console.log('Pay run updated successfully');
    },
    onError: (err) => {
      console.error('Pay run update failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update pay run';
      toast.error(errorMessage);
    },
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
  const canManage =
    role === 'payroll_manager' || role === 'payroll_officer' || role === 'tenant_admin' || role === 'super_admin';
  // PAYROLL_REVERSE is never explicitly granted to any role in roles.enum.ts -
  // only super_admin (all permissions) and tenant_admin (all non-tenant:*
  // permissions) end up with it. finance_manager does NOT hold it, despite
  // holding PAYSLIP_READ/DOWNLOAD and PAYROLL_READ for the same runs.
  const canReverse = role === 'tenant_admin' || role === 'super_admin';
  // Mirrors the backend's actual PAYROLL_APPROVE/PAYROLL_REJECT grants
  // (roles.enum.ts ROLE_PERMISSIONS) - finance_manager does NOT hold these
  // permissions there, payroll_manager does.
  const canApprove = role === 'payroll_manager' || role === 'tenant_admin' || role === 'super_admin';
  // Same roles that can manage payroll can retry failed calculations
  const canCalculate = canManage;
  
  const openEditModal = () => {
    setEditForm({
      name: run.name || '',
      periodStart: run.periodStart || '',
      periodEnd: run.periodEnd || '',
      payDate: run.payDate || '',
    });
    setEditModalOpen(true);
  };
  
  const handleUpdate = () => {
    if (!editForm.name || !editForm.periodStart || !editForm.periodEnd || !editForm.payDate) {
      toast.error('All fields are required');
      return;
    }
    updateMutation.mutate(editForm);
  };
  
  // Can only edit in draft, calculated, failed, or rejected status
  const canEdit = canManage && ['draft', 'calculated', 'failed', 'rejected'].includes(run.status);

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title={`${period} — ${run.payGroupName}`}
        breadcrumbs={[
          { label: 'Pay Runs', path: '/payroll/runs' },
          { label: period },
        ]}
        action={
          <div className="flex items-center gap-3">
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={openEditModal}>
                <Pencil size={14} />
                Edit
              </Button>
            )}
            <Badge variant={statusVariant[run.status]} label={statusLabel[run.status]} />
          </div>
        }
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
      {run.status === 'draft' && canManage && (
        <div className="bg-white rounded-xl border border-mint-light p-6 mb-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-mint-light flex items-center justify-center shrink-0">
              <Play size={18} className="text-cash-green" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-deep-cash mb-1">Ready to calculate</p>
              <p className="text-sm text-cash-green/70">
                This pay run is in draft. Click below to trigger payroll calculation for all
                employees in <strong>{run.payGroupName}</strong>.
              </p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="primary"
              loading={calculateMutation.isPending}
              onClick={() => calculateMutation.mutate()}
            >
              <Play size={15} />
              Calculate Payroll
            </Button>
            <Button variant="ghost" onClick={() => setCancelModalOpen(true)}>
              <XCircle size={15} />
              Cancel Run
            </Button>
          </div>
        </div>
      )}

      {run.status === 'calculating' && (
        <div className="bg-white rounded-xl border border-cash-gold/40 p-6 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-cash-gold/10 flex items-center justify-center shrink-0">
              <Clock size={18} className="text-cash-gold animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-deep-cash mb-1">Calculating payroll…</p>
              <p className="text-sm text-cash-green/70">
                Processing employee earnings, deductions, and taxes. This usually takes a few seconds.
              </p>
            </div>
            <Spinner className="ml-auto" />
          </div>
          {canManage && (
            <div className="mt-4">
              <Button variant="ghost" onClick={() => setCancelModalOpen(true)}>
                <XCircle size={15} />
                Cancel Run
              </Button>
            </div>
          )}
        </div>
      )}

      {run.status === 'calculated' && canManage && (
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
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  loading={submitMutation.isPending}
                  onClick={() => submitMutation.mutate()}
                >
                  <Send size={15} />
                  Submit for Review
                </Button>
                {canApprove && (
                  <Button variant="secondary" onClick={() => setRejectModalOpen(true)}>
                    <ThumbsDown size={15} />
                    Reject
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setCancelModalOpen(true)}>
                  <XCircle size={15} />
                  Cancel Run
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {run.status === 'in_review' && canApprove && (
        <div className="bg-white rounded-xl border border-mint-light p-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-mint-light flex items-center justify-center shrink-0">
              <ThumbsUp size={18} className="text-cash-green" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-deep-cash mb-1">Awaiting your approval</p>
              <p className="text-sm text-cash-green/70 mb-4">
                Review the payroll register, then approve or reject this pay run.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={() => setApproveModalOpen(true)}
                >
                  <ThumbsUp size={15} />
                  Approve Pay Run
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setRejectModalOpen(true)}
                >
                  <ThumbsDown size={15} />
                  Reject
                </Button>
                <Button variant="ghost" onClick={() => setCancelModalOpen(true)}>
                  <XCircle size={15} />
                  Cancel Run
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {run.status === 'in_review' && !canApprove && canManage && (
        <div className="bg-white rounded-xl border border-mint-light p-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-cash-gold/10 flex items-center justify-center shrink-0">
              <Clock size={18} className="text-cash-gold" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-deep-cash mb-1">Submitted for approval</p>
              <p className="text-sm text-cash-green/70 mb-4">
                Awaiting review — you can still cancel this run before it's approved.
              </p>
              <Button variant="ghost" onClick={() => setCancelModalOpen(true)}>
                <XCircle size={15} />
                Cancel Run
              </Button>
            </div>
          </div>
        </div>
      )}

      {run.status === 'in_review' && !canManage && (
        <div className="bg-white rounded-xl border border-cash-gold/30 p-4 mb-5 flex items-center gap-3">
          <Clock size={16} className="text-cash-gold shrink-0" />
          <p className="text-sm text-cash-green/80">
            Submitted for approval. Awaiting review.
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

      {run.status === 'processing' && (
        <div className="bg-white rounded-xl border border-cash-gold/40 p-6 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-cash-gold/10 flex items-center justify-center shrink-0">
              <Clock size={18} className="text-cash-gold animate-pulse" />
            </div>
            <p className="text-sm text-cash-green/70">
              Disbursement in progress — employees are being paid. See the{' '}
              <a href="/payments" className="text-cash-green underline">Payments</a> page for batch status.
            </p>
          </div>
        </div>
      )}

      {run.status === 'paid' && (
        <div className="bg-mint-light/40 rounded-xl border border-fresh-cash/30 p-4 mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-fresh-cash shrink-0" />
            <p className="text-sm font-semibold text-deep-cash">Pay run completed</p>
          </div>
          {canReverse && (
            <Button variant="ghost" onClick={() => setReverseModalOpen(true)}>
              <RotateCcw size={15} />
              Reverse
            </Button>
          )}
        </div>
      )}

      {(run.status === 'rejected' || run.status === 'cancelled' || run.status === 'reversed' || run.status === 'failed') && (
        <div className="bg-white rounded-xl border border-red-200 p-4 mb-5">
          <div className="flex items-center gap-3 mb-2">
            <XCircle size={18} className="text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-deep-cash">
                This pay run is {statusLabel[run.status].toLowerCase()}.
              </p>
            </div>
            
            {/* Add retry/cancel buttons for failed pay runs */}
            {run.status === 'failed' && canCalculate && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => calculateMutation.mutate()}
                  loading={calculateMutation.isPending}
                >
                  <RefreshCw size={14} />
                  Retry Calculation
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCancelModalOpen(true)}>
                  <XCircle size={14} />
                  Cancel Run
                </Button>
              </div>
            )}
          </div>
          
          {/* Display failure reason if available (primary error field) */}
          {run.failureReason && (
            <div className="mt-3 pl-7">
              <p className="text-xs font-medium text-cash-green/70 uppercase tracking-wide mb-1">Error:</p>
              <p className="text-sm text-deep-cash whitespace-pre-wrap">{run.failureReason}</p>
            </div>
          )}
          
          {/* Display notes if available (may contain additional details) */}
          {run.notes && (
            <div className="mt-3 pl-7">
              <p className="text-xs font-medium text-cash-green/70 uppercase tracking-wide mb-1">Notes:</p>
              <p className="text-sm text-deep-cash whitespace-pre-wrap">{run.notes}</p>
            </div>
          )}
          
          {/* Display metadata if available (may contain error details) */}
          {run.metadata && Object.keys(run.metadata).length > 0 && (
            <div className="mt-3 pl-7">
              <p className="text-xs font-medium text-cash-green/70 uppercase tracking-wide mb-1">Additional Information:</p>
              <pre className="text-xs text-deep-cash bg-soft-white p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(run.metadata, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Show common failure reasons for failed status */}
          {run.status === 'failed' && !run.failureReason && !run.notes && (
            <div className="mt-3 pl-7">
              <p className="text-xs font-medium text-cash-green/70 uppercase tracking-wide mb-1">Common Reasons:</p>
              <ul className="text-xs text-cash-green/80 space-y-1 list-disc list-inside">
                <li>No active employees assigned to this legal entity for the pay period</li>
                <li>Employees missing active compensation records during this period</li>
                <li>Missing or invalid pay elements configuration</li>
                <li>Tax calculation engine error</li>
              </ul>
              <p className="text-xs text-cash-green/60 mt-2">
                Click "Retry Calculation" above after fixing the issue.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Employee register */}
      {(['calculated', 'in_review', 'approved', 'processing', 'paid'].includes(run.status)) && (
        <>
          {!register ? (
            <div className="bg-white rounded-xl border border-mint-light p-8 flex justify-center">
              <Spinner />
            </div>
          ) : register.length === 0 ? (
            <div className="bg-white rounded-xl border border-mint-light p-8">
              <p className="text-sm text-cash-green/60 text-center">
                No employees found in this pay run. Check that employees are assigned to the selected pay group and legal entity.
              </p>
            </div>
          ) : (
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
                        onClick={() => navigate(PATHS.PAYSLIP_VIEWER(id!, emp.payslipId))}
                        className={`cursor-pointer hover:bg-soft-white transition-colors ${idx < register.length - 1 ? 'border-b border-mint-light/50' : ''}`}
                      >
                        <td className="px-5 py-3">
                          <p className="font-medium text-deep-cash">{emp.employeeName}</p>
                          <p className="text-xs text-cash-green/60 font-mono">{emp.employeeNumber}</p>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <MoneyDisplay amount={emp.grossPay} currency={run.currency} size="sm" />
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-red-500">
                          {formatMoney(emp.totalDeductions, run.currency)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <MoneyDisplay amount={emp.netPay} currency={run.currency} size="sm" className="text-fresh-cash" />
                        </td>
                        <td className="px-5 py-3">
                          {emp.disbursementStatus === 'paid' ? (
                            <Badge variant="success" label="Paid" />
                          ) : emp.disbursementStatus === 'failed' ? (
                            <Badge variant="error" label="Failed" />
                          ) : emp.disbursementStatus === 'in_progress' ? (
                            <Badge variant="warning" label="Processing" />
                          ) : (
                            <Badge variant="info" label="Pending" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Pay Run" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">
            Explain why this pay run is being rejected — the payroll team will see this reason.
          </p>
          <textarea
            className="w-full border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Missing overtime hours for Lagos branch"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={rejectMutation.isPending}
              disabled={!rejectReason.trim()}
              onClick={() => rejectMutation.mutate()}
            >
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={approveModalOpen}
        onClose={() => { setApproveModalOpen(false); setApproveNotes(''); }}
        title="Approve Pay Run"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">
            Approve this pay run? It will move to disbursement and cannot be undone from here.
          </p>
          <textarea
            className="w-full border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
            rows={2}
            value={approveNotes}
            onChange={(e) => setApproveNotes(e.target.value)}
            placeholder="Notes (optional)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setApproveModalOpen(false); setApproveNotes(''); }}>Cancel</Button>
            <Button variant="primary" loading={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
              Approve
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancel Pay Run" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">
            Cancel this pay run before it reaches approval? Optionally provide a reason for cancellation.
          </p>
          <textarea
            className="w-full border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Incorrect pay period selected (optional)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelModalOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Cancel Pay Run
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={reverseModalOpen} onClose={() => setReverseModalOpen(false)} title="Reverse Pay Run" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">
            This reverses a completed payroll run. Historical records are preserved — corrections
            require a new pay run. Explain why this run is being reversed.
          </p>
          <textarea
            className="w-full border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
            rows={3}
            value={reverseReason}
            onChange={(e) => setReverseReason(e.target.value)}
            placeholder="e.g. Duplicate disbursement to Lagos branch"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReverseModalOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={reverseMutation.isPending}
              disabled={!reverseReason.trim()}
              onClick={() => reverseMutation.mutate()}
            >
              Reverse Pay Run
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Pay Run Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Pay Run" size="md">
        <div className="flex flex-col gap-4">
          <Input
            label="Pay Run Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="e.g. July 2026 Payroll"
            required
          />
          <Input
            label="Period Start Date"
            type="date"
            value={editForm.periodStart}
            onChange={(e) => setEditForm({ ...editForm, periodStart: e.target.value })}
            required
          />
          <Input
            label="Period End Date"
            type="date"
            value={editForm.periodEnd}
            onChange={(e) => setEditForm({ ...editForm, periodEnd: e.target.value })}
            required
          />
          <Input
            label="Pay Date"
            type="date"
            value={editForm.payDate}
            onChange={(e) => setEditForm({ ...editForm, payDate: e.target.value })}
            required
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={updateMutation.isPending}
              onClick={handleUpdate}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

