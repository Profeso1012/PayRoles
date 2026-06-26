import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { formatPeriod } from '@/lib/utils';
import { PATHS } from '@/router/paths';
import Button from '@/components/ui/Button';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

interface DashboardPayRun {
  id: string;
  period: string;
  status: string;
  totalGross: number;
  totalNet: number;
  currency: string;
  payGroupName?: string;
  employeeCount?: number;
}

interface FinanceDashboardData {
  awaitingApproval: number;
  approvedThisMonth: number;
  totalPayrollCost: number;
  currency: string;
  approvalQueue: DashboardPayRun[];
}

export default function FinanceDashboard() {
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery<FinanceDashboardData>({
    queryKey: ['dashboard-finance'],
    queryFn: () => apiClient<FinanceDashboardData>('/dashboard/finance'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState message="Could not load finance dashboard." onRetry={() => refetch()} />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-cash-green font-medium mb-0.5">Finance Dashboard</p>
          <h1 className="text-2xl font-bold text-deep-cash">Finance Overview</h1>
        </div>
        <Button variant="secondary" onClick={() => navigate(PATHS.PAY_RUNS)}>
          View All Pay Runs
          <ArrowRight size={15} />
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Awaiting Approval */}
        <div className="rounded-xl px-5 py-5 bg-cash-gold/15 border border-cash-gold/30 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-deep-cash opacity-70">
              Awaiting Approval
            </span>
            <Clock size={18} className="text-cash-gold" />
          </div>
          <span className="text-3xl font-bold text-deep-cash">{data.awaitingApproval}</span>
          <span className="text-xs text-cash-green/70">pay runs pending your review</span>
        </div>

        {/* Approved This Month */}
        <div className="rounded-xl px-5 py-5 bg-mint-light flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-deep-cash opacity-70">
              Approved This Month
            </span>
            <CheckCircle size={18} className="text-cash-green" />
          </div>
          <span className="text-3xl font-bold text-deep-cash">{data.approvedThisMonth}</span>
          <span className="text-xs text-cash-green/70">pay runs approved or paid</span>
        </div>

        {/* Total Payroll Cost */}
        <div className="rounded-xl px-5 py-5 bg-deep-cash text-white flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-mint-light opacity-80">
              Total Payroll Cost
            </span>
            <CheckCircle size={18} className="text-fresh-cash" />
          </div>
          <MoneyDisplay
            amount={data.totalPayrollCost}
            currency={data.currency}
            size="lg"
            className="text-white text-2xl"
          />
          <span className="text-xs text-mint-light/70">approved runs this month</span>
        </div>
      </div>

      {/* Approval Queue */}
      <div className="rounded-xl border border-mint-light overflow-hidden">
        <div className="px-5 py-4 border-b border-mint-light bg-white flex items-center justify-between">
          <h2 className="text-sm font-semibold text-deep-cash">Approval Queue</h2>
          {data.awaitingApproval > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cash-gold text-white text-xs font-bold">
              {data.awaitingApproval}
            </span>
          )}
        </div>

        {data.approvalQueue.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2 bg-white">
            <CheckCircle size={32} className="text-fresh-cash" />
            <p className="text-sm font-medium text-deep-cash">No pay runs awaiting approval</p>
            <p className="text-xs text-cash-green/60">All caught up!</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="w-full min-w-[540px]">
              <thead>
                <tr className="bg-soft-white border-b border-mint-light">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-cash-green/70 uppercase tracking-wide">
                    Period
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green/70 uppercase tracking-wide">
                    Pay Group
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green/70 uppercase tracking-wide">
                    Gross
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-cash-green/70 uppercase tracking-wide" />
                </tr>
              </thead>
              <tbody className="divide-y divide-mint-light">
                {data.approvalQueue.map((run) => (
                  <tr key={run.id} className="hover:bg-soft-white transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-deep-cash">
                      {formatPeriod(run.period)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-cash-green">
                      {run.payGroupName ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {run.totalGross > 0 ? (
                        <MoneyDisplay amount={run.totalGross} currency={run.currency} size="sm" />
                      ) : (
                        <span className="text-cash-green/40 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(PATHS.PAY_RUN_DETAIL(run.id))}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-cash-green hover:text-fresh-cash transition-colors"
                      >
                        Review
                        <ExternalLink size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
