import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { formatDate, formatPeriod } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

interface StatReport {
  id: string;
  type: 'PAYE' | 'PENSION' | 'NHF';
  period: string;
  totalAmount: number;
  employeeCount: number;
  status: 'due' | 'submitted' | 'overdue';
  dueDate: string;
  currency: string;
}

const MOCK_REPORTS: StatReport[] = [
  { id: 'stat-001', type: 'PAYE', period: '2026-06', totalAmount: 27200000, employeeCount: 8, status: 'due', dueDate: '2026-07-20', currency: 'NGN' },
  { id: 'stat-002', type: 'PAYE', period: '2026-05', totalAmount: 26400000, employeeCount: 8, status: 'submitted', dueDate: '2026-06-20', currency: 'NGN' },
  { id: 'stat-003', type: 'PAYE', period: '2026-04', totalAmount: 25800000, employeeCount: 7, status: 'submitted', dueDate: '2026-05-20', currency: 'NGN' },
  { id: 'stat-004', type: 'PAYE', period: '2026-03', totalAmount: 24600000, employeeCount: 7, status: 'overdue', dueDate: '2026-04-20', currency: 'NGN' },
  { id: 'stat-005', type: 'PENSION', period: '2026-06', totalAmount: 13600000, employeeCount: 8, status: 'due', dueDate: '2026-07-18', currency: 'NGN' },
  { id: 'stat-006', type: 'PENSION', period: '2026-05', totalAmount: 13200000, employeeCount: 8, status: 'submitted', dueDate: '2026-06-18', currency: 'NGN' },
  { id: 'stat-007', type: 'PENSION', period: '2026-04', totalAmount: 12900000, employeeCount: 7, status: 'submitted', dueDate: '2026-05-18', currency: 'NGN' },
  { id: 'stat-008', type: 'PENSION', period: '2026-03', totalAmount: 12300000, employeeCount: 7, status: 'submitted', dueDate: '2026-04-18', currency: 'NGN' },
  { id: 'stat-009', type: 'NHF', period: '2026-06', totalAmount: 10200000, employeeCount: 8, status: 'due', dueDate: '2026-07-15', currency: 'NGN' },
  { id: 'stat-010', type: 'NHF', period: '2026-05', totalAmount: 9900000, employeeCount: 8, status: 'submitted', dueDate: '2026-06-15', currency: 'NGN' },
  { id: 'stat-011', type: 'NHF', period: '2026-04', totalAmount: 9675000, employeeCount: 7, status: 'submitted', dueDate: '2026-05-15', currency: 'NGN' },
  { id: 'stat-012', type: 'NHF', period: '2026-03', totalAmount: 9225000, employeeCount: 7, status: 'overdue', dueDate: '2026-04-15', currency: 'NGN' },
];

const statusBadgeMap: Record<StatReport['status'], 'warning' | 'success' | 'danger'> = {
  due: 'warning',
  submitted: 'success',
  overdue: 'danger',
};

const statusLabelMap: Record<StatReport['status'], string> = {
  due: 'Due',
  submitted: 'Submitted',
  overdue: 'Overdue',
};

const periodOptions = [
  { value: '', label: 'All periods' },
  { value: '2026-06', label: 'June 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-04', label: 'April 2026' },
  { value: '2026-03', label: 'March 2026' },
];

const tabDefs = [
  { id: 'PAYE', label: 'PAYE' },
  { id: 'PENSION', label: 'Pension' },
  { id: 'NHF', label: 'NHF' },
];

function ReportTable({ rows }: { rows: StatReport[] }) {
  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-cash-green/50">No records for selected period.</div>
    );
  }

  const totalDue = rows
    .filter((r) => r.status === 'due' || r.status === 'overdue')
    .reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-deep-cash/5 border-b border-mint-light">
              <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Period</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Employees</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Due Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green uppercase tracking-wide whitespace-nowrap">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.id}
                className={idx < rows.length - 1 ? 'border-b border-mint-light/50 hover:bg-soft-white' : 'hover:bg-soft-white'}
              >
                <td className="px-4 py-3 font-medium text-deep-cash">{formatPeriod(row.period)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.employeeCount}</td>
                <td className="px-4 py-3 text-right">
                  <MoneyDisplay amount={row.totalAmount} currency={row.currency} size="sm" />
                </td>
                <td className="px-4 py-3 text-sm text-cash-green/80">{formatDate(row.dueDate)}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusBadgeMap[row.status]} label={statusLabelMap[row.status]} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="secondary" size="sm">
                    <Download size={13} />
                    Download
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-mint-light bg-soft-white flex items-center justify-between">
        <span className="text-xs text-cash-green/70">Total due this quarter</span>
        <MoneyDisplay amount={totalDue} currency="NGN" size="sm" className="text-amber-700 font-bold" />
      </div>
    </div>
  );
}

export default function StatutoryReports() {
  const [period, setPeriod] = useState('');
  const [activeTab, setActiveTab] = useState('PAYE');

  const { data: reports = [], isLoading, isError, refetch } = useQuery<StatReport[]>({
    queryKey: ['statutory-reports', period],
    queryFn: async () => {
      if (!period) return MOCK_REPORTS;
      return MOCK_REPORTS.filter((r) => r.period === period);
    },
  });

  const tabRows = reports.filter((r) => r.type === activeTab);

  const tabsWithCount = tabDefs.map((t) => ({
    ...t,
    count: reports.filter((r) => r.type === t.id).length,
  }));

  if (isError) {
    return (
      <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-bold text-deep-cash leading-tight">
            Statutory Reports
          </h1>
          <p className="text-sm text-cash-green/70 mt-1">PAYE, Pension, and NHF compliance schedules</p>
        </div>
        <div className="w-44 shrink-0">
          <Select
            value={period}
            options={periodOptions}
            onChange={setPeriod}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-mint-light overflow-hidden">
          <Tabs tabs={tabsWithCount} activeTab={activeTab} onChange={setActiveTab} className="px-4 pt-1" />
          <ReportTable rows={tabRows} />
        </div>
      )}
    </div>
  );
}
