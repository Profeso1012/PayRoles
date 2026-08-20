import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Printer, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { minorToMajor } from '@/lib/api/transforms';
import { formatMoney, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import Button from '@/components/ui/Button';
import type { Payslip, PayElement } from '@contracts/types/payroll';
import type { BackendPayslip, BackendWorker, BackendPayrollRun, BackendPayrollItem } from '@/lib/api/types';

// Helper to format period from start/end dates or single period string
function formatPeriod(periodStart?: string, periodEnd?: string, period?: string): string {
  if (period) return period;
  if (!periodStart) return '—';
  const start = new Date(periodStart);
  const month = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return month;
}

export default function PayslipViewer() {
  const { runId, payslipId } = useParams<{ runId: string; payslipId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  // finance_manager holds PAYSLIP_READ but not WORKER_READ - skip the
  // employeeNumber lookup entirely for it rather than firing a call
  // guaranteed to 403.
  const canReadWorkers = role !== 'finance_manager';

  // Generates (or returns the cached) server-rendered PDF, distinct from the
  // Print button below (which is just the browser's own print-to-PDF of this
  // page's markup).
  const downloadPdfMutation = useMutation({
    mutationFn: () =>
      apiClient<{ pdfUrl: string }>(ENDPOINTS.PAYROLL.PAYSLIPS.PDF(runId!, payslipId!), { method: 'POST' }),
    onSuccess: (result) => window.open(result.pdfUrl, '_blank'),
    onError: (err) => toast.error('Failed to generate PDF', err instanceof Error ? err.message : undefined),
  });

  const { data: payslip, isLoading, isError, error, refetch } = useQuery<Payslip>({
    queryKey: ['payslip', runId, payslipId],
    queryFn: async (): Promise<Payslip> => {
      if (!runId || !payslipId) throw new Error('Missing IDs');

      // payslip.entity.ts denormalizes workerName onto the payslip itself
      // (populated at calculation time) specifically so PAYSLIP_READ-only
      // roles like finance_manager never need a separate WORKER_READ-gated
      // lookup just to see whose payslip this is. Run period still needs its
      // own fetch (payElements is also shaped differently: {code,name,type,amountMinor}).
      const [backendPayslip, run] = await Promise.all([
        apiClient<BackendPayslip>(ENDPOINTS.PAYROLL.PAYSLIPS.DETAIL(runId, payslipId)),
        apiClient<BackendPayrollRun>(ENDPOINTS.PAYROLL.RUNS.DETAIL(runId)).catch(() => null as BackendPayrollRun | null),
      ]);

      // employeeNumber has no denormalized field yet, so it's still fetched
      // best-effort - only for roles that actually hold WORKER_READ.
      const resolvedWorker = canReadWorkers
        ? await apiClient<BackendWorker>(ENDPOINTS.WORKERS.DETAIL(backendPayslip.workerId)).catch(() => null)
        : null;

      const elements: PayElement[] = backendPayslip.payElements.map((el) => ({
        id: el.code,
        name: el.name,
        type: el.type as PayElement['type'],
        amount: minorToMajor(el.amountMinor),
        currency: backendPayslip.currency,
        isStatutory: false,
        formula: null,
      }));

      return {
        id: backendPayslip.id,
        payRunId: backendPayslip.payrollRunId,
        employeeId: backendPayslip.workerId,
        employeeName: backendPayslip.workerName || backendPayslip.workerId,
        employeeNumber: resolvedWorker?.employeeNumber || '—',
        period: formatPeriod(run?.periodStart, run?.periodEnd),
        name: run?.name,
        payGroupName: run?.name,
        elements,
        grossPay: minorToMajor(backendPayslip.grossPayMinor),
        totalDeductions: minorToMajor(backendPayslip.deductionsMinor),
        netPay: minorToMajor(backendPayslip.netPayMinor),
        currency: backendPayslip.currency,
        createdAt: backendPayslip.createdAt,
        payrollWorkerId: backendPayslip.payrollWorkerId,
      };
    },
    enabled: !!runId && !!payslipId,
  });

  const [showDetails, setShowDetails] = useState(false);

  // The itemized calculation trace behind each line above (formula/tax-rule
  // actually evaluated, raw amount before rounding) - distinct from and more
  // detailed than payslip.elements, which only has the final rounded amount.
  const { data: items, isLoading: itemsLoading } = useQuery<BackendPayrollItem[]>({
    queryKey: ['payroll-items', runId, payslip?.payrollWorkerId],
    queryFn: async () => {
      const params = buildPaginationParams({ limit: 100 });
      const response = await apiClient<any>(
        `${ENDPOINTS.PAYROLL.RUNS.WORKER_ITEMS(runId!, payslip!.payrollWorkerId!)}?${params}`,
      );
      return Array.isArray(response) ? response : (response.data || []);
    },
    enabled: showDetails && !!runId && !!payslip?.payrollWorkerId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !payslip) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const earnings = payslip.elements.filter((e: PayElement) => e.type === 'earning');
  const deductions = payslip.elements.filter((e: PayElement) => e.type === 'deduction');
  const taxes = payslip.elements.filter((e: PayElement) => e.type === 'tax');
  const benefits = payslip.elements.filter((e: PayElement) => e.type === 'benefit');
  const employerContributions = payslip.elements.filter((e: PayElement) => e.type === 'employer_contribution');

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      {/* Toolbar (hidden when printing) */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-cash-green hover:text-deep-cash transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            loading={downloadPdfMutation.isPending}
            onClick={() => downloadPdfMutation.mutate()}
          >
            <Download size={15} />
            Download PDF
          </Button>
          <Button variant="ghost" onClick={() => window.print()}>
            <Printer size={15} />
            Print
          </Button>
        </div>
      </div>

      {/* Payslip document - pixel-perfect scaling container */}
      <div className="w-full overflow-x-auto print:overflow-visible">
        <div
          id="payslip-doc"
          className="bg-gradient-to-br from-white via-mint-light/5 to-white rounded-lg border border-mint-light/40 shadow-lg overflow-hidden"
          style={{ 
            fontFamily: 'system-ui, sans-serif',
            minWidth: '900px',
            width: '900px',
            transformOrigin: 'top left',
            transform: 'scale(min(1, (100vw - 3rem) / 900))',
            marginBottom: 'calc((900px * min(1, (100vw - 3rem) / 900)) - 900px)'
          }}
        >
        {/* Header with company branding */}
        <div className="bg-white px-8 py-6 border-b-4 border-fresh-cash">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <img src="/assets/payrole-logo.png" alt="PayRole" className="h-7 mb-1" />
              <p className="text-cash-green/60 text-xs italic">Empowering your workforce</p>
            </div>
          </div>
        </div>

        {/* Company & Employee Info Table */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-fresh-cash/30 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-mint-light/50">
                    <td className="px-4 py-2.5 text-xs font-semibold text-deep-cash bg-fresh-cash/10">Company Name:</td>
                    <td className="px-4 py-2.5 text-deep-cash font-medium">{payslip.payGroupName || payslip.name || 'PayRole'}</td>
                  </tr>
                  <tr className="border-b border-mint-light/50">
                    <td className="px-4 py-2.5 text-xs font-semibold text-deep-cash bg-fresh-cash/10">Pay Period:</td>
                    <td className="px-4 py-2.5 text-deep-cash font-medium">{payslip.period || formatPeriod(payslip.period)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-semibold text-deep-cash bg-fresh-cash/10">Employee Name:</td>
                    <td className="px-4 py-2.5 text-deep-cash font-medium">{payslip.employeeName}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="bg-white rounded-lg border border-fresh-cash/30 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-mint-light/50">
                    <td className="px-4 py-2.5 text-xs font-semibold text-deep-cash bg-fresh-cash/10">Employee ID:</td>
                    <td className="px-4 py-2.5 text-deep-cash font-medium font-mono">{payslip.employeeNumber}</td>
                  </tr>
                  <tr className="border-b border-mint-light/50">
                    <td className="px-4 py-2.5 text-xs font-semibold text-deep-cash bg-fresh-cash/10">Issue Date:</td>
                    <td className="px-4 py-2.5 text-deep-cash font-medium">{formatDate(payslip.issuedAt || payslip.createdAt || '')}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-semibold text-deep-cash bg-fresh-cash/10">Currency:</td>
                    <td className="px-4 py-2.5 text-deep-cash font-medium">{payslip.currency}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payslip Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-deep-cash tracking-wide">Employee</h1>
            <h2 className="text-3xl font-bold text-fresh-cash tracking-wider">PAYSLIP</h2>
          </div>

          {/* Earnings and Deductions Tables */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Earnings Table */}
            <div className="bg-white rounded-lg border border-fresh-cash/30 overflow-hidden">
              <div className="bg-deep-cash text-white px-4 py-2 text-center font-semibold text-sm uppercase tracking-wide">
                Earnings
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-fresh-cash/10 border-b border-fresh-cash/30">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-deep-cash">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-deep-cash">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {earnings.map((el, idx) => (
                    <tr key={el.id} className={idx % 2 === 0 ? 'bg-mint-light/5' : 'bg-white'}>
                      <td className="px-4 py-2.5 text-deep-cash border-b border-mint-light/20">{el.name}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-deep-cash tabular-nums border-b border-mint-light/20">
                        {formatMoney(el.amount, el.currency)}
                      </td>
                    </tr>
                  ))}
                  {earnings.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-center text-cash-green/50 text-xs">No earnings</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-fresh-cash/20 border-t-2 border-deep-cash/20">
                    <td className="px-4 py-3 font-bold text-deep-cash">Total Earning</td>
                    <td className="px-4 py-3 text-right font-bold text-deep-cash tabular-nums">
                      {formatMoney(payslip.grossPay, payslip.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Deductions Table */}
            <div className="bg-white rounded-lg border border-fresh-cash/30 overflow-hidden">
              <div className="bg-deep-cash text-white px-4 py-2 text-center font-semibold text-sm uppercase tracking-wide">
                Deductions
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-fresh-cash/10 border-b border-fresh-cash/30">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-deep-cash">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-deep-cash">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {deductions.map((el, idx) => (
                    <tr key={el.id} className={idx % 2 === 0 ? 'bg-mint-light/5' : 'bg-white'}>
                      <td className="px-4 py-2.5 text-deep-cash border-b border-mint-light/20">{el.name}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-deep-cash tabular-nums border-b border-mint-light/20">
                        {formatMoney(el.amount, el.currency)}
                      </td>
                    </tr>
                  ))}
                  {deductions.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-center text-cash-green/50 text-xs">No deductions</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-fresh-cash/20 border-t-2 border-deep-cash/20">
                    <td className="px-4 py-3 font-bold text-deep-cash">Total Deductions</td>
                    <td className="px-4 py-3 text-right font-bold text-deep-cash tabular-nums">
                      {formatMoney(payslip.totalDeductions, payslip.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Taxes Section */}
          {taxes.length > 0 && (
            <div className="mb-6 bg-white rounded-lg border border-fresh-cash/30 overflow-hidden">
              <div className="bg-deep-cash text-white px-4 py-2 text-center font-semibold text-sm uppercase tracking-wide">
                Taxes
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-fresh-cash/10 border-b border-fresh-cash/30">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-deep-cash">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-deep-cash">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {taxes.map((el, idx) => (
                    <tr key={el.id} className={idx % 2 === 0 ? 'bg-mint-light/5' : 'bg-white'}>
                      <td className="px-4 py-2.5 text-deep-cash border-b border-mint-light/20">{el.name}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-deep-cash tabular-nums border-b border-mint-light/20">
                        {formatMoney(el.amount, el.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-fresh-cash/20 border-t-2 border-deep-cash/20">
                    <td className="px-4 py-3 font-bold text-deep-cash">Total Taxes</td>
                    <td className="px-4 py-3 text-right font-bold text-deep-cash tabular-nums">
                      {formatMoney(taxes.reduce((sum, el) => sum + el.amount, 0), payslip.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Benefits Section */}
          {benefits.length > 0 && (
            <div className="mb-6 bg-white rounded-lg border border-fresh-cash/30 overflow-hidden">
              <div className="bg-deep-cash text-white px-4 py-2 text-center font-semibold text-sm uppercase tracking-wide">
                Benefits
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-fresh-cash/10 border-b border-fresh-cash/30">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-deep-cash">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-deep-cash">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {benefits.map((el, idx) => (
                    <tr key={el.id} className={idx % 2 === 0 ? 'bg-mint-light/5' : 'bg-white'}>
                      <td className="px-4 py-2.5 text-deep-cash border-b border-mint-light/20">{el.name}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-deep-cash tabular-nums border-b border-mint-light/20">
                        {formatMoney(el.amount, el.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-fresh-cash/20 border-t-2 border-deep-cash/20">
                    <td className="px-4 py-3 font-bold text-deep-cash">Total Benefits</td>
                    <td className="px-4 py-3 text-right font-bold text-deep-cash tabular-nums">
                      {formatMoney(benefits.reduce((sum, el) => sum + el.amount, 0), payslip.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Net Pay Banner */}
          <div className="bg-gradient-to-r from-deep-cash to-cash-green rounded-lg px-8 py-5 flex items-center justify-between shadow-md">
            <div>
              <p className="text-white/80 text-sm font-semibold uppercase tracking-wide">Net Pay</p>
              <p className="text-white text-3xl font-bold mt-1 tabular-nums">
                {formatMoney(payslip.netPay, payslip.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-xs uppercase tracking-wide">Payslip ID</p>
              <p className="text-white/90 text-xs font-mono mt-0.5">{payslip.id.slice(0, 8)}</p>
            </div>
          </div>

          {/* Employer Contributions */}
          {employerContributions.length > 0 && (
            <div className="mt-6 bg-white rounded-lg border border-fresh-cash/30 overflow-hidden">
              <div className="bg-fresh-cash/10 px-4 py-2 border-b border-fresh-cash/30">
                <p className="text-xs font-semibold text-deep-cash uppercase tracking-wide">
                  Employer Contributions (For Information Only)
                </p>
              </div>
              <table className="w-full text-sm">
                <tbody className="bg-white">
                  {employerContributions.map((el, idx) => (
                    <tr key={el.id} className={idx % 2 === 0 ? 'bg-mint-light/5' : 'bg-white'}>
                      <td className="px-4 py-2.5 text-cash-green/80 border-b border-mint-light/20">{el.name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-cash-green/80 border-b border-mint-light/20">{formatMoney(el.amount, el.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gradient-to-r from-white to-mint-light/10 border-t border-fresh-cash/20">
          <p className="text-xs text-cash-green/60 text-center italic">
            Generated by PayRole on {formatDate(payslip.generatedAt || payslip.createdAt || '')} · This is a computer-generated document and requires no signature.
          </p>
        </div>
        </div>
      </div>

      {/* Calculation detail - diagnostic view */}
      {payslip.payrollWorkerId && (
        <div className="mt-4 print:hidden">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-cash-green hover:text-deep-cash transition-colors"
          >
            {showDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {showDetails ? 'Hide' : 'Show'} calculation details
          </button>

          {showDetails && (
            <div className="mt-3 bg-white rounded-xl border border-mint-light overflow-hidden">
              {itemsLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : !items || items.length === 0 ? (
                <p className="text-sm text-cash-green/60 px-5 py-4">No calculation trace available for this payslip.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-mint-light bg-soft-white">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Pay Element</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Formula / Tax Rule</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Raw Amount</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-cash-green uppercase whitespace-nowrap">Final Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...items]
                        .sort((a, b) => a.sequence - b.sequence)
                        .map((item, idx) => (
                          <tr key={item.id} className={idx < items.length - 1 ? 'border-b border-mint-light/50' : ''}>
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-deep-cash">{item.payElementName}</p>
                              <p className="text-xs text-cash-green/50 font-mono">{item.payElementCode}</p>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-cash-green/70 max-w-[220px] truncate" title={item.formulaUsed ?? undefined}>
                              {item.formulaUsed ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-cash-green/70">
                              {formatMoney(Number(item.originalAmount) / 100, payslip.currency)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-medium text-deep-cash">
                              {formatMoney(minorToMajor(item.amount), payslip.currency)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
