import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DownloadCloud, FileOutput, Inbox } from 'lucide-react';
import { apiClient, apiClientWithMeta } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { errorMessage } from '@/lib/errors';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Pagination from '@/components/ui/Pagination';
import type {
  BackendExportJob,
  BackendExportStatus,
  BackendExportEntityType,
  BackendExportFormat,
  CreateExportJobRequest,
} from '@/lib/api/types';

const TERMINAL_STATUSES: BackendExportStatus[] = ['completed', 'failed', 'expired'];

// gl_journals stays in the backend enum (and in entityLabel, for old jobs)
// but CreateExportJobDto rejects it - it has no generator yet.
const ENTITY_OPTIONS: { value: BackendExportEntityType; label: string }[] = [
  { value: 'workers', label: 'Worker list' },
  { value: 'payroll_register', label: 'Payroll register' },
  { value: 'payslips', label: 'Payslips' },
  { value: 'audit_logs', label: 'Audit logs' },
];

// Every backend ExportFormat value - export-processor.service.ts implements
// csv, xlsx, json and pdf.
const FORMAT_OPTIONS: { value: BackendExportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'pdf', label: 'PDF' },
  { value: 'json', label: 'JSON' },
];

const PAGE_SIZE = 20;

const entityLabel: Record<BackendExportEntityType, string> = {
  workers: 'Worker list',
  payroll_register: 'Payroll register',
  payslips: 'Payslips',
  audit_logs: 'Audit logs',
  gl_journals: 'GL journals',
};

const statusVariant: Record<BackendExportStatus, 'success' | 'warning' | 'error' | 'info' | 'draft'> = {
  pending: 'draft',
  processing: 'warning',
  completed: 'success',
  failed: 'error',
  expired: 'info',
};

const statusLabel: Record<BackendExportStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  expired: 'Expired',
};

export default function Exports() {
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  // hr_officer holds EXPORT_CREATE+EXPORT_READ but not EXPORT_DOWNLOAD; auditor
  // holds EXPORT_READ+EXPORT_DOWNLOAD but not EXPORT_CREATE (roles.enum.ts).
  const canCreate = role !== 'auditor';
  const canDownload = role !== 'hr_officer';

  const [entityType, setEntityType] = useState<BackendExportEntityType>('workers');
  const [format, setFormat] = useState<BackendExportFormat>('csv');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // The list endpoint is paginated (PaginationDto, default limit 20) - page
  // through it rather than silently showing only the newest 20 jobs.
  const { data, isLoading, isError, error, refetch } = useQuery<{ jobs: BackendExportJob[]; total: number }>({
    queryKey: ['export-jobs', page],
    queryFn: async () => {
      const { data: rows, meta } = await apiClientWithMeta<BackendExportJob[]>(
        `${ENDPOINTS.EXPORTS.LIST}?${buildPaginationParams({ page, limit: PAGE_SIZE })}`,
      );
      const jobs = Array.isArray(rows) ? rows : [];
      return { jobs, total: meta?.total ?? jobs.length };
    },
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const d = query.state.data as { jobs: BackendExportJob[] } | undefined;
      return d?.jobs.some((j) => !TERMINAL_STATUSES.includes(j.status)) ? 3000 : false;
    },
  });
  const jobs = data?.jobs;
  const total = data?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient<BackendExportJob>(ENDPOINTS.EXPORTS.CREATE, {
        method: 'POST',
        body: JSON.stringify({ entityType, format } satisfies CreateExportJobRequest),
      }),
    onSuccess: () => {
      toast.success('Export queued — this usually takes a few seconds');
      setPage(1);
      qc.invalidateQueries({ queryKey: ['export-jobs'] });
    },
    onError: (err) => toast.error('Failed to queue export', errorMessage(err)),
  });

  const handleDownload = async (job: BackendExportJob) => {
    // Open the tab synchronously, inside the click gesture - a window.open()
    // issued after the await below is treated as an unsolicited pop-up and
    // blocked. Navigate it once the signed URL arrives; close it on failure.
    const win = window.open('', '_blank');
    if (win) win.opener = null;
    setDownloadingId(job.id);
    try {
      const { downloadUrl } = await apiClient<{ downloadUrl: string }>(ENDPOINTS.EXPORTS.DOWNLOAD(job.id));
      if (win) win.location.href = downloadUrl;
      else window.location.assign(downloadUrl);
    } catch (err) {
      win?.close();
      toast.error('Failed to get download link', errorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader title="Exports" />

      {canCreate && (
        <div className="bg-white rounded-xl border border-mint-light p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileOutput size={16} className="text-cash-green" />
            <h3 className="text-sm font-semibold text-deep-cash">New Export</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="What to export" value={entityType} options={ENTITY_OPTIONS} onChange={(v) => setEntityType(v as BackendExportEntityType)} />
            <Select label="Format" value={format} options={FORMAT_OPTIONS} onChange={(v) => setFormat(v as BackendExportFormat)} />
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="primary" size="sm" loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
              Queue Export
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-mint-light overflow-hidden">
        <div className="px-6 py-4 border-b border-mint-light">
          <h3 className="text-sm font-semibold text-deep-cash">Export History</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : isError ? (
          <ErrorState error={error} message={errorMessage(error, 'Could not load exports.')} onRetry={() => refetch()} />
        ) : !jobs || jobs.length === 0 ? (
          <EmptyState icon={Inbox} title="No exports yet" description="Files you queue for export will show up here once ready to download." />
        ) : (
          <div className="divide-y divide-mint-light">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between gap-3 px-5 py-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-deep-cash">
                    {entityLabel[job.entityType]} <span className="text-cash-green/60 uppercase text-xs">· {job.format}</span>
                  </p>
                  <p className="text-xs text-cash-green/70 mt-0.5">{formatDate(job.createdAt)}</p>
                  {job.status === 'failed' && job.errorSummary && (
                    <p className="text-xs text-red-500 mt-1">
                      {typeof job.errorSummary.message === 'string' ? job.errorSummary.message : 'Export failed'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant[job.status]} label={statusLabel[job.status]} />
                  {job.status === 'completed' && canDownload && (
                    <Button variant="secondary" size="sm" loading={downloadingId === job.id} onClick={() => handleDownload(job)}>
                      <DownloadCloud size={13} />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {total > PAGE_SIZE && (
              <div className="px-5">
                <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
