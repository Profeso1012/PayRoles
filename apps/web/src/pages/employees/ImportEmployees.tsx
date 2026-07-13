import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, FileSpreadsheet, Inbox } from 'lucide-react';
import { apiClient, BASE_URL } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import type { BackendImportJob, BackendImportStatus } from '@/lib/api/types';

const TERMINAL_STATUSES: BackendImportStatus[] = ['completed', 'failed', 'partially_completed'];

const statusVariant: Record<BackendImportStatus, 'success' | 'warning' | 'error' | 'info' | 'draft'> = {
  pending: 'draft',
  validating: 'info',
  preview: 'info',
  awaiting_approval: 'warning',
  processing: 'warning',
  completed: 'success',
  failed: 'error',
  partially_completed: 'warning',
};

const statusLabel: Record<BackendImportStatus, string> = {
  pending: 'Pending',
  validating: 'Validating',
  preview: 'Preview',
  awaiting_approval: 'Awaiting Approval',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  partially_completed: 'Partially Completed',
};

/** Raw multipart upload — apiClient always sends application/json, so this bypasses it. */
async function uploadWorkersCsv(file: File): Promise<BackendImportJob> {
  const { accessToken } = useAuthStore.getState();
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${BASE_URL}${ENDPOINTS.IMPORTS.WORKERS_UPLOAD}`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: form,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(json?.error?.message ?? 'Upload failed');
  }
  return json.data as BackendImportJob;
}

export default function ImportEmployees() {
  const qc = useQueryClient();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data: jobs, isLoading, isError, refetch } = useQuery<BackendImportJob[]>({
    queryKey: ['import-jobs'],
    queryFn: async () => {
      const response = await apiClient<any>(ENDPOINTS.IMPORTS.LIST);
      return Array.isArray(response) ? response : (response.data || []);
    },
    refetchInterval: (query) => {
      const data = query.state.data as BackendImportJob[] | undefined;
      return data?.some((j) => !TERMINAL_STATUSES.includes(j.status)) ? 3000 : false;
    },
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const job = await uploadWorkersCsv(selectedFile);
      setActiveJobId(job.id);
      toast.success('CSV uploaded — processing in the background');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['import-jobs'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        title="Import Employees"
        breadcrumbs={[{ label: 'Employees', path: '/employees' }, { label: 'Import' }]}
      />

      <div className="bg-white rounded-xl border border-mint-light p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <UploadCloud size={16} className="text-cash-green" />
          <h3 className="text-sm font-semibold text-deep-cash">Upload a CSV file</h3>
        </div>
        <p className="text-sm text-cash-green/70 mb-4">
          Columns required: <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">employeeNumber</code>,{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">firstName</code>,{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">lastName</code>,{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">hireDate</code>. Rows matching an
          existing employee number update that employee; new employee numbers are created.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,text/plain,application/vnd.ms-excel"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="text-sm text-deep-cash file:mr-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-mint-light file:text-cash-green file:text-sm file:font-medium file:cursor-pointer cursor-pointer"
          />
          <Button variant="primary" size="sm" disabled={!selectedFile} loading={uploading} onClick={handleUpload}>
            Upload &amp; Process
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-mint-light overflow-hidden">
        <div className="px-6 py-4 border-b border-mint-light">
          <h3 className="text-sm font-semibold text-deep-cash">Import History</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : isError ? (
          <div className="p-6">
            <Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : !jobs || jobs.length === 0 ? (
          <EmptyState icon={Inbox} title="No imports yet" description="Uploaded CSV files will show up here with row-level results." />
        ) : (
          <div className="divide-y divide-mint-light">
            {jobs.map((job) => (
              <div key={job.id} className={`p-5 ${job.id === activeJobId ? 'bg-mint-light/20' : ''}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet size={15} className="text-cash-green shrink-0" />
                    <p className="text-sm font-medium text-deep-cash truncate">{job.originalFilename}</p>
                  </div>
                  <Badge variant={statusVariant[job.status]} label={statusLabel[job.status]} />
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-cash-green/70">
                  <span>{formatDate(job.createdAt)}</span>
                  {job.status !== 'pending' && (
                    <span className="tabular-nums">
                      {job.successfulRows}/{job.totalRows} rows succeeded
                      {job.failedRows > 0 && <span className="text-red-500"> · {job.failedRows} failed</span>}
                    </span>
                  )}
                </div>
                {job.errorSummary?.reason && (
                  <p className="text-xs text-red-500 mt-2">{job.errorSummary.reason}</p>
                )}
                {job.errorSummary?.errors && job.errorSummary.errors.length > 0 && (
                  <div className="mt-3 max-h-40 overflow-y-auto rounded-md border border-mint-light">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-soft-white">
                          <th className="text-left px-3 py-1.5 font-semibold text-cash-green">Row</th>
                          <th className="text-left px-3 py-1.5 font-semibold text-cash-green">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {job.errorSummary.errors.map((e, i) => (
                          <tr key={i} className="border-t border-mint-light/60">
                            <td className="px-3 py-1.5 text-deep-cash tabular-nums">{e.row}</td>
                            <td className="px-3 py-1.5 text-red-500">{e.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
