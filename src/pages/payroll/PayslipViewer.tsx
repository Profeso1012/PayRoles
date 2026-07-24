import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { minorToMajor } from '@/lib/api/transforms';
import { formatMoney, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import Button from '@/components/ui/Button';
import type { Payslip, PayElement } from '@contracts/types/payroll';
import type { BackendPayslip, BackendWorker, BackendPayrollRun } from '@/lib/api/types';

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

  // Generates (or returns the cached) server-rendered PDF, distinct from the
  // Print button below (which is just the browser's own print-to-PDF of this
  // page's markup).
  const downloadPdfMutation = useMutation({
    mutationFn: () =>
      apiClient<{ pdfUrl: string }>(ENDPOINTS.PAYROLL.PAYSLIPS.PDF(runId!, payslipId!), { method: 'POST' }),
    onSuccess: (result) => window.open(result.pdfUrl, '_blank'),
    onError: (err) => toast.error('Failed to generate PDF', err instanceof Error ? err.message : undefined),
  });

  const { data: payslip, isLoading, isError, refetch } = useQuery<Payslip>({
    queryKey: ['payslip', runId, payslipId],
    queryFn: async (): Promise<Payslip> => {
      if (!runId || !payslipId) throw new Error('Missing IDs');

      // The real Payslip entity has no worker name or run period on it - fetch
      // those separately (payElements is also shaped differently: {code,name,type,amountMinor}).
      const [backendPayslip, run] = await Promise.all([
        apiClient<BackendPayslip>(ENDPOINTS.PAYROLL.PAYSLIPS.DETAIL(runId, payslipId)),
        apiClient<BackendPayrollRun>(ENDPOINTS.PAYROLL.RUNS.DETAIL(runId)).catch(() => null as BackendPayrollRun | null),
      ]);

      const resolvedWorker = await apiClient<BackendWorker>(
        ENDPOINTS.WORKERS.DETAIL(backendPayslip.workerId),
      ).catch(() => null);

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
        employeeName: resolvedWorker ? `${resolvedWorker.firstName} ${resolvedWorker.lastName}` : backendPayslip.workerId,
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
      };
    },
    enabled: !!runId && !!payslipId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !payslip) {
    return <ErrorState onRetry={refetch} />;
  }

  const earnings = payslip.elements.filter((e: PayElement) => e.type === 'earning');
  const deductions = payslip.elements.filter((e: PayElement) => e.type === 'deduction');
  const contributions = payslip.elements.filter((e: PayElement) => e.type === 'employer_contribution');

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
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

      {/* Payslip document */}
      <div
        id="payslip-doc"
        className="bg-white rounded-xl border border-mint-light overflow-hidden"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {/* Header */}
        <div className="bg-deep-cash px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <img src="/assets/payrole-logo.png" alt="PayRole" className="h-7 brightness-0 invert mb-3" />
              <p className="text-mint-light/70 text-xs">{payslip.payGroupName || payslip.name || '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-lg">{formatPeriod(payslip.period)}</p>
              <p className="text-mint-light/70 text-xs mt-0.5">Pay Slip</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 border-b border-mint-light">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-2">Employee</p>
              <p className="text-lg font-bold text-deep-cash">{payslip.employeeName}</p>
              <p className="text-sm text-cash-green font-mono mt-0.5">{payslip.employeeNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-2">Issued</p>
              <p className="text-sm font-medium text-deep-cash">{formatDate(payslip.issuedAt || payslip.createdAt || '')}</p>
              <p className="text-xs text-cash-green/60 mt-0.5">ID: {payslip.id}</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="grid grid-cols-2 gap-8">
            {/* Earnings */}
            <div>
              <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-3">Earnings</p>
              <table className="w-full text-sm">
                <tbody>
                  {earnings.map((el) => (
                    <tr key={el.id}>
                      <td className="py-1.5 text-deep-cash">{el.name}</td>
                      <td className="py-1.5 text-right font-medium text-deep-cash tabular-nums">
                        {formatMoney(el.amount, el.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-mint-light">
                    <td className="pt-2 text-sm font-semibold text-deep-cash">Total Earnings</td>
                    <td className="pt-2 text-right font-bold text-deep-cash tabular-nums">
                      {formatMoney(payslip.grossPay, payslip.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Deductions */}
            <div>
              <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-3">Deductions</p>
              <table className="w-full text-sm">
                <tbody>
                  {deductions.map((el) => (
                    <tr key={el.id}>
                      <td className="py-1.5 text-deep-cash">{el.name}</td>
                      <td className="py-1.5 text-right font-medium text-red-500 tabular-nums">
                        ({formatMoney(el.amount, el.currency)})
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-mint-light">
                    <td className="pt-2 text-sm font-semibold text-deep-cash">Total Deductions</td>
                    <td className="pt-2 text-right font-bold text-red-500 tabular-nums">
                      ({formatMoney(payslip.totalDeductions, payslip.currency)})
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {contributions.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-3">
                Employer Contributions (informational)
              </p>
              <table className="w-full text-sm">
                <tbody>
                  {contributions.map((el) => (
                    <tr key={el.id} className="text-cash-green/70">
                      <td className="py-1.5">{el.name}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatMoney(el.amount, el.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Net pay summary */}
          <div className="mt-6 pt-5 border-t-2 border-deep-cash/10">
            <div className="bg-deep-cash rounded-xl px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-mint-light/70 text-xs font-semibold uppercase tracking-wide">Net Pay</p>
                <p className="text-white text-2xl font-bold mt-0.5 tabular-nums">
                  {formatMoney(payslip.netPay, payslip.currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-mint-light/60 text-xs">{payslip.currency}</p>
                <p className="text-mint-light/60 text-xs mt-0.5">{formatPeriod(payslip.period)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-soft-white border-t border-mint-light text-xs text-cash-green/50 text-center">
          Generated by PayRole · {formatDate(payslip.generatedAt || payslip.createdAt || '')} · This is a computer-generated document and requires no signature.
        </div>
      </div>
    </div>
  );
}
