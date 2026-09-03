import { useRef, useState } from 'react';
import { read as readWorkbook, utils as xlsxUtils } from 'xlsx';
import { UploadCloud, KeyRound, Check, AlertCircle, RefreshCw, Download, XCircle } from 'lucide-react';
import { apiClient, fetchAllPages } from '@/lib/api';
import { NIGERIAN_BANKS } from '@/lib/data/nigerianBanks';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { useQuery } from '@tanstack/react-query';
import type { BackendWorker, BackendUser, CreateUserRequest, BackendImportJob } from '@/lib/api/types';

const EXCEL_EXTENSIONS = ['.xlsx', '.xls'];
const TERMINAL_IMPORT_STATUSES = new Set(['completed', 'failed', 'partially_completed', 'cancelled']);
const POLL_INTERVAL_MS = 2000;

function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext));
}

async function parseRows(file: File): Promise<Record<string, string>[]> {
  // For CSV, `raw: true` here is load-bearing: without it, SheetJS infers a
  // cell type from the text (e.g. "2024-01-08" looks like a date) and
  // reformats it to a locale default ("1/8/24") - which then fails the
  // backend's @IsDateString() as a plain wrong-format string, not a real
  // validation issue with the data. `raw: true` keeps CSV cells as the exact
  // text in the file. Excel files carry real typed cells (dates are binary
  // serial values, not text), so that inference is wanted there and this
  // option is left off for the .xlsx/.xls branch.
  const workbook = isExcelFile(file)
    ? readWorkbook(await file.arrayBuffer(), { type: 'array' })
    : readWorkbook(stripBom(await file.text()), { type: 'string', raw: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsxUtils.sheet_to_json<Record<string, string>>(firstSheet, { raw: false, defval: '' });
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function rowsToCsv(rows: Record<string, string>[], columns: string[]): string {
  const lines = [
    columns.join(','),
    ...rows.map((row) => columns.map((col) => csvEscape(row[col] ?? '')).join(',')),
  ];
  return lines.join('\n');
}

// Column order matches the real backend's WorkerCsvRow field order
// (import-processor.service.ts) - legalEntityId is now a required column
// there, filled in below from the page-level "Select Legal Entity" picker
// for any row that doesn't already specify its own.
const SAMPLE_TEMPLATE_COLUMNS = [
  'employeeNumber',
  'firstName',
  'lastName',
  'middleName',
  'hireDate',
  'employmentType',
  'legalEntityId',
  'basicSalary',
  'currency',
  'email',
  'phone',
  'dateOfBirth',
  'position',
  'department',
  'nationalId',
  'bankName',
  'bankAccount',
  'bankRoutingCode',
  'annualRentMinor',
] as const;

const SAMPLE_TEMPLATE_ROWS: Record<(typeof SAMPLE_TEMPLATE_COLUMNS)[number], string>[] = [
  {
    employeeNumber: 'EMP-0001',
    firstName: 'Employee',
    lastName: 'One',
    middleName: '',
    hireDate: '2023-01-10',
    employmentType: 'full_time',
    legalEntityId: '',
    basicSalary: '500000',
    currency: 'NGN',
    email: 'employee.one@example.com',
    phone: '+2348000000001',
    dateOfBirth: '1990-01-15',
    position: 'Software Engineer',
    department: 'Engineering',
    nationalId: '12345678901',
    bankName: 'GTBank',
    bankAccount: '0123456789',
    bankRoutingCode: '058',
    annualRentMinor: '120000000',
  },
  {
    employeeNumber: 'EMP-0002',
    firstName: 'Employee',
    lastName: 'Two',
    middleName: 'A',
    hireDate: '2022-03-01',
    employmentType: 'part_time',
    legalEntityId: '',
    basicSalary: '250000',
    currency: 'NGN',
    email: '',
    phone: '',
    dateOfBirth: '1988-06-22',
    position: '',
    department: 'Finance',
    nationalId: '',
    bankName: '',
    bankAccount: '',
    bankRoutingCode: '',
    annualRentMinor: '',
  },
  {
    employeeNumber: 'EMP-0003',
    firstName: 'Employee',
    lastName: 'Three',
    middleName: '',
    hireDate: '2024-07-01',
    employmentType: 'contract',
    legalEntityId: '',
    basicSalary: '300000',
    currency: 'NGN',
    email: 'employee.three@example.com',
    phone: '',
    dateOfBirth: '',
    position: 'Sales Associate',
    department: 'Sales',
    nationalId: '98765432109',
    bankName: 'Zenith Bank',
    bankAccount: '0123456792',
    bankRoutingCode: '057',
    annualRentMinor: '60000000',
  },
];

function downloadSampleTemplate() {
  const csv = rowsToCsv(SAMPLE_TEMPLATE_ROWS, [...SAMPLE_TEMPLATE_COLUMNS]);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'employee-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface LoginResult {
  worker: BackendWorker;
  status: 'success' | 'error';
  error?: string;
}

export default function ImportEmployees() {
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  // Only super_admin/tenant_admin hold user:write on the real backend -
  // everyone else who can reach this page (payroll/HR managers & officers)
  // can import workers but can't create logins for them.
  const canManageLogins = role === 'tenant_admin' || role === 'super_admin';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLegalEntityId, setSelectedLegalEntityId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<BackendImportJob | null>(null);
  const [errorReportUrl, setErrorReportUrl] = useState<string | null>(null);
  const pollTokenRef = useRef(0);

  const [bulkLoginOpen, setBulkLoginOpen] = useState(false);
  const [loadingUnprovisioned, setLoadingUnprovisioned] = useState(false);
  const [unprovisioned, setUnprovisioned] = useState<BackendWorker[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creatingLogins, setCreatingLogins] = useState(false);
  const [loginResults, setLoginResults] = useState<LoginResult[] | null>(null);

  // Fetch legal entities for selection
  const { data: legalEntities, isLoading: loadingEntities } = useQuery({
    queryKey: ['legal-entities'],
    queryFn: async () => {
      const response = await apiClient<any>(`${ENDPOINTS.LEGAL_ENTITIES.LIST}?${buildPaginationParams({ limit: 100 })}`);
      return Array.isArray(response) ? response : (response.data || []);
    },
  });

  const showLoginFollowUp = canManageLogins && job?.status === 'completed' && job.successfulRows > 0;

  async function pollJob(jobId: string, token: number) {
    for (;;) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      if (pollTokenRef.current !== token) return; // A newer upload superseded this poll loop.
      let latest: BackendImportJob;
      try {
        latest = await apiClient<BackendImportJob>(ENDPOINTS.IMPORTS.STATUS(jobId));
      } catch (err) {
        toast.error('Lost track of the import job', err instanceof Error ? err.message : undefined);
        return;
      }
      if (pollTokenRef.current !== token) return;
      setJob(latest);
      if (TERMINAL_IMPORT_STATUSES.has(latest.status)) {
        if (latest.status === 'completed') {
          toast.success(`${latest.createdRows} added, ${latest.updatedRows} updated${latest.skippedRows > 0 ? `, ${latest.skippedRows} skipped` : ''}`);
        } else if (latest.status === 'partially_completed') {
          toast.warning(
            `${latest.createdRows} added, ${latest.updatedRows} updated, ${latest.failedRows} failed`,
            'See the row-level errors below for exactly what went wrong.',
          );
        } else if (latest.status === 'failed') {
          toast.error('Import failed', latest.errorSummary?.reason);
        } else if (latest.status === 'cancelled') {
          toast.info('Import cancelled');
        }
        if (latest.errorReportKey) {
          try {
            const { downloadUrl } = await apiClient<{ downloadUrl: string }>(ENDPOINTS.IMPORTS.ERRORS(jobId));
            if (pollTokenRef.current === token) setErrorReportUrl(downloadUrl);
          } catch {
            // The inline errorSummary below already shows the first 20 - the full report is a nice-to-have.
          }
        }
        return;
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedLegalEntityId) {
      toast.error('Please select both a file and a legal entity');
      return;
    }
    setUploading(true);
    setJob(null);
    setErrorReportUrl(null);
    const token = ++pollTokenRef.current;
    try {
      const rows = await parseRows(selectedFile);
      if (rows.length === 0) {
        toast.error('The file has no data rows');
        return;
      }

      // Same "never type a code" convenience the Add/Edit Employee forms
      // give - the real backend just stores bankRoutingCode verbatim, it
      // doesn't resolve a bank name to a code itself.
      const columns = new Set(Object.keys(rows[0]));
      columns.add('legalEntityId');
      const prepared = rows.map((row) => {
        const next = { ...row };
        if (!next.legalEntityId?.trim()) next.legalEntityId = selectedLegalEntityId;
        if (next.bankName?.trim() && !next.bankRoutingCode?.trim()) {
          const match = NIGERIAN_BANKS.find((b) => b.name.toLowerCase() === next.bankName!.trim().toLowerCase());
          if (match) next.bankRoutingCode = match.code;
        }
        return next;
      });

      const csv = rowsToCsv(prepared, [...columns]);
      const csvFile = new File([csv], selectedFile.name.replace(/\.(xlsx|xls)$/i, '.csv'), { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', csvFile);

      const createdJob = await apiClient<BackendImportJob>(ENDPOINTS.IMPORTS.WORKERS_UPLOAD, {
        method: 'POST',
        body: formData,
      });
      setJob(createdJob);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.info('Import started', `Processing ${createdJob.totalRows || rows.length} rows in the background…`);
      await pollJob(createdJob.id, token);
    } catch (err) {
      // ApiError.message is the backend's exact error.message (e.g. a CSV
      // schema/validation failure) - never paraphrased into something generic.
      toast.error('Failed to start import', err instanceof Error ? err.message : undefined);
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
      toast.error('Failed to cancel import', err instanceof Error ? err.message : undefined);
    }
  };

  // Not scoped to "just this upload's rows" - the modal shows every worker
  // tenant-wide with no linked login yet, which always includes whoever was
  // just imported.
  const openBulkLogin = async () => {
    setBulkLoginOpen(true);
    setLoginResults(null);
    setSelectedIds(new Set());
    setLoadingUnprovisioned(true);
    try {
      const [workers, users] = await Promise.all([
        fetchAllPages<BackendWorker>((page) => `${ENDPOINTS.WORKERS.LIST}?${buildPaginationParams({ page, limit: 100 })}`),
        fetchAllPages<BackendUser>((page) => `${ENDPOINTS.USERS.LIST}?${buildPaginationParams({ page, limit: 100 })}`),
      ]);
      const linkedWorkerIds = new Set(users.filter((u) => u.workerId).map((u) => u.workerId));
      setUnprovisioned(workers.filter((w) => !linkedWorkerIds.has(w.id)));
    } catch (err) {
      toast.error('Failed to load employees', err instanceof Error ? err.message : undefined);
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
        await apiClient(ENDPOINTS.USERS.CREATE, {
          method: 'POST',
          body: JSON.stringify({
            email: worker.email!,
            firstName: worker.firstName,
            lastName: worker.lastName,
            role: 'employee_self_service',
            workerId: worker.id,
          } satisfies CreateUserRequest),
        });
        return { worker, status: 'success' };
      }),
    );
    const loginOutcomes: LoginResult[] = outcomes.map((outcome, i) =>
      outcome.status === 'fulfilled'
        ? outcome.value
        : { worker: targets[i], status: 'error', error: outcome.reason instanceof Error ? outcome.reason.message : 'Failed' },
    );
    setLoginResults(loginOutcomes);
    setCreatingLogins(false);
    const successfulLogins = loginOutcomes.filter((r) => r.status === 'success').length;
    if (successfulLogins > 0) {
      toast.success(`Login access created for ${successfulLogins} employee${successfulLogins === 1 ? '' : 's'}`);
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

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title="Import Employees"
        breadcrumbs={[
          { label: 'Legal Entities', path: '/organisation/legal-entities' },
          { label: 'Employees', path: '/employees' },
          { label: 'Import' },
        ]}
      />

      {/* Legal Entity Selection - Required */}
      <div className="bg-mint-light/30 border border-fresh-cash/40 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-fresh-cash/20 flex items-center justify-center shrink-0">
            <AlertCircle size={18} className="text-fresh-cash" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-deep-cash mb-1">Legal Entity Required</p>
            <p className="text-sm text-cash-green/80">
              Every imported employee must belong to a legal entity. Pick the default below - it's used for any
              row that doesn't already have its own <code className="text-xs bg-white px-1 py-0.5 rounded">legalEntityId</code> column filled in.
            </p>
          </div>
        </div>
        {loadingEntities ? (
          <div className="flex items-center gap-2 text-sm text-cash-green/70">
            <Spinner size="sm" />
            Loading legal entities...
          </div>
        ) : !legalEntities || legalEntities.length === 0 ? (
          <div className="bg-white border border-mint-light rounded-lg p-4">
            <p className="text-sm text-red-500 mb-2">No legal entities found</p>
            <p className="text-xs text-cash-green/70">
              You must create at least one legal entity before importing employees. Go to{' '}
              <a href="/organisation/legal-entities" className="text-fresh-cash underline">
                Organisation → Legal Entities
              </a>{' '}
              to create one.
            </p>
          </div>
        ) : (
          <Select
            label="Default Legal Entity"
            value={selectedLegalEntityId}
            options={legalEntities.map((entity: any) => ({
              value: entity.id,
              label: `${entity.name}${entity.taxIdNumber ? ` (${entity.taxIdNumber})` : ''}`,
            }))}
            onChange={setSelectedLegalEntityId}
            placeholder="Choose a legal entity..."
            required
          />
        )}
      </div>

      <div className="bg-white rounded-xl border border-mint-light p-6 mb-6">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <UploadCloud size={16} className="text-cash-green" />
            <h3 className="text-sm font-semibold text-deep-cash">Upload a CSV or Excel file</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={downloadSampleTemplate}>
            <Download size={13} />
            Download Sample CSV Template
          </Button>
        </div>
        <p className="text-sm text-cash-green/70 mb-4">
          Columns required: <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">employeeNumber</code>,{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">firstName</code>,{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">lastName</code>,{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">hireDate</code>, and{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">basicSalary</code> (in naira, e.g. 500000) — the last one
          only for brand-new employee numbers, since it provisions their starting pay; rows updating an existing employee number
          can leave it blank. <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">legalEntityId</code> is filled in
          automatically from the picker above for any row that leaves it blank. Optional columns include{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">currency</code> (defaults to NGN),{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">email</code> (needed for portal login),{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">nationalId</code> (NIN),{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">annualRentMinor</code> (annual rent in kobo for PAYE tax relief),
          and bank details. Rows matching an existing employee number update that employee; new employee numbers are created.
          Excel files use their first sheet and are converted to CSV before upload. One bad row never blocks the rest of the file.
          Not sure where to start? Download the sample template above, edit it with your own data, then upload it below.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); setJob(null); setErrorReportUrl(null); }}
            className="text-sm text-deep-cash file:mr-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-mint-light file:text-cash-green file:text-sm file:font-medium file:cursor-pointer cursor-pointer"
          />
          <Button
            variant="primary"
            size="sm"
            disabled={!selectedFile || !selectedLegalEntityId || !legalEntities || legalEntities.length === 0}
            loading={uploading}
            onClick={handleUpload}
          >
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
            {jobInFlight && (
              <Button variant="ghost" size="sm" onClick={handleCancelJob}>
                <XCircle size={13} />
                Cancel
              </Button>
            )}
          </div>
          <div className="px-6 py-4">
            <p className="text-xs text-cash-green/70 tabular-nums mb-1">
              {job.processedRows} / {job.totalRows} processed · {job.createdRows} added · {job.updatedRows} updated ·{' '}
              {job.skippedRows} skipped · {job.failedRows} failed
            </p>
            {jobInFlight && (
              <div className="flex items-center gap-2 mt-3 text-xs text-cash-green/70">
                <RefreshCw size={13} className="animate-spin" />
                Processing in the background…
              </div>
            )}
            {job.errorSummary?.reason && (
              <p className="text-sm text-red-500 mt-3">{job.errorSummary.reason}</p>
            )}
            {job.errorSummary?.errors && job.errorSummary.errors.length > 0 && (
              <div className="mt-3 flex flex-col gap-1 max-h-80 overflow-y-auto">
                {job.errorSummary.errors.map((e, i) => (
                  // e.code (e.g. INVALID_EMPLOYMENT_TYPE) is a machine-readable
                  // classification, not something a user needs to read - kept
                  // as a title tooltip for support/debugging, not in the visible text.
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
              Login credentials were emailed directly to each employee, along with a prompt to set a
              permanent password on first login.
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
                    <div className="flex items-center gap-2 shrink-0 text-fresh-cash">
                      <Check size={14} />
                      <span className="text-xs">Email sent</span>
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
