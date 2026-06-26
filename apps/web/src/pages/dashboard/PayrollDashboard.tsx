import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileText, Clock, CheckCircle, Plus, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { formatDate, formatPeriod } from '@/lib/utils';
import { PATHS } from '@/router/paths';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
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

interface PayrollDashboardData {
  runsThisMonth: number;
  pendingApproval: number;
  drafts: number;
  nextPayDate: string;
  recentRuns: DashboardPayRun[];
}

type BadgeVariantKey =
  | 'draft'
  | 'calculating'
  | 'calculated'
  | 'in_review'
  | 'approved'
  | 'paid'
  | 'danger'
  | 'failed';

const statusVariantMap: Record<string, BadgeVariantKey> = {
  draft: 'draft',
  calculating: 'calculating',
  calculated: 'calculated',
  in_review: 'in_review',
  approved: 'approved',
  paid: 'paid',
  rejected: 'danger',
  failed: 'failed',
};

const statusLabelMap: Record<string, string> = {
  draft: 'Draft',
  calculating: 'Calculating',
  calculated: 'Calculated',
  in_review: 'In Review',
  approved: 'Approved',
  paid: 'Paid',
  rejected: 'Rejected',
  failed: 'Failed',
};

export default function PayrollDashboard() {
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery<PayrollDashboardData>({
    queryKey: ['dashboard-payroll'],
    queryFn: () => apiClient<PayrollDashboardData>('/dashboard/payroll'),
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
      <ErrorState message="Could not load payroll dashboard." onRetry={() => refetch()} />
    );
  }

  const statCards = [
    {
      label: 'Runs This Month',
      value: data.runsThisMonth,
      icon: FileText,
      bg: 'bg-mint-light',
      text: 'text-deep-cash',
      iconColor: 'text-cash-green',
    },
    {
      label: 'Pending Approval',
      value: data.pendingApproval,
      icon: Clock,
      bg: 'bg-cash-gold/15',
      text: 'text-deep-cash',
      iconColor: 'text-cash-gold',
    },
    {
      label: 'Drafts',
      value: data.drafts,
      icon: CheckCircle,
      bg: 'bg-soft-white',
      text: 'text-deep-cash',
      iconColor: 'text-cash-green/50',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-cash-green font-medium mb-0.5">Payroll Dashboard</p>
          <h1 className="text-2xl font-bold text-deep-cash">Payroll Overview</h1>
        </div>
        <Button variant="primary" onClick={() => navigate(PATHS.PAY_RUN_CREATE)}>
          <Plus size={16} />
          Create Pay Run
        </Button>
      </div>

      {/* Stat cards + Next Pay Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-xl px-5 py-4 ${card.bg} flex flex-col gap-2`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium uppercase tracking-wide ${card.text} opacity-70`}>
                  {card.label}
                </span>
                <Icon size={18} className={card.iconColor} />
              </div>
              <span className={`text-3xl font-bold ${card.text}`}>{card.value}</span>
            </div>
          );
        })}

        {/* Next Pay Date — prominent card */}
        <div className="rounded-xl px-5 py-4 bg-deep-cash text-white flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-mint-light opacity-80">
              Next Pay Date
            </span>
            <Calendar size={18} className="text-cash-gold" />
          </div>
          <span className="text-2xl font-bold text-white">
            {formatDate(data.nextPayDate)}
          </span>
        </div>
      </div>

      {/* Recent Pay Runs table */}
      <div className="rounded-xl border border-mint-light overflow-hidden">
        <div className="px-5 py-4 border-b border-mint-light flex items-center justify-between bg-white">
          <h2 className="text-sm font-semibold text-deep-cash">Recent Pay Runs</h2>
          <button
            type="button"
            onClick={() => navigate(PATHS.PAY_RUNS)}
            className="text-xs text-cash-green hover:text-fresh-cash font-medium flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight size={13} />
          </button>
        </div>

        {data.recentRuns.length === 0 ? (
          <div className="py-10 text-center text-sm text-cash-green/60 bg-white">
            No pay runs to display.
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-soft-white border-b border-mint-light">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-cash-green/70 uppercase tracking-wide">
                    Period
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green/70 uppercase tracking-wide">
                    Pay Group
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green/70 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green/70 uppercase tracking-wide">
                    Gross
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green/70 uppercase tracking-wide">
                    Net
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mint-light">
                {data.recentRuns.map((run) => {
                  const variantKey = statusVariantMap[run.status] ?? 'draft';
                  return (
                    <tr
                      key={run.id}
                      onClick={() => navigate(PATHS.PAY_RUN_DETAIL(run.id))}
                      className="hover:bg-soft-white cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 text-sm font-medium text-deep-cash">
                        {formatPeriod(run.period)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-cash-green">
                        {run.payGroupName ?? '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={variantKey}
                          label={statusLabelMap[run.status] ?? run.status}
                        />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {run.totalGross > 0 ? (
                          <MoneyDisplay amount={run.totalGross} currency={run.currency} size="sm" />
                        ) : (
                          <span className="text-cash-green/40 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {run.totalNet > 0 ? (
                          <MoneyDisplay amount={run.totalNet} currency={run.currency} size="sm" />
                        ) : (
                          <span className="text-cash-green/40 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
