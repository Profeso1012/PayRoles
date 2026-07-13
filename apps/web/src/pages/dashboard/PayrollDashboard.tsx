import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileText, Clock, CheckCircle, Plus, ArrowRight } from 'lucide-react';
import { apiClient, apiClientWithMeta } from '@/lib/api';
import { ENDPOINTS, USE_REAL_API, buildPaginationParams } from '@/lib/api/adapter';
import { transformPaginatedResponse, mapPayrollStatus, minorToMajor } from '@/lib/api/transforms';
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

// Build payroll dashboard data from payroll runs API
async function buildPayrollDashboard(): Promise<PayrollDashboardData> {
  if (!USE_REAL_API) {
    return apiClient<PayrollDashboardData>('/dashboard/payroll');
  }

  // Fetch payroll runs
  const params = buildPaginationParams({ page: 1, limit: 50 });
  params.set('sortBy', 'createdAt');
  params.set('sortDir', 'desc');
  
  const response = await apiClientWithMeta<any[]>(`${ENDPOINTS.PAYROLL.RUNS.LIST}?${params}`);
  const { data: runs } = transformPaginatedResponse<any>(response.data, response.meta);

  // Calculate stats
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const runsThisMonth = runs.filter((r: any) => {
    const createdAt = new Date(r.createdAt);
    return createdAt >= firstDayOfMonth;
  }).length;
  
  const pendingApproval = runs.filter((r: any) => 
    mapPayrollStatus(r.status, 'toFrontend') === 'in_review'
  ).length;
  
  const drafts = runs.filter((r: any) => 
    mapPayrollStatus(r.status, 'toFrontend') === 'draft'
  ).length;

  // Find next pay date (earliest upcoming payDate from non-draft runs)
  const upcomingRuns = runs
    .filter((r: any) => r.payDate && mapPayrollStatus(r.status, 'toFrontend') !== 'draft')
    .map((r: any) => new Date(r.payDate))
    .filter((d: Date) => d >= now)
    .sort((a: Date, b: Date) => a.getTime() - b.getTime());
  
  const nextPayDate = upcomingRuns.length > 0 
    ? upcomingRuns[0].toISOString() 
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Recent runs (last 10, transform amounts)
  const recentRuns = runs.slice(0, 10).map((r: any) => {
    // Build period string from dates
    let period = r.period;
    if (!period && r.periodStart && r.periodEnd) {
      const start = new Date(r.periodStart);
      period = `${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }

    return {
      id: r.id,
      period: period || 'N/A',
      status: mapPayrollStatus(r.status, 'toFrontend'),
      totalGross: r.totalGrossMinor ? minorToMajor(r.totalGrossMinor, r.currency) : 0,
      totalNet: r.totalNetMinor ? minorToMajor(r.totalNetMinor, r.currency) : 0,
      currency: r.currency || 'NGN',
      // BackendPayrollRun has no embedded legalEntity relation - fall back to the run's own name.
      payGroupName: r.name || 'N/A',
      employeeCount: r.employeeCount,
    };
  });

  return {
    runsThisMonth,
    pendingApproval,
    drafts,
    nextPayDate,
    recentRuns,
  };
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
    queryFn: buildPayrollDashboard,
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
