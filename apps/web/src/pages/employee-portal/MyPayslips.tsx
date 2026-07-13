import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClientWithMeta } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { minorToMajor } from '@/lib/api/transforms';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import { PATHS } from '@/router/paths';
import type { BackendPayslip } from '@/lib/api/types';

interface MyPayslip {
  id: string;
  payRunId: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  createdAt: string;
}

export default function MyPayslips() {
  const navigate = useNavigate();
  const workerId = useAuthStore((s) => s.user?.workerId);

  const { data: payslips, isLoading, isError, refetch } = useQuery<MyPayslip[]>({
    queryKey: ['my-payslips', workerId],
    queryFn: async () => {
      if (!workerId) throw new Error('No worker record linked to this account');
      const params = buildPaginationParams({ page: 1, limit: 50, sortBy: 'createdAt', sortDir: 'desc' });
      const { data } = await apiClientWithMeta<BackendPayslip[]>(
        `${ENDPOINTS.WORKERS.PAYSLIPS(workerId)}?${params}`,
      );
      return data.map((p): MyPayslip => ({
        id: p.id,
        payRunId: p.payrollRunId,
        grossPay: minorToMajor(p.grossPayMinor),
        totalDeductions: minorToMajor(p.deductionsMinor),
        netPay: minorToMajor(p.netPayMinor),
        currency: p.currency,
        createdAt: p.createdAt,
      }));
    },
    enabled: !!workerId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !payslips) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const latest = payslips[0];

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        title="My Payslips"
        breadcrumbs={[{ label: 'My Payslips' }]}
      />
      <p className="text-sm text-cash-green/70 -mt-4 mb-6">Your complete payslip history</p>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-deep-cash rounded-xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-fresh-cash/20 flex items-center justify-center shrink-0">
            <TrendingUp size={20} className="text-fresh-cash" />
          </div>
          <div>
            <p className="text-mint-light/70 text-xs font-medium uppercase tracking-wide mb-1">
              Latest Net Pay
            </p>
            {latest ? (
              <MoneyDisplay
                amount={latest.netPay}
                currency={latest.currency}
                size="lg"
                className="text-white"
              />
            ) : (
              <span className="text-white text-lg font-bold">—</span>
            )}
            {latest && (
              <p className="text-mint-light/50 text-xs mt-0.5">{formatDate(latest.createdAt)}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-mint-light p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-mint-light flex items-center justify-center shrink-0">
            <FileText size={20} className="text-cash-green" />
          </div>
          <div>
            <p className="text-cash-green/60 text-xs font-medium uppercase tracking-wide mb-1">
              Total Payslips
            </p>
            <p className="text-deep-cash text-2xl font-bold">{payslips.length}</p>
            <p className="text-cash-green/50 text-xs mt-0.5">All time</p>
          </div>
        </div>
      </div>

      {/* Payslip table */}
      <div className="bg-white rounded-xl border border-mint-light overflow-hidden">
        <div className="px-5 py-4 border-b border-mint-light bg-soft-white">
          <h2 className="text-sm font-semibold text-deep-cash">Payslip History</h2>
        </div>

        {payslips.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-cash-green/60">
            No payslips found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mint-light">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide">
                    Gross Pay
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide">
                    Deductions
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide">
                    Net Pay
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {payslips.map((slip, idx) => (
                  <tr
                    key={slip.id}
                    className={`border-b border-mint-light/50 hover:bg-soft-white transition-colors ${
                      idx === 0 ? 'bg-mint-light/20' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5 font-medium text-deep-cash">
                      {formatDate(slip.createdAt)}
                      {idx === 0 && (
                        <span className="ml-2 text-[10px] bg-fresh-cash/20 text-cash-green px-1.5 py-0.5 rounded-full font-medium">
                          Latest
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <MoneyDisplay amount={slip.grossPay} currency={slip.currency} size="sm" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-semibold tabular-nums text-red-500">
                        (<MoneyDisplay amount={slip.totalDeductions} currency={slip.currency} size="sm" className="text-red-500" />)
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <MoneyDisplay amount={slip.netPay} currency={slip.currency} size="sm" className="text-cash-green" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(PATHS.PAYSLIP_VIEWER(slip.payRunId, slip.id))}
                      >
                        View
                      </Button>
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
