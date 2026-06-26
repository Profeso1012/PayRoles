import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { formatDate, formatPeriod } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import { PATHS } from '@/router/paths';

interface MyPayslip {
  id: string;
  period: string;
  payGroupName: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  generatedAt: string;
  payRunId: string;
}

const MOCK_PAYSLIPS: MyPayslip[] = [
  {
    id: 'ps-001',
    period: '2026-06',
    payGroupName: 'Monthly Staff',
    grossPay: 60000_00,
    totalDeductions: 9800_00,
    netPay: 50200_00,
    currency: 'NGN',
    generatedAt: '2026-06-25T10:00:00Z',
    payRunId: 'pr-001',
  },
  {
    id: 'ps-002',
    period: '2026-05',
    payGroupName: 'Monthly Staff',
    grossPay: 60000_00,
    totalDeductions: 9800_00,
    netPay: 50200_00,
    currency: 'NGN',
    generatedAt: '2026-05-25T10:00:00Z',
    payRunId: 'pr-002',
  },
  {
    id: 'ps-003',
    period: '2026-04',
    payGroupName: 'Monthly Staff',
    grossPay: 58000_00,
    totalDeductions: 9400_00,
    netPay: 48600_00,
    currency: 'NGN',
    generatedAt: '2026-04-25T10:00:00Z',
    payRunId: 'pr-003',
  },
  {
    id: 'ps-004',
    period: '2026-03',
    payGroupName: 'Monthly Staff',
    grossPay: 58000_00,
    totalDeductions: 9400_00,
    netPay: 48600_00,
    currency: 'NGN',
    generatedAt: '2026-03-25T10:00:00Z',
    payRunId: 'pr-004',
  },
  {
    id: 'ps-005',
    period: '2026-02',
    payGroupName: 'Monthly Staff',
    grossPay: 55000_00,
    totalDeductions: 8900_00,
    netPay: 46100_00,
    currency: 'NGN',
    generatedAt: '2026-02-25T10:00:00Z',
    payRunId: 'pr-005',
  },
];

export default function MyPayslips() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);

  const { data: payslips, isLoading, isError, refetch } = useQuery<MyPayslip[]>({
    queryKey: ['my-payslips', userId],
    queryFn: async () => {
      // Local mock — no real handler needed
      await new Promise((r) => setTimeout(r, 300));
      return MOCK_PAYSLIPS;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !payslips) {
    return <ErrorState onRetry={refetch} />;
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
              <p className="text-mint-light/50 text-xs mt-0.5">{formatPeriod(latest.period)}</p>
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
                    Period
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide">
                    Pay Group
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide">
                    Generated
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
                      {formatPeriod(slip.period)}
                      {idx === 0 && (
                        <span className="ml-2 text-[10px] bg-fresh-cash/20 text-cash-green px-1.5 py-0.5 rounded-full font-medium">
                          Latest
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-cash-green">{slip.payGroupName}</td>
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
                    <td className="px-5 py-3.5 text-xs text-cash-green/60">
                      {formatDate(slip.generatedAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(PATHS.PAYSLIP_VIEWER(slip.payRunId))}
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
