import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileBarChart, FileSpreadsheet, Download } from 'lucide-react';
import { apiClient, downloadFile } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { minorToMajor } from '@/lib/api/transforms';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import type { BackendDisbursementBatch, BackendProviderType } from '@/lib/api/types';

const PROVIDER_LABELS: Record<BackendProviderType, string> = {
  manual_bank_file: 'Manual Bank File',
  monnify: 'Monnify',
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
  remita: 'Remita',
};

const REPORT_FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'pdf', label: 'PDF' },
];

const REPORT_EXTENSION: Record<'csv' | 'excel' | 'pdf', string> = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DisbursementReports() {
  const navigate = useNavigate();
  const toast = useToast();

  const { data: batches, isLoading: batchesLoading } = useQuery<BackendDisbursementBatch[]>({
    queryKey: ['disbursement-reports-batches'],
    queryFn: () => apiClient<BackendDisbursementBatch[]>(ENDPOINTS.DISBURSEMENT.DASHBOARD.BATCHES(50)),
  });

  const [batchId, setBatchId] = useState('');
  const [batchFormat, setBatchFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [batchDownloading, setBatchDownloading] = useState(false);

  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [summaryFormat, setSummaryFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [summaryDownloading, setSummaryDownloading] = useState(false);

  const batchOptions = (batches ?? []).map((b) => ({
    value: b.id,
    label: `${b.reference} — ${PROVIDER_LABELS[b.providerType] ?? b.providerType} — ${formatDate(b.createdAt)}`,
  }));

  const selectedBatch = batches?.find((b) => b.id === batchId);

  async function handleBatchDownload() {
    if (!batchId) return;
    setBatchDownloading(true);
    try {
      await downloadFile(
        ENDPOINTS.DISBURSEMENT.REPORTS.BATCH(batchId, batchFormat),
        `disbursement-batch-${selectedBatch?.reference ?? batchId}.${REPORT_EXTENSION[batchFormat]}`,
      );
      toast.success('Report downloaded');
    } catch (err) {
      toast.error('Failed to download batch report', err instanceof Error ? err.message : undefined);
    } finally {
      setBatchDownloading(false);
    }
  }

  async function handleSummaryDownload() {
    setSummaryDownloading(true);
    try {
      await downloadFile(
        ENDPOINTS.DISBURSEMENT.REPORTS.SUMMARY({ format: summaryFormat, from, to }),
        `disbursement-summary-${from}-to-${to}.${REPORT_EXTENSION[summaryFormat]}`,
      );
      toast.success('Report downloaded');
    } catch (err) {
      toast.error('Failed to download summary report', err instanceof Error ? err.message : undefined);
    } finally {
      setSummaryDownloading(false);
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '820px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <button
        onClick={() => navigate('/payments')}
        className="flex items-center gap-2 text-sm text-cash-green hover:text-deep-cash transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        Back to Payments
      </button>
      <PageHeader title="Disbursement Reports" />

      {/* Batch report */}
      <div className="bg-white rounded-xl border border-mint-light p-6 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <FileBarChart size={16} className="text-cash-green" />
          <h3 className="text-sm font-semibold text-deep-cash">Batch Report</h3>
        </div>
        <p className="text-xs text-cash-green/60 mb-5">
          A detailed, per-transaction report for a single disbursement batch — worker, account, amount, and status.
        </p>
        {batchesLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : !batches || batches.length === 0 ? (
          <p className="text-sm text-cash-green/60">No disbursement batches yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Select
                label="Batch"
                value={batchId}
                options={batchOptions}
                onChange={setBatchId}
                placeholder="Select a batch"
              />
            </div>
            {selectedBatch && (
              <div className="sm:col-span-2 flex items-center gap-4 text-xs text-cash-green/70 -mt-1">
                <span>{selectedBatch.successfulCount}/{selectedBatch.totalCount} paid</span>
                <MoneyDisplay amount={minorToMajor(selectedBatch.totalAmountMinor)} currency={selectedBatch.currency} size="sm" />
              </div>
            )}
            <Select
              label="Format"
              value={batchFormat}
              options={REPORT_FORMAT_OPTIONS}
              onChange={(v) => setBatchFormat(v as 'csv' | 'excel' | 'pdf')}
            />
            <div className="flex items-end">
              <Button
                variant="primary"
                className="w-full"
                disabled={!batchId}
                loading={batchDownloading}
                onClick={handleBatchDownload}
              >
                <Download size={14} />
                Download Batch Report
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Summary report */}
      <div className="bg-white rounded-xl border border-mint-light p-6">
        <div className="flex items-center gap-2 mb-2">
          <FileSpreadsheet size={16} className="text-cash-green" />
          <h3 className="text-sm font-semibold text-deep-cash">Period Summary Report</h3>
        </div>
        <p className="text-xs text-cash-green/60 mb-5">
          Every disbursement transaction across all batches within a date range.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Select
            label="Format"
            value={summaryFormat}
            options={REPORT_FORMAT_OPTIONS}
            onChange={(v) => setSummaryFormat(v as 'csv' | 'excel' | 'pdf')}
          />
          <div className="flex items-end">
            <Button
              variant="primary"
              className="w-full"
              disabled={!from || !to}
              loading={summaryDownloading}
              onClick={handleSummaryDownload}
            >
              <Download size={14} />
              Download Summary Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
