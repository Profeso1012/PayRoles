import { useRef, useState } from 'react';
import { read as readWorkbook, utils as xlsxUtils } from 'xlsx';
import { UploadCloud, KeyRound, Check, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { apiClient, fetchAllPages } from '@/lib/api';
import { NIGERIAN_BANKS } from '@/lib/data/nigerianBanks';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { generateTempPassword } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  BackendWorker,
  BackendUser,
  CreateUserRequest,
  CreateWorkerRequest,
  BackendEmploymentType,
} from '@/lib/api/types';

const EXCEL_EXTENSIONS = ['.xlsx', '.xls'];
const REQUIRED_FIELDS = ['employeeNumber', 'firstName', 'lastName', 'hireDate'] as const;
const OPTIONAL_TEXT_FIELDS = ['middleName', 'email', 'phone', 'dateOfBirth', 'position', 'department', 'nationalId', 'bankName', 'bankAccount', 'bankRoutingCode'] as const;
const VALID_EMPLOYMENT_TYPES: BackendEmploymentType[] = ['full_time', 'part_time', 'contract', 'temporary', 'intern'];
const CONCURRENCY = 6;

function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * This bypasses the backend's batch CSV importer (/imports/workers/upload)
 * and drives one independent POST/PATCH /workers request per row instead -
 * originally because that endpoint had two bugs (blank cells stored as ''
 * instead of NULL, colliding with Worker.email's partial unique index; and
 * one row's DB error poisoning the whole batch transaction, silently
 * rolling back rows that had already succeeded). Both are now fixed on the
 * backend (per-row SAVEPOINTs; `|| null` instead of `?? null` for email) -
 * this bypass is being kept anyway for now (simpler to reason about, no
 * async job/polling to build), not because the real endpoint is broken.
 * Revisit if the per-row-request approach becomes a real bottleneck for
 * large files.
 */
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

// Column order matches REQUIRED_FIELDS + employmentType + OPTIONAL_TEXT_FIELDS
// exactly, so a template downloaded here uploads back through buildPayload()
// without any column-name mismatch. Dates are YYYY-MM-DD - the exact format
// hireDate/dateOfBirth are sent to the backend in (see buildPayload above).
const SAMPLE_TEMPLATE_COLUMNS = [
  'employeeNumber',
  'firstName',
  'lastName',
  'middleName',
  'hireDate',
  'employmentType',
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

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadSampleTemplate() {
  const lines = [
    SAMPLE_TEMPLATE_COLUMNS.join(','),
    ...SAMPLE_TEMPLATE_ROWS.map((row) => SAMPLE_TEMPLATE_COLUMNS.map((col) => csvEscape(row[col])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'employee-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface RowOutcome {
  rowNumber: number;
  employeeNumber: string;
  name: string;
  status: 'created' | 'updated' | 'error';
  error?: string;
}

function buildPayload(row: Record<string, string>, legalEntityId: string): { payload: CreateWorkerRequest | null; error?: string } {
  const missing = REQUIRED_FIELDS.filter((f) => !(row[f] ?? '').trim());
  if (missing.length > 0) {
    return { payload: null, error: `Missing ${missing.join(', ')}` };
  }

  const payload: CreateWorkerRequest = {
    employeeNumber: row.employeeNumber.trim(),
    firstName: row.firstName.trim(),
    lastName: row.lastName.trim(),
    hireDate: row.hireDate.trim(),
    employmentType: 'full_time',
    legalEntityId, // Set the selected legal entity
  };

  const rawEmploymentType = (row.employmentType ?? '').trim().toLowerCase();
  if (VALID_EMPLOYMENT_TYPES.includes(rawEmploymentType as BackendEmploymentType)) {
    payload.employmentType = rawEmploymentType as BackendEmploymentType;
  }

  // Only ever set a key when the cell actually has a value - omitting it
  // entirely (rather than sending '') is what makes blank cells land as a
  // real SQL NULL instead of an empty string. See parseRows() doc comment.
  for (const field of OPTIONAL_TEXT_FIELDS) {
    const value = (row[field] ?? '').trim();
    if (value) (payload as unknown as Record<string, string>)[field] = value;
  }

  // annualRentMinor is a number field - parse it separately. Empty = NULL.
  const rawAnnualRent = (row.annualRentMinor ?? '').trim();
  if (rawAnnualRent) {
    const parsed = Number(rawAnnualRent);
    if (!isNaN(parsed) && parsed >= 0) {
      payload.annualRentMinor = parsed;
    }
  }

  // Same "never type a code" rule as the Add/Edit Employee forms - if the
  // sheet gives a bank name but no explicit code, resolve it from the same
  // NIGERIAN_BANKS list rather than requiring the filler-out to know it.
  // An explicit bankRoutingCode cell (e.g. for a bank not in the list) wins.
  if (payload.bankName && !payload.bankRoutingCode) {
    const match = NIGERIAN_BANKS.find((b) => b.name.toLowerCase() === payload.bankName!.trim().toLowerCase());
    if (match) payload.bankRoutingCode = match.code;
  }

  return { payload };
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function runNext(): Promise<void> {
    const i = next++;
    if (i >= items.length) return;
    results[i] = await worker(items[i], i);
    return runNext();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext));
  return results;
}

interface LoginResult {
  worker: BackendWorker;
  status: 'success' | 'error';
  password?: string;
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
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<RowOutcome[] | null>(null);

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

  const successCount = results?.filter((r) => r.status !== 'error').length ?? 0;
  const showLoginFollowUp = canManageLogins && results !== null && successCount > 0;

  const handleUpload = async () => {
    if (!selectedFile || !selectedLegalEntityId) {
      toast.error('Please select both a file and a legal entity');
      return;
    }
    setProcessing(true);
    setResults(null);
    try {
      const rows = await parseRows(selectedFile);
      if (rows.length === 0) {
        toast.error('The file has no data rows');
        return;
      }

      setProgress({ done: 0, total: rows.length });

      // Existing employee numbers resolve to an update (PATCH); everything
      // else is a create (POST) - matches the backend importer's upsert
      // semantics, just driven per-row instead of one shared DB transaction.
      // PaginationDto caps limit at 100, so the full tenant roster is paged
      // through via fetchAllPages rather than requested in one oversized call.
      const existingWorkers = await fetchAllPages<BackendWorker>(
        (page) => `${ENDPOINTS.WORKERS.LIST}?${buildPaginationParams({ page, limit: 100 })}`,
      );
      const byEmployeeNumber = new Map(existingWorkers.map((w) => [w.employeeNumber, w.id]));

      let done = 0;
      const outcomes = await runWithConcurrency(rows, CONCURRENCY, async (row, index): Promise<RowOutcome> => {
        const rowNumber = index + 2; // header is row 1
        const name = `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || '—';
        const employeeNumber = (row.employeeNumber ?? '').trim();
        const { payload, error } = buildPayload(row, selectedLegalEntityId);

        let outcome: RowOutcome;
        if (!payload) {
          outcome = { rowNumber, employeeNumber, name, status: 'error', error };
        } else {
          try {
            const existingId = byEmployeeNumber.get(payload.employeeNumber);
            if (existingId) {
              await apiClient(ENDPOINTS.WORKERS.UPDATE(existingId), { method: 'PATCH', body: JSON.stringify(payload) });
              outcome = { rowNumber, employeeNumber, name, status: 'updated' };
            } else {
              await apiClient(ENDPOINTS.WORKERS.CREATE, { method: 'POST', body: JSON.stringify(payload) });
              outcome = { rowNumber, employeeNumber, name, status: 'created' };
            }
          } catch (err) {
            outcome = { rowNumber, employeeNumber, name, status: 'error', error: err instanceof Error ? err.message : 'Failed' };
          }
        }
        done += 1;
        setProgress({ done, total: rows.length });
        return outcome;
      });

      setResults(outcomes);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      const created = outcomes.filter((o) => o.status === 'created').length;
      const updated = outcomes.filter((o) => o.status === 'updated').length;
      const failed = outcomes.filter((o) => o.status === 'error').length;
      if (created + updated > 0) {
        toast.success(`${created} added, ${updated} updated${failed > 0 ? `, ${failed} failed` : ''}`);
      } else {
        toast.error('No rows could be imported');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to read the file');
    } finally {
      setProcessing(false);
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
              All imported employees must be assigned to a legal entity. Select which legal entity these employees belong to before uploading.
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
            label="Select Legal Entity"
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
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">hireDate</code>. Optional columns include{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">email</code> (needed for portal login),{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">nationalId</code> (NIN),{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">annualRentMinor</code> (annual rent in kobo for PAYE tax relief),
          and bank details. Rows matching an existing employee number update that employee; new employee numbers are created. 
          Excel files use their first sheet. Each row is processed independently, so one bad row never blocks the rest of the file. 
          Not sure where to start? Download the sample template above, edit it with your own data, then upload it below.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); setResults(null); }}
            className="text-sm text-deep-cash file:mr-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-mint-light file:text-cash-green file:text-sm file:font-medium file:cursor-pointer cursor-pointer"
          />
          <Button variant="primary" size="sm" disabled={!selectedFile || !selectedLegalEntityId || !legalEntities || legalEntities.length === 0} loading={processing} onClick={handleUpload}>
            Upload &amp; Process
          </Button>
        </div>
        {processing && (
          <div className="flex items-center gap-2 mt-4 text-xs text-cash-green/70">
            <RefreshCw size={13} className="animate-spin" />
            Processing {progress.done} / {progress.total}…
          </div>
        )}
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

      {results && (
        <div className="bg-white rounded-xl border border-mint-light overflow-hidden">
          <div className="px-6 py-4 border-b border-mint-light flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-deep-cash">Import Results</h3>
            <span className="text-xs text-cash-green/70 tabular-nums">
              {results.filter((r) => r.status === 'created').length} added ·{' '}
              {results.filter((r) => r.status === 'updated').length} updated ·{' '}
              {results.filter((r) => r.status === 'error').length} failed
            </span>
          </div>
          <div className="divide-y divide-mint-light max-h-[32rem] overflow-y-auto">
            {results.map((r) => (
              <div key={r.rowNumber} className="flex items-center justify-between gap-3 px-6 py-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-deep-cash truncate">{r.name}</p>
                  <p className="text-xs text-cash-green/70 truncate">
                    Row {r.rowNumber}{r.employeeNumber ? ` · ${r.employeeNumber}` : ''}
                  </p>
                </div>
                {r.status === 'error' ? (
                  <div className="flex items-center gap-1.5 shrink-0 text-red-500">
                    <AlertCircle size={13} />
                    <span className="text-xs">{r.error}</span>
                  </div>
                ) : (
                  <Badge variant="success" label={r.status === 'created' ? 'Added' : 'Updated'} />
                )}
              </div>
            ))}
          </div>
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
