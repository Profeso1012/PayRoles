import { useEffect, useRef, useState } from 'react';
import { read as readWorkbook, utils as xlsxUtils } from 'xlsx';
import { UploadCloud, Download, RefreshCw, XCircle, Info } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { errorMessage } from '@/lib/errors';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { BackendImportJob } from '@/lib/api/types';
import { PATHS } from '@/router/paths';
import { CSV_IMPORTS, IMPORT_CANCEL_ROLES, type CsvImportConfig, type CsvImportKind } from './importTypes';

const TERMINAL_IMPORT_STATUSES = new Set(['completed', 'failed', 'partially_completed', 'cancelled']);
const POLL_INTERVAL_MS = 2000;

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadTemplate(config: CsvImportConfig) {
  const header = config.columns.map((c) => c.name);
  const csv = [header.join(','), header.map((h) => csvEscape(config.exampleRow[h] ?? '')).join(',')].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = config.templateFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * The backend only accepts CSV mimetypes, and browsers report .csv
 * inconsistently (often '' on Windows) - so every upload is re-wrapped as an
 * explicit text/csv File. Excel files are converted from their first sheet,
 * keeping cell text as displayed (dates stay YYYY-MM-DD if typed that way).
 */
async function toCsvFile(file: File): Promise<File> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const workbook = readWorkbook(await file.arrayBuffer(), { type: 'array' });
    const csv = xlsxUtils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]], { blankrows: false });
    return new File([csv], file.name.replace(/\.(xlsx|xls)$/i, '.csv'), { type: 'text/csv' });
  }
  return new File([await file.arrayBuffer()], file.name, { type: 'text/csv' });
}

export function CsvImportPage({ kind }: { kind: CsvImportKind }) {
  const config = CSV_IMPORTS[kind];
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canCancel = !!role && IMPORT_CANCEL_ROLES.includes(role);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<BackendImportJob | null>(null);
  const [errorReportUrl, setErrorReportUrl] = useState<string | null>(null);
  const pollTokenRef = useRef(0);

  // Stop any in-flight poll loop when leaving the page.
  useEffect(() => () => { pollTokenRef.current++; }, []);

  async function pollJob(jobId: string, token: number) {
    for (;;) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      if (pollTokenRef.current !== token) return;
      let latest: BackendImportJob;
      try {
        latest = await apiClient<BackendImportJob>(ENDPOINTS.IMPORTS.STATUS(jobId));
      } catch (err) {
        toast.error('Lost track of the import job', errorMessage(err));
        return;
      }
      if (pollTokenRef.current !== token) return;
      setJob(latest);
      if (TERMINAL_IMPORT_STATUSES.has(latest.status)) {
        if (latest.status === 'completed') {
          toast.success(
            `${latest.createdRows} created, ${latest.updatedRows} updated${latest.skippedRows > 0 ? `, ${latest.skippedRows} skipped` : ''}`,
          );
        } else if (latest.status === 'partially_completed') {
          toast.warning(
            `${latest.createdRows} created, ${latest.updatedRows} updated, ${latest.failedRows} failed`,
            'See the row-level errors below for exactly what went wrong.',
          );
        } else if (latest.status === 'failed') {
          toast.error('Import failed', latest.errorSummary?.reason);
        } else {
          toast.info('Import cancelled');
        }
        if (latest.errorReportKey) {
          try {
            const { downloadUrl } = await apiClient<{ downloadUrl: string }>(ENDPOINTS.IMPORTS.ERRORS(jobId));
            if (pollTokenRef.current === token) setErrorReportUrl(downloadUrl);
          } catch {
            // The inline errorSummary already shows the first 20 errors.
          }
        }
        return;
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setJob(null);
    setErrorReportUrl(null);
    const token = ++pollTokenRef.current;
    try {
      const formData = new FormData();
      formData.append('file', await toCsvFile(selectedFile));
      const createdJob = await apiClient<BackendImportJob>(config.uploadEndpoint, { method: 'POST', body: formData });
      setJob(createdJob);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.info('Import started', 'Processing rows in the background…');
      await pollJob(createdJob.id, token);
    } catch (err) {
      toast.error('Failed to start import', errorMessage(err));
    } finally {
      if (pollTokenRef.current === token) setUploading(false);
    }
  };

  const handleCancelJob = async () => {
    if (!job) return;
    try {
      const cancelled = await apiClient<BackendImportJob>(ENDPOINTS.IMPORTS.CANCEL(job.id), { method: 'POST' });
      setJob(cancelled);
      toast.success('Import cancelled');
    } catch (err) {
      toast.error('Failed to cancel import', errorMessage(err));
    }
  };

  const jobInFlight = !!job && !TERMINAL_IMPORT_STATUSES.has(job.status);
  const statusBadgeVariant =
    job?.status === 'completed'
      ? 'success'
      : job?.status === 'failed' || job?.status === 'cancelled'
        ? 'error'
        : job?.status === 'partially_completed'
          ? 'warning'
          : 'info';

  const code = 'text-xs bg-soft-white px-1.5 py-0.5 rounded';

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title={config.title}
        breadcrumbs={[{ label: 'Imports', path: PATHS.IMPORTS }, { label: config.title.replace(/^Import /, '') }]}
      />

      <div className="bg-mint-light/30 border border-fresh-cash/40 rounded-xl p-5 mb-6 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-fresh-cash/20 flex items-center justify-center shrink-0">
          <Info size={18} className="text-fresh-cash" />
        </div>
        <div>
          <p className="font-semibold text-deep-cash mb-1">What happens when you upload</p>
          <p className="text-sm text-cash-green/80">{config.reuploadBehaviour}</p>
          <p className="text-sm text-cash-green/80 mt-2">
            Each row is validated exactly like adding the record by hand, and one bad row never blocks the rest of the file.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-mint-light p-6 mb-6">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <UploadCloud size={16} className="text-cash-green" />
            <h3 className="text-sm font-semibold text-deep-cash">Upload a CSV or Excel file</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => downloadTemplate(config)}>
            <Download size={13} />
            Download CSV Template
          </Button>
        </div>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-cash-green/70 border-b border-mint-light">
                <th className="py-2 pr-4 font-medium">Column</th>
                <th className="py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {config.columns.map((col) => (
                <tr key={col.name} className="border-b border-mint-light/50 last:border-0">
                  <td className="py-1.5 pr-4 whitespace-nowrap align-top">
                    <code className={code}>{col.name}</code>
                    {col.required && <span className="text-red-500 ml-1" title="Required">*</span>}
                  </td>
                  <td className="py-1.5 text-cash-green/80">{col.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-cash-green/60 mt-2">
            <span className="text-red-500">*</span> required. Excel files use their first sheet and are converted to CSV before upload.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              setSelectedFile(e.target.files?.[0] ?? null);
              setJob(null);
              setErrorReportUrl(null);
            }}
            className="text-sm text-deep-cash file:mr-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-mint-light file:text-cash-green file:text-sm file:font-medium file:cursor-pointer cursor-pointer"
          />
          <Button variant="primary" size="sm" disabled={!selectedFile} loading={uploading} onClick={handleUpload}>
            Upload &amp; Process
          </Button>
        </div>
      </div>

      {job && (
        <div className="bg-white rounded-xl border border-mint-light overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-mint-light flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-deep-cash">Import Progress</h3>
              <Badge variant={statusBadgeVariant} label={job.status.replace(/_/g, ' ')} />
            </div>
            {jobInFlight && canCancel && (
              <Button variant="ghost" size="sm" onClick={handleCancelJob}>
                <XCircle size={13} />
                Cancel
              </Button>
            )}
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {[
                { label: 'Created', value: job.createdRows },
                { label: 'Updated', value: job.updatedRows },
                { label: 'Skipped', value: job.skippedRows },
                { label: 'Failed', value: job.failedRows },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-soft-white border border-mint-light px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-cash-green/70">{s.label}</p>
                  <p className={`text-lg font-semibold tabular-nums ${s.label === 'Failed' && s.value > 0 ? 'text-red-500' : 'text-deep-cash'}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-cash-green/70 tabular-nums">
              {job.processedRows} / {job.totalRows} rows processed
            </p>
            {jobInFlight && (
              <div className="flex items-center gap-2 mt-3 text-xs text-cash-green/70">
                <RefreshCw size={13} className="animate-spin" />
                Processing in the background…
              </div>
            )}
            {job.errorSummary?.reason && <p className="text-sm text-red-500 mt-3">{job.errorSummary.reason}</p>}
            {job.errorSummary?.errors && job.errorSummary.errors.length > 0 && (
              <div className="mt-3 flex flex-col gap-1 max-h-80 overflow-y-auto">
                {job.errorSummary.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-500" title={e.code}>
                    Row {e.row} failed because {e.message}
                  </p>
                ))}
              </div>
            )}
            {errorReportUrl && (
              <a
                href={errorReportUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-fresh-cash hover:text-cash-green mt-3 inline-block"
              >
                Download full error report
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CompensationImport() {
  return <CsvImportPage kind="compensation" />;
}
export function PayElementsImport() {
  return <CsvImportPage kind="pay-elements" />;
}
export function AssignmentsImport() {
  return <CsvImportPage kind="assignments" />;
}
export function LegalEntitiesImport() {
  return <CsvImportPage kind="legal-entities" />;
}
