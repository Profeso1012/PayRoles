import type { Payslip } from '@contracts/types/payroll';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import { formatPeriod, formatDate } from '@/lib/utils';

interface PayslipPreviewProps {
  payslip: Payslip;
}

export default function PayslipPreview({ payslip }: PayslipPreviewProps) {
  const earnings = payslip.elements.filter((el) => el.type === 'earning');
  const deductions = payslip.elements.filter((el) => el.type === 'deduction');

  const totalEarnings = earnings.reduce((sum, el) => sum + el.amount, 0);
  const totalDeductions = deductions.reduce((sum, el) => sum + el.amount, 0);

  return (
    <div className="bg-white rounded-xl border border-mint-light overflow-hidden print:border-0">
      <div className="bg-deep-cash text-white px-8 py-6 flex justify-between items-start">
        <div>
          <img src="/assets/payrole-logo.png" alt="PayRole" className="h-7" />
          <p className="text-sm text-white/70 mt-1">Official Payslip</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{payslip.payGroupName}</p>
          <p className="text-sm text-white/70">{formatPeriod(payslip.period)}</p>
          <p className="text-xs text-white/50 mt-1">
            Issued: {formatDate(payslip.issuedAt || payslip.createdAt || payslip.generatedAt || '')}
          </p>
        </div>
      </div>

      <div className="px-8 py-5 bg-mint-light/30 border-b border-mint-light grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-cash-green uppercase tracking-wide mb-1">Employee</p>
          <p className="text-sm font-medium text-deep-cash">{payslip.employeeName}</p>
          <p className="text-xs text-cash-green/70">{payslip.employeeNumber}</p>
        </div>
        <div>
          <p className="text-xs text-cash-green uppercase tracking-wide mb-1">Period</p>
          <p className="text-sm font-medium text-deep-cash">{formatPeriod(payslip.period)}</p>
        </div>
      </div>

      <div className="px-8 pt-6">
        <p className="text-sm font-semibold text-deep-cash mb-3">Earnings</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mint-light">
              <th className="text-xs uppercase text-cash-green/70 text-left pb-2 font-medium">Description</th>
              <th className="text-xs uppercase text-cash-green/70 text-right pb-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {earnings.map((el) => (
              <tr key={el.id} className="border-b border-mint-light/50">
                <td className="py-2 text-deep-cash">{el.name}</td>
                <td className="py-2 text-right">
                  <MoneyDisplay amount={el.amount} currency={payslip.currency} />
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-2 font-bold text-fresh-cash">Total Earnings</td>
              <td className="py-2 text-right font-bold text-fresh-cash">
                <MoneyDisplay amount={totalEarnings} currency={payslip.currency} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="px-8 pt-4">
        <p className="text-sm font-semibold text-deep-cash mb-3">Deductions</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mint-light">
              <th className="text-xs uppercase text-cash-green/70 text-left pb-2 font-medium">Description</th>
              <th className="text-xs uppercase text-cash-green/70 text-right pb-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {deductions.map((el) => (
              <tr key={el.id} className="border-b border-mint-light/50">
                <td className="py-2 text-deep-cash">{el.name}</td>
                <td className="py-2 text-right">
                  <MoneyDisplay amount={el.amount} currency={payslip.currency} />
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-2 font-bold text-red-500">Total Deductions</td>
              <td className="py-2 text-right font-bold text-red-500">
                <MoneyDisplay amount={totalDeductions} currency={payslip.currency} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-deep-cash text-white px-8 py-5 flex justify-between items-center mt-6">
        <span className="text-sm font-medium text-white/80">Net Pay</span>
        <MoneyDisplay
          amount={payslip.netPay}
          currency={payslip.currency}
          className="text-2xl font-bold text-cash-gold"
        />
      </div>
    </div>
  );
}
