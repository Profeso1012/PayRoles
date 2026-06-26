import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, TrendingUp, Wallet, Building2 } from 'lucide-react';
import { formatPeriod } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Select from '@/components/ui/Select';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

interface DeptCost {
  department: string;
  headcount: number;
  grossPay: number;
  employerPension: number;
  totalCost: number;
  currency: string;
}

interface PayGroupCost {
  payGroupName: string;
  period: string;
  headcount: number;
  totalGross: number;
  totalNet: number;
  currency: string;
}

interface CostData {
  departments: DeptCost[];
  payGroups: PayGroupCost[];
}

const MOCK_DEPT: DeptCost[] = [
  { department: 'Engineering', headcount: 4, grossPay: 165000000, employerPension: 16500000, totalCost: 181500000, currency: 'NGN' },
  { department: 'Finance', headcount: 2, grossPay: 85000000, employerPension: 8500000, totalCost: 93500000, currency: 'NGN' },
  { department: 'HR', headcount: 1, grossPay: 35000000, employerPension: 3500000, totalCost: 38500000, currency: 'NGN' },
  { department: 'Operations', headcount: 3, grossPay: 120000000, employerPension: 12000000, totalCost: 132000000, currency: 'NGN' },
  { department: 'Sales', headcount: 3, grossPay: 112500000, employerPension: 11250000, totalCost: 123750000, currency: 'NGN' },
  { department: 'Legal', headcount: 1, grossPay: 48000000, employerPension: 4800000, totalCost: 52800000, currency: 'NGN' },
];

const MOCK_PAY_GROUPS: PayGroupCost[] = [
  { payGroupName: 'Monthly Staff', period: '2026-06', headcount: 11, totalGross: 455000000, totalNet: 386750000, currency: 'NGN' },
  { payGroupName: 'Contract Workers', period: '2026-06', headcount: 3, totalGross: 110500000, totalNet: 93925000, currency: 'NGN' },
  { payGroupName: 'Executives', period: '2026-06', headcount: 2, totalGross: 160000000, totalNet: 136000000, currency: 'NGN' },
  { payGroupName: 'Part-time', period: '2026-06', headcount: 2, totalGross: 50000000, totalNet: 42500000, currency: 'NGN' },
];

const periodOptions = [
  { value: '2026-06', label: 'June 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-04', label: 'April 2026' },
  { value: '2026-03', label: 'March 2026' },
  { value: '2026-02', label: 'February 2026' },
  { value: '2026-01', label: 'January 2026' },
];

export default function CostSummary() {
  const [period, setPeriod] = useState('2026-06');

  const { data, isLoading, isError, refetch } = useQuery<CostData>({
    queryKey: ['cost-summary', period],
    queryFn: async () => ({
      departments: MOCK_DEPT,
      payGroups: MOCK_PAY_GROUPS.map((pg) => ({ ...pg, period })),
    }),
  });

  const depts = data?.departments ?? [];
  const payGroups = data?.payGroups ?? [];

  const grandHeadcount = depts.reduce((s, d) => s + d.headcount, 0);
  const grandGross = depts.reduce((s, d) => s + d.grossPay, 0);
  const grandNet = payGroups.reduce((s, pg) => s + pg.totalNet, 0);
  const grandEmployerCost = depts.reduce((s, d) => s + d.totalCost, 0);

  if (isError) {
    return (
      <div style={{ width: '100%', maxWidth: '1300px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '1300px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        title="Cost Summary"
        action={
          <div className="w-44">
            <Select value={period} options={periodOptions} onChange={setPeriod} />
          </div>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="bg-white rounded-xl border border-mint-light px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-mint-light flex items-center justify-center shrink-0">
            <Users size={18} className="text-cash-green" />
          </div>
          <div>
            <p className="text-xs text-cash-green/70 mb-0.5">Total Headcount</p>
            <p className="text-2xl font-bold text-deep-cash tabular-nums">{grandHeadcount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-mint-light px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-mint-light flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-fresh-cash" />
          </div>
          <div>
            <p className="text-xs text-cash-green/70 mb-0.5">Total Gross</p>
            <MoneyDisplay amount={grandGross} currency="NGN" size="sm" className="text-deep-cash font-bold text-lg" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-mint-light px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-mint-light flex items-center justify-center shrink-0">
            <Wallet size={18} className="text-fresh-cash" />
          </div>
          <div>
            <p className="text-xs text-cash-green/70 mb-0.5">Total Net</p>
            <MoneyDisplay amount={grandNet} currency="NGN" size="sm" className="text-fresh-cash font-bold text-lg" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-mint-light px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-deep-cash/10 flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-deep-cash" />
          </div>
          <div>
            <p className="text-xs text-cash-green/70 mb-0.5">Total Employer Cost</p>
            <MoneyDisplay amount={grandEmployerCost} currency="NGN" size="sm" className="text-deep-cash font-bold text-lg" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))',
            gap: '1.5rem',
          }}
        >
          <div className="bg-white rounded-xl border border-mint-light overflow-hidden">
            <div className="px-5 py-3 border-b border-mint-light">
              <p className="text-sm font-semibold text-deep-cash">By Department</p>
              <p className="text-xs text-cash-green/60 mt-0.5">{formatPeriod(period)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-deep-cash/5 border-b border-mint-light">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Department</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">HC</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Gross Pay</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Employer Pension</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {depts.map((dept, idx) => (
                    <tr
                      key={dept.department}
                      className={idx < depts.length - 1 ? 'border-b border-mint-light/50 hover:bg-soft-white' : 'hover:bg-soft-white'}
                    >
                      <td className="px-4 py-3 font-medium text-deep-cash">{dept.department}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-cash-green">{dept.headcount}</td>
                      <td className="px-4 py-3 text-right">
                        <MoneyDisplay amount={dept.grossPay} currency={dept.currency} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MoneyDisplay amount={dept.employerPension} currency={dept.currency} size="sm" className="text-cash-gold" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MoneyDisplay amount={dept.totalCost} currency={dept.currency} size="sm" className="text-deep-cash font-semibold" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-mint-light bg-deep-cash/5">
                    <td className="px-4 py-3 text-xs font-bold text-deep-cash uppercase tracking-wide">Totals</td>
                    <td className="px-4 py-3 text-right font-bold text-deep-cash tabular-nums">{grandHeadcount}</td>
                    <td className="px-4 py-3 text-right">
                      <MoneyDisplay amount={grandGross} currency="NGN" size="sm" className="font-bold text-deep-cash" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoneyDisplay amount={depts.reduce((s, d) => s + d.employerPension, 0)} currency="NGN" size="sm" className="font-bold text-cash-gold" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoneyDisplay amount={grandEmployerCost} currency="NGN" size="sm" className="font-bold text-deep-cash" />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-mint-light overflow-hidden">
            <div className="px-5 py-3 border-b border-mint-light">
              <p className="text-sm font-semibold text-deep-cash">By Pay Group</p>
              <p className="text-xs text-cash-green/60 mt-0.5">{formatPeriod(period)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-deep-cash/5 border-b border-mint-light">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Pay Group</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Employees</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Gross</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {payGroups.map((pg, idx) => (
                    <tr
                      key={pg.payGroupName}
                      className={idx < payGroups.length - 1 ? 'border-b border-mint-light/50 hover:bg-soft-white' : 'hover:bg-soft-white'}
                    >
                      <td className="px-4 py-3 font-medium text-deep-cash">{pg.payGroupName}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-cash-green">{pg.headcount}</td>
                      <td className="px-4 py-3 text-right">
                        <MoneyDisplay amount={pg.totalGross} currency={pg.currency} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MoneyDisplay amount={pg.totalNet} currency={pg.currency} size="sm" className="text-fresh-cash" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-mint-light bg-deep-cash/5">
                    <td className="px-4 py-3 text-xs font-bold text-deep-cash uppercase tracking-wide">Totals</td>
                    <td className="px-4 py-3 text-right font-bold text-deep-cash tabular-nums">
                      {payGroups.reduce((s, pg) => s + pg.headcount, 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoneyDisplay amount={payGroups.reduce((s, pg) => s + pg.totalGross, 0)} currency="NGN" size="sm" className="font-bold text-deep-cash" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoneyDisplay amount={grandNet} currency="NGN" size="sm" className="font-bold text-fresh-cash" />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
