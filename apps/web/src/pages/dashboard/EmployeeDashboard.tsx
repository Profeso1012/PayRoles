import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileText, User, Building2, CreditCard, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS, USE_REAL_API } from '@/lib/api/adapter';
import { minorToMajor } from '@/lib/api/transforms';
import { formatDate, formatPeriod } from '@/lib/utils';
import { PATHS } from '@/router/paths';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

interface LatestPayslip {
  id: string;
  payRunId: string;
  period: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  payGroupName: string;
}

interface EmployeeDashboardData {
  employeeName: string;
  nextPayDate: string;
  payGroupName: string;
  latestPayslip: LatestPayslip | null;
  totalPayslips: number;
}

// Build employee dashboard data from worker and payslip APIs
async function buildEmployeeDashboard(): Promise<EmployeeDashboardData> {
  if (!USE_REAL_API) {
    return apiClient<EmployeeDashboardData>('/dashboard/employee');
  }

  // Get current user info
  const user = await apiClient<any>(ENDPOINTS.AUTH.ME);
  
  // Get worker details for current user
  const worker = await apiClient<any>(ENDPOINTS.WORKERS.DETAIL(user.workerId || user.id));
  
  // Get worker's payslips
  const payslipsResponse = await apiClient<any>(ENDPOINTS.WORKERS.PAYSLIPS(worker.id));
  const payslips = Array.isArray(payslipsResponse) ? payslipsResponse : (payslipsResponse.data || []);

  // Latest payslip
  const latestPayslip = payslips.length > 0 ? {
    id: payslips[0].id,
    payRunId: payslips[0].payrollRunId || payslips[0].payRunId,
    period: payslips[0].period || 'N/A',
    grossPay: payslips[0].grossPayMinor ? minorToMajor(payslips[0].grossPayMinor, payslips[0].currency) : 0,
    totalDeductions: payslips[0].totalDeductionsMinor ? minorToMajor(payslips[0].totalDeductionsMinor, payslips[0].currency) : 0,
    netPay: payslips[0].netPayMinor ? minorToMajor(payslips[0].netPayMinor, payslips[0].currency) : 0,
    currency: payslips[0].currency || 'NGN',
    payGroupName: worker.legalEntity?.name || 'N/A',
  } : null;

  // Find next pay date (could fetch from payroll runs, but for simplicity default to 30 days)
  const now = new Date();
  const nextPayDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return {
    employeeName: `${worker.firstName} ${worker.lastName}`,
    nextPayDate,
    payGroupName: worker.legalEntity?.name || worker.department || 'N/A',
    latestPayslip,
    totalPayslips: payslips.length,
  };
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery<EmployeeDashboardData>({
    queryKey: ['dashboard-employee'],
    queryFn: buildEmployeeDashboard,
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
      <ErrorState message="Could not load your dashboard." onRetry={() => refetch()} />
    );
  }

  const quickLinks = [
    { label: 'My Profile', icon: User, path: PATHS.MY_PROFILE },
    { label: 'My Bank Details', icon: CreditCard, path: PATHS.MY_BANK_DETAILS },
    { label: 'My Payslips', icon: FileText, path: PATHS.MY_PAYSLIPS },
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      {/* Welcome */}
      <div>
        <p className="text-sm text-cash-green font-medium mb-1">Employee Portal</p>
        <h1 className="text-3xl font-bold text-deep-cash">
          Hello, {data.employeeName}!
        </h1>
        {data.payGroupName && (
          <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-mint-light text-xs font-medium text-cash-green">
            <Building2 size={12} />
            Pay group: {data.payGroupName}
          </span>
        )}
      </div>

      {/* Next Pay Date card */}
      <div className="rounded-xl border-2 border-cash-gold/40 bg-cash-gold/10 px-6 py-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-cash-gold/20 flex items-center justify-center shrink-0">
          <Calendar size={24} className="text-cash-gold" />
        </div>
        <div>
          <p className="text-xs font-medium text-cash-green uppercase tracking-wide">
            Your next pay date
          </p>
          <p className="text-xl font-bold text-deep-cash mt-0.5">
            {formatDate(data.nextPayDate)}
          </p>
        </div>
      </div>

      {/* Latest Payslip card */}
      {data.latestPayslip ? (
        <div className="rounded-xl border border-mint-light bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-mint-light bg-soft-white flex items-center justify-between">
            <h2 className="text-sm font-semibold text-deep-cash">Latest Payslip</h2>
            <span className="text-xs text-cash-green/60 font-medium">
              {formatPeriod(data.latestPayslip.period)}
            </span>
          </div>

          <div className="px-5 py-5 space-y-4">
            {/* Net pay — prominent */}
            <div>
              <p className="text-xs font-medium text-cash-green/70 uppercase tracking-wide mb-1">
                Net Pay
              </p>
              <MoneyDisplay
                amount={data.latestPayslip.netPay}
                currency={data.latestPayslip.currency}
                size="lg"
                className="text-deep-cash text-3xl font-bold"
              />
            </div>

            {/* Gross + deductions */}
            <div className="flex gap-6 pt-1 border-t border-mint-light">
              <div>
                <p className="text-xs text-cash-green/60 mb-0.5">Gross Pay</p>
                <MoneyDisplay
                  amount={data.latestPayslip.grossPay}
                  currency={data.latestPayslip.currency}
                  size="sm"
                  className="text-cash-green"
                />
              </div>
              <div>
                <p className="text-xs text-cash-green/60 mb-0.5">Deductions</p>
                <MoneyDisplay
                  amount={data.latestPayslip.totalDeductions}
                  currency={data.latestPayslip.currency}
                  size="sm"
                  className="text-red-500"
                />
              </div>
            </div>

            {/* View payslip button */}
            <Button
              variant="secondary"
              onClick={() => navigate(PATHS.PAYSLIP_VIEWER(data.latestPayslip!.payRunId))}
              className="w-full"
            >
              <FileText size={15} />
              View Payslip
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-mint-light bg-white px-5 py-8 flex flex-col items-center gap-2 text-center">
          <FileText size={28} className="text-cash-green/30" />
          <p className="text-sm font-medium text-deep-cash">No payslips yet</p>
          <p className="text-xs text-cash-green/60">Your payslips will appear here once issued.</p>
        </div>
      )}

      {/* Payslips count link */}
      {data.totalPayslips > 0 && (
        <button
          type="button"
          onClick={() => navigate(PATHS.MY_PAYSLIPS)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-mint-light bg-white hover:bg-soft-white transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <FileText size={16} className="text-cash-green" />
            <span className="text-sm font-medium text-deep-cash">
              {data.totalPayslips} payslip{data.totalPayslips !== 1 ? 's' : ''} available
            </span>
          </div>
          <ChevronRight size={16} className="text-cash-green/50" />
        </button>
      )}

      {/* Quick links */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-cash-green/70 uppercase tracking-wide px-1">
          Quick Links
        </h2>
        <div className="rounded-xl border border-mint-light overflow-hidden divide-y divide-mint-light">
          {quickLinks.map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-white hover:bg-soft-white transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-mint-light flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-cash-green" />
                </div>
                <span className="text-sm font-medium text-deep-cash">{label}</span>
              </div>
              <ChevronRight size={16} className="text-cash-green/40" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
