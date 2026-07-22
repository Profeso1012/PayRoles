import { useRef, useState } from 'react';
import { read as readWorkbook, utils as xlsxUtils } from 'xlsx';
import { UploadCloud, KeyRound, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { apiClient, apiClientWithMeta } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { generateTempPassword } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import type {
  BackendWorker,
  BackendUser,
  CreateUserRequest,
  CreateWorkerRequest,
  BackendEmploymentType,
} from '@/lib/api/types';

const EXCEL_EXTENSIONS = ['.xlsx', '.xls'];
const REQUIRED_FIELDS = ['employeeNumber', 'firstName', 'lastName', 'hireDate'] as const;
const OPTIONAL_TEXT_FIELDS = ['middleName', 'email', 'phone', 'dateOfBirth', 'position', 'department', 'bankName', 'bankRoutingCode'] as const;
const VALID_EMPLOYMENT_TYPES: BackendEmploymentType[] = ['full_time', 'part_time', 'contract', 'temporary', 'intern'];
const CONCURRENCY = 6;

function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * The backend's batch CSV importer (/imports/workers/upload) has two bugs
 * that can't be worked around by "cleaning" the uploaded file, because both
 * live in backend code that runs after the file is already parsed:
 *
 * 1. Blank cells parse to '' (empty string), and the row-to-entity mapping
 *    uses `?? null` (only catches null/undefined, not ''), so blank optional
 *    fields get stored as '' rather than NULL. Worker.email has a partial
 *    unique index that exempts NULL but not '' - so the second blank-email
 *    row in any file collides with the first one on a duplicate-key error.
 * 2. The whole batch runs in one shared DB transaction with a per-row
 *    try/catch that just records errors and continues - but Postgres
 *    poisons the *entire* transaction on the first failure, so every later
 *    row fails too ("current transaction is aborted"), and the final
 *    COMMIT on a poisoned transaction silently rolls back everything,
 *    including rows that succeeded before the first failure.
 *
 * Both require a backend fix (SAVEPOINTs per row; `|| null` instead of
 * `?? null`). Neither is reachable from a differently-formatted upload, so
 * this bypasses that endpoint entirely: parse the file in the browser and
 * drive one independent POST/PATCH /workers request per row instead. Each
 * request is its own isolated transaction (immune to bug #2), and blank
 * optional fields are simply omitted from the JSON body rather than sent
 * as '' (immune to bug #1, since the single-worker create path spreads the
 * DTO directly with no `?? null` mapping at all).
 */
async function parseRows(file: File): Promise<Record<string, string>[]> {
  const workbook = isExcelFile(file)
    ? readWorkbook(await file.arrayBuffer(), { type: 'array' })
    : readWorkbook(stripBom(await file.text()), { type: 'string' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsxUtils.sheet_to_json<Record<string, string>>(firstSheet, { raw: false, defval: '' });
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

interface RowOutcome {
  rowNumber: number;
  employeeNumber: string;
  name: string;
  status: 'created' | 'updated' | 'error';
  error?: string;
}

function buildPayload(row: Record<string, string>): { payload: CreateWorkerRequest | null; error?: string } {
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
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<RowOutcome[] | null>(null);

  const [bulkLoginOpen, setBulkLoginOpen] = useState(false);
  const [loadingUnprovisioned, setLoadingUnprovisioned] = useState(false);
  const [unprovisioned, setUnprovisioned] = useState<BackendWorker[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creatingLogins, setCreatingLogins] = useState(false);
  const [loginResults, setLoginResults] = useState<LoginResult[] | null>(null);

  const successCount = results?.filter((r) => r.status !== 'error').length ?? 0;
  const showLoginFollowUp = canManageLogins && results !== null && successCount > 0;

  const handleUpload = async () => {
    if (!selectedFile) return;
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
      const { data: existingWorkers } = await apiClientWithMeta<BackendWorker[]>(
        `${ENDPOINTS.WORKERS.LIST}?${buildPaginationParams({ page: 1, limit: 1000 })}`,
      );
      const byEmployeeNumber = new Map(existingWorkers.map((w) => [w.employeeNumber, w.id]));

      let done = 0;
      const outcomes = await runWithConcurrency(rows, CONCURRENCY, async (row, index): Promise<RowOutcome> => {
        const rowNumber = index + 2; // header is row 1
        const name = `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || '—';
        const employeeNumber = (row.employeeNumber ?? '').trim();
        const { payload, error } = buildPayload(row);

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
        breadcrumbs={[{ label: 'Employees', path: '/employees' }, { label: 'Import' }]}
      />

      <div className="bg-white rounded-xl border border-mint-light p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <UploadCloud size={16} className="text-cash-green" />
          <h3 className="text-sm font-semibold text-deep-cash">Upload a CSV or Excel file</h3>
        </div>
        <p className="text-sm text-cash-green/70 mb-4">
          Columns required: <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">employeeNumber</code>,{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">firstName</code>,{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">lastName</code>,{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">hireDate</code>. Add an{' '}
          <code className="text-xs bg-soft-white px-1.5 py-0.5 rounded">email</code> column too if you plan to set
          up portal login access for these employees afterwards. Rows matching an existing employee number update
          that employee; new employee numbers are created. Excel files use their first sheet. Each row is processed
          independently, so one bad row never blocks the rest of the file.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); setResults(null); }}
            className="text-sm text-deep-cash file:mr-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-mint-light file:text-cash-green file:text-sm file:font-medium file:cursor-pointer cursor-pointer"
          />
          <Button variant="primary" size="sm" disabled={!selectedFile} loading={processing} onClick={handleUpload}>
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
