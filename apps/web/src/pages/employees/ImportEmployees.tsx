import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, FileSpreadsheet, Inbox, KeyRound, Check, AlertCircle } from 'lucide-react';
import { apiClient, apiClientWithMeta, BASE_URL } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { formatDate, generateTempPassword } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import type { BackendImportJob, BackendImportStatus, BackendWorker, BackendUser, CreateUserRequest } from '@/lib/api/types';

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

interface LoginResult {
  worker: BackendWorker;
  status: 'success' | 'error';
  password?: string;
  error?: string;
}

export default function ImportEmployees() {
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  // Only super_admin/tenant_admin hold user:write on the real backend -
  // everyone else who can reach this page (payroll/HR managers & officers)
  // can import workers but can't create logins for them.
  const canManageLogins = role === 'tenant_admin' || role === 'super_admin';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const [bulkLoginOpen, setBulkLoginOpen] = useState(false);
  const [loadingUnprovisioned, setLoadingUnprovisioned] = useState(false);
  const [unprovisioned, setUnprovisioned] = useState<BackendWorker[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creatingLogins, setCreatingLogins] = useState(false);
  const [loginResults, setLoginResults] = useState<LoginResult[] | null>(null);

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

  const activeJob = jobs?.find((j) => j.id === activeJobId);
  const showLoginFollowUp =
    canManageLogins && activeJob && TERMINAL_STATUSES.includes(activeJob.status) && activeJob.successfulRows > 0;

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

  // The import job only reports row counts, not which specific workers were
  // touched, so this can't be scoped to "just this upload's rows" - instead
  // it shows every worker tenant-wide with no linked login yet, which always
  // includes whoever was just imported.
  const openBulkLogin = async () => {
    setBulkLoginOpen(true);
    setLoginResults(null);
    setSelectedIds(new Set());
    setLoadingUnprovisioned(true);
    try {
      const workerParams = buildPaginationParams({ page: 1, limit: 500 });
      const userParams = buildPaginationParams({ page: 1, limit: 500 });
      const [{ data: workers }, { data: users }] = await Promise.all([
        apiClientWithMeta<BackendWorker[]>(`${ENDPOINTS.WORKERS.LIST}?${workerParams}`),
        apiClientWithMeta<BackendUser[]>(`${ENDPOINTS.USERS.LIST}?${userParams}`),
      ]);
      const linkedWorkerIds = new Set(users.filter((u) => u.workerId).map((u) => u.workerId));
      setUnprovisioned(workers.filter((w) => !linkedWorkerIds.has(w.id)));
    } catch {
      toast.error('Failed to load employees');
      setUnprovisioned([]);
    } finally {
      setLoadingUnprovisioned(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectableWorkers = (unprovisioned ?? []).filter((w) => !!w.email);

  const handleCreateLogins = async () => {
    const targets = selectableWorkers.filter((w) => selectedIds.has(w.id));
    if (targets.length === 0) return;
    setCreatingLogins(true);
    const outcomes = await Promise.allSettled(
      targets.map(async (worker): Promise<LoginResult> => {
        const password = generateTempPassword();
        await apiClient(ENDPOINTS.USERS.CREATE, {
          method: 'POST',
          body: JSON.stringify({
            email: worker.email!,
            password,
            firstName: worker.firstName,
            lastName: worker.lastName,
            role: 'employee_self_service',
            workerId: worker.id,
          } satisfies CreateUserRequest),
        });
        return { worker, status: 'success', password };
      }),
    );
    const results: LoginResult[] = outcomes.map((outcome, i) =>
      outcome.status === 'fulfilled'
        ? outcome.value
        : { worker: targets[i], status: 'error', error: outcome.reason instanceof Error ? outcome.reason.message : 'Failed' },
    );
    setLoginResults(results);
    setCreatingLogins(false);
    const successCount = results.filter((r) => r.status === 'success').length;
    if (successCount > 0) {
      toast.success(`Login access created for ${successCount} employee${successCount === 1 ? '' : 's'}`);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
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

      {showLoginFollowUp && (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-mint-light/30 border border-fresh-cash/40 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <KeyRound size={18} className="text-cash-green shrink-0" />
            <p className="text-sm text-deep-cash">
              Imported employees have no portal login by default. Set up access for anyone who needs it.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={openBulkLogin}>
            Set up login access
          </Button>
        </div>
      )}

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

      <Modal
        isOpen={bulkLoginOpen}
        onClose={() => setBulkLoginOpen(false)}
        title="Set Up Login Access"
        size="md"
      >
        {loadingUnprovisioned ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : loginResults ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-cash-green/70">
              Share each temporary password with that employee directly — there is no invite email.
            </p>
            <div className="max-h-80 overflow-y-auto flex flex-col gap-2">
              {loginResults.map((r) => (
                <div key={r.worker.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-mint-light bg-soft-white">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-deep-cash truncate">
                      {r.worker.firstName} {r.worker.lastName}
                    </p>
                    <p className="text-xs text-cash-green/70 truncate">{r.worker.email}</p>
                  </div>
                  {r.status === 'success' ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <Check size={14} className="text-fresh-cash" />
                      <code className="text-xs bg-mint-light px-2 py-1 rounded font-mono">{r.password}</code>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0 text-red-500">
                      <AlertCircle size={14} />
                      <span className="text-xs">{r.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setBulkLoginOpen(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {unprovisioned && unprovisioned.length === 0 ? (
              <p className="text-sm text-cash-green/70 py-6 text-center">
                Every employee already has login access, or none exist yet.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-cash-green/70">
                    Employees below have no linked login yet. Selected people get an{' '}
                    <span className="font-medium text-deep-cash">Employee</span> account so they can view their own payslips.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIds(
                      selectedIds.size === selectableWorkers.length
                        ? new Set()
                        : new Set(selectableWorkers.map((w) => w.id)),
                    )
                  }
                  className="text-xs font-medium text-fresh-cash hover:text-cash-green self-start"
                >
                  {selectedIds.size === selectableWorkers.length && selectableWorkers.length > 0 ? 'Deselect all' : 'Select all'}
                </button>
                <div className="max-h-80 overflow-y-auto flex flex-col gap-1.5">
                  {(unprovisioned ?? []).map((w) => {
                    const hasEmail = !!w.email;
                    return (
                      <label
                        key={w.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                          hasEmail ? 'border-mint-light cursor-pointer hover:bg-soft-white' : 'border-mint-light/50 opacity-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!hasEmail}
                          checked={selectedIds.has(w.id)}
                          onChange={() => toggleSelected(w.id)}
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-deep-cash truncate">
                            {w.firstName} {w.lastName}
                          </p>
                          <p className="text-xs text-cash-green/70 truncate">
                            {w.email ?? 'No email on file — cannot create a login'}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setBulkLoginOpen(false)}>Cancel</Button>
                  <Button
                    variant="primary"
                    loading={creatingLogins}
                    disabled={selectedIds.size === 0}
                    onClick={handleCreateLogins}
                  >
                    Create Login Access for {selectedIds.size} Selected
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
