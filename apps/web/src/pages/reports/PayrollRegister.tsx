import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { formatPeriod } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

interface RegisterRow {
  employeeId: string;
  name: string;
  employeeNumber: string;
  department: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  paye: number;
  pension: number;
  nhf: number;
  currency: string;
}

const MOCK_REGISTER: RegisterRow[] = [
  { employeeId: 'emp-1', name: 'Chidi Okeke', employeeNumber: 'EMP-001', department: 'Engineering', grossPay: 50000000, totalDeductions: 7500000, netPay: 42500000, paye: 4000000, pension: 2000000, nhf: 1500000, currency: 'NGN' },
  { employeeId: 'emp-2', name: 'Amaka Okonkwo', employeeNumber: 'EMP-002', department: 'Finance', grossPay: 45000000, totalDeductions: 6750000, netPay: 38250000, paye: 3600000, pension: 1800000, nhf: 1350000, currency: 'NGN' },
  { employeeId: 'emp-3', name: 'Emeka Nwosu', employeeNumber: 'EMP-003', department: 'Engineering', grossPay: 60000000, totalDeductions: 9000000, netPay: 51000000, paye: 4800000, pension: 2400000, nhf: 1800000, currency: 'NGN' },
  { employeeId: 'emp-4', name: 'Ngozi Adeyemi', employeeNumber: 'EMP-004', department: 'HR', grossPay: 35000000, totalDeductions: 5250000, netPay: 29750000, paye: 2800000, pension: 1400000, nhf: 1050000, currency: 'NGN' },
  { employeeId: 'emp-5', name: 'Bola Adesanya', employeeNumber: 'EMP-005', department: 'Operations', grossPay: 42000000, totalDeductions: 6300000, netPay: 35700000, paye: 3360000, pension: 1680000, nhf: 1260000, currency: 'NGN' },
  { employeeId: 'emp-6', name: 'Tunde Fashola', employeeNumber: 'EMP-006', department: 'Engineering', grossPay: 55000000, totalDeductions: 8250000, netPay: 46750000, paye: 4400000, pension: 2200000, nhf: 1650000, currency: 'NGN' },
  { employeeId: 'emp-7', name: 'Chioma Eze', employeeNumber: 'EMP-007', department: 'Finance', grossPay: 40000000, totalDeductions: 6000000, netPay: 34000000, paye: 3200000, pension: 1600000, nhf: 1200000, currency: 'NGN' },
  { employeeId: 'emp-8', name: 'Seun Abiodun', employeeNumber: 'EMP-008', department: 'Operations', grossPay: 38000000, totalDeductions: 5700000, netPay: 32300000, paye: 3040000, pension: 1520000, nhf: 1140000, currency: 'NGN' },
];

const periodOptions = [
  { value: '2026-06', label: 'June 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-04', label: 'April 2026' },
  { value: '2026-03', label: 'March 2026' },
  { value: '2026-02', label: 'February 2026' },
  { value: '2026-01', label: 'January 2026' },
];

export default function PayrollRegister() {
  const [period, setPeriod] = useState('2026-06');

  const { data: rows = [], isLoading, isError, refetch } = useQuery<RegisterRow[]>({
    queryKey: ['payroll-register', period],
    queryFn: async () => {
      return MOCK_REGISTER;
    },
  });

  const totalGross = rows.reduce((s, r) => s + r.grossPay, 0);
  const totalDeductions = rows.reduce((s, r) => s + r.totalDeductions, 0);
  const totalNet = rows.reduce((s, r) => s + r.netPay, 0);
  const totalPaye = rows.reduce((s, r) => s + r.paye, 0);
  const totalPension = rows.reduce((s, r) => s + r.pension, 0);
  const totalNhf = rows.reduce((s, r) => s + r.nhf, 0);

  if (isError) {
    return (
      <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '1300px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        title="Payroll Register"
        action={
          <div className="flex items-center gap-3">
            <div className="w-44">
              <Select
                value={period}
                options={periodOptions}
                onChange={setPeriod}
              />
            </div>
            <Button variant="secondary">
              <Download size={15} />
              Export
            </Button>
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
        {[
          { label: 'Total Gross', amount: totalGross },
          { label: 'Total Deductions', amount: totalDeductions },
          { label: 'Total Net Pay', amount: totalNet },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-mint-light px-5 py-4">
            <p className="text-xs text-cash-green/70 mb-1">{card.label}</p>
            <MoneyDisplay amount={card.amount} currency="NGN" size="sm" className="text-deep-cash text-lg font-bold" />
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-mint-light overflow-hidden">
          <div className="px-5 py-3 border-b border-mint-light flex items-center justify-between">
            <p className="text-sm font-semibold text-deep-cash">
              {formatPeriod(period)} — Employee Payslip Summary
            </p>
            <span className="text-xs text-cash-green/60">{rows.length} employees</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-deep-cash/5 border-b border-mint-light">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Emp No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Department</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Gross Pay</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">PAYE</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Pension</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">NHF</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={row.employeeId}
                    className={idx < rows.length - 1 ? 'border-b border-mint-light/50 hover:bg-soft-white' : 'hover:bg-soft-white'}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-cash-green/70">{row.employeeNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-deep-cash whitespace-nowrap">{row.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-cash-green">{row.department}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoneyDisplay amount={row.grossPay} currency={row.currency} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoneyDisplay amount={row.paye} currency={row.currency} size="sm" className="text-red-500" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoneyDisplay amount={row.pension} currency={row.currency} size="sm" className="text-red-500" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoneyDisplay amount={row.nhf} currency={row.currency} size="sm" className="text-red-500" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoneyDisplay amount={row.netPay} currency={row.currency} size="sm" className="text-fresh-cash" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-mint-light bg-deep-cash/5">
                  <td colSpan={3} className="px-4 py-3 text-sm font-bold text-deep-cash">
                    TOTALS
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MoneyDisplay amount={totalGross} currency="NGN" size="sm" className="font-bold text-deep-cash" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MoneyDisplay amount={totalPaye} currency="NGN" size="sm" className="font-bold text-red-600" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MoneyDisplay amount={totalPension} currency="NGN" size="sm" className="font-bold text-red-600" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MoneyDisplay amount={totalNhf} currency="NGN" size="sm" className="font-bold text-red-600" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MoneyDisplay amount={totalNet} currency="NGN" size="sm" className="font-bold text-fresh-cash" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
