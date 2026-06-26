import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DownloadCloud, Inbox, FileText, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatPeriod } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import MoneyDisplay from '@/components/ui/MoneyDisplay';

interface PaymentFile {
  id: string;
  payRunId: string;
  period: string;
  payGroupName: string;
  generatedAt: string;
  status: 'ready' | 'downloaded' | 'sent';
  totalAmount: number;
  currency: string;
  employeeCount: number;
  format: 'NIBSS' | 'GTBANK' | 'ZENITH' | 'UBA';
}

const INITIAL_FILES: PaymentFile[] = [
  {
    id: 'pf-001',
    payRunId: 'pr-001',
    period: '2026-06',
    payGroupName: 'Monthly Staff',
    generatedAt: '2026-06-24T09:15:00Z',
    status: 'ready',
    totalAmount: 148500000,
    currency: 'NGN',
    employeeCount: 14,
    format: 'NIBSS',
  },
  {
    id: 'pf-002',
    payRunId: 'pr-002',
    period: '2026-05',
    payGroupName: 'Monthly Staff',
    generatedAt: '2026-05-22T10:30:00Z',
    status: 'downloaded',
    totalAmount: 145200000,
    currency: 'NGN',
    employeeCount: 13,
    format: 'NIBSS',
  },
  {
    id: 'pf-003',
    payRunId: 'pr-003',
    period: '2026-05',
    payGroupName: 'Contract Workers',
    generatedAt: '2026-05-23T14:00:00Z',
    status: 'sent',
    totalAmount: 38750000,
    currency: 'NGN',
    employeeCount: 5,
    format: 'GTBANK',
  },
  {
    id: 'pf-004',
    payRunId: 'pr-004',
    period: '2026-04',
    payGroupName: 'Monthly Staff',
    generatedAt: '2026-04-25T11:45:00Z',
    status: 'sent',
    totalAmount: 142900000,
    currency: 'NGN',
    employeeCount: 13,
    format: 'NIBSS',
  },
];

const statusBadgeMap: Record<PaymentFile['status'], 'warning' | 'info' | 'success'> = {
  ready: 'warning',
  downloaded: 'info',
  sent: 'success',
};

const statusLabelMap: Record<PaymentFile['status'], string> = {
  ready: 'Ready',
  downloaded: 'Downloaded',
  sent: 'Sent',
};

export default function PaymentFiles() {
  const toast = useToast();
  const [localStatuses, setLocalStatuses] = useState<Record<string, PaymentFile['status']>>({});

  const { data: files = [], isLoading, isError } = useQuery<PaymentFile[]>({
    queryKey: ['payment-files'],
    queryFn: async () => INITIAL_FILES,
  });

  const getStatus = (file: PaymentFile): PaymentFile['status'] =>
    localStatuses[file.id] ?? file.status;

  const handleDownload = (file: PaymentFile) => {
    setLocalStatuses((prev) => ({ ...prev, [file.id]: 'downloaded' }));
    toast.success('File downloaded', `${file.format} file for ${formatPeriod(file.period)} saved.`);
  };

  const displayFiles = files.map((f) => ({ ...f, status: getStatus(f) }));

  const readyCount = displayFiles.filter((f) => f.status === 'ready').length;
  const totalAmount = displayFiles.reduce((sum, f) => sum + f.totalAmount, 0);

  const columns = [
    {
      key: 'period',
      header: 'Period',
      render: (row: PaymentFile) => (
        <span className="font-medium text-deep-cash">{formatPeriod(row.period)}</span>
      ),
    },
    {
      key: 'payGroupName',
      header: 'Pay Group',
      render: (row: PaymentFile) => (
        <span className="text-sm text-cash-green">{row.payGroupName}</span>
      ),
    },
    {
      key: 'format',
      header: 'Format',
      render: (row: PaymentFile) => (
        <span className="text-xs font-mono bg-deep-cash/5 text-deep-cash px-2 py-0.5 rounded">
          {row.format}
        </span>
      ),
    },
    {
      key: 'employeeCount',
      header: 'Employees',
      render: (row: PaymentFile) => (
        <span className="text-sm tabular-nums">{row.employeeCount}</span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      render: (row: PaymentFile) => (
        <MoneyDisplay amount={row.totalAmount} currency={row.currency} size="sm" />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: PaymentFile) => (
        <Badge variant={statusBadgeMap[row.status]} label={statusLabelMap[row.status]} />
      ),
    },
    {
      key: 'generatedAt',
      header: 'Generated',
      render: (row: PaymentFile) => (
        <span className="text-xs text-cash-green/70">{formatDate(row.generatedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: PaymentFile) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDownload(row);
          }}
        >
          <DownloadCloud size={14} />
          Download
        </Button>
      ),
    },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        title="Payment Files"
        action={
          <p className="text-sm text-cash-green/70 pt-1">
            Download and submit bank transfer files
          </p>
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
            <FileText size={18} className="text-cash-green" />
          </div>
          <div>
            <p className="text-xs text-cash-green/70 mb-0.5">Total Files</p>
            <p className="text-2xl font-bold text-deep-cash tabular-nums">{displayFiles.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-mint-light px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Clock size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-cash-green/70 mb-0.5">Ready to Download</p>
            <p className="text-2xl font-bold text-deep-cash tabular-nums">{readyCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-mint-light px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-mint-light flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-fresh-cash" />
          </div>
          <div>
            <p className="text-xs text-cash-green/70 mb-0.5">Total Amount Paid</p>
            <MoneyDisplay amount={totalAmount} currency="NGN" size="sm" className="text-deep-cash" />
          </div>
        </div>
      </div>

      {!isLoading && !isError && displayFiles.length === 0 ? (
        <div className="bg-white rounded-xl border border-mint-light p-16 flex flex-col items-center gap-3 text-center">
          <Inbox size={40} className="text-cash-green/30" />
          <p className="text-sm font-medium text-deep-cash">No payment files</p>
          <p className="text-xs text-cash-green/60">Payment files are generated when a pay run is approved.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={displayFiles}
          isLoading={isLoading}
          isError={isError}
          rowKey={(row) => row.id}
          emptyMessage="No payment files found"
        />
      )}
    </div>
  );
}
