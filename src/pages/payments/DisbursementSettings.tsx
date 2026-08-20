import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings2, RefreshCw, ShieldCheck, PlugZap } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import type {
  BackendDisbursementSettings,
  BackendDisbursementProviderConfig,
  BackendProviderType,
  UpdateDisbursementSettingsRequest,
  ConfigureProviderRequest,
} from '@/lib/api/types';

const PROVIDER_TYPES: BackendProviderType[] = ['manual_bank_file', 'monnify', 'paystack', 'flutterwave', 'remita'];

const PROVIDER_LABELS: Record<BackendProviderType, string> = {
  manual_bank_file: 'Manual Bank File',
  monnify: 'Monnify',
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
  remita: 'Remita',
};

// manual_bank_file, monnify, paystack, and flutterwave all have real
// createBatch/executeBatch implementations now. remita's executeBatch still
// calls placeholder endpoints (see remita.provider.ts TODOs) and can
// misreport success - that one alone stays flagged.
const INCOMPLETE_PROVIDERS: Partial<Record<BackendProviderType, string>> = {
  remita: 'Experimental — integration is unverified, use with caution',
};

const PROVIDER_OPTIONS = PROVIDER_TYPES.map((value) => ({
  value,
  label: INCOMPLETE_PROVIDERS[value] ? `${PROVIDER_LABELS[value]} (Incomplete)` : PROVIDER_LABELS[value],
}));

const EXECUTION_POLICY_OPTIONS = [
  { value: 'manual', label: 'Manual — Finance clicks Initiate' },
  { value: 'immediate', label: 'Immediate — runs the moment payroll is approved' },
  { value: 'scheduled', label: 'Scheduled — runs at a configured time' },
];

// Every option below is really just an approval COUNT, not a role check - the
// backend doesn't verify a "Finance"/"CEO" approval actually comes from a
// finance_manager/CEO-flagged user, and "Multi-level" is hardcoded to require
// exactly 3 approvals from anyone with DISBURSEMENT_MANAGE, not a
// configurable number - labels say so directly so this isn't assumed to be
// stricter or more configurable than it actually is.
const APPROVAL_WORKFLOW_OPTIONS = [
  { value: 'none', label: 'None — no separate batch approval' },
  { value: 'single', label: 'Single approver — 1 approval, from anyone who can manage disbursements' },
  { value: 'dual', label: 'Dual approval — 2 approvals, from 2 different people' },
  { value: 'finance', label: 'Finance sign-off — 1 approval (not role-restricted to Finance)' },
  { value: 'ceo', label: 'CEO sign-off — 1 approval (not role-restricted to CEO)' },
  { value: 'multi_level', label: 'Multi-level — fixed at 3 approvals (not configurable)' },
];

// Matches the backend's exact DTO bounds (update-disbursement-settings.dto.ts)
// so the form can't produce a request the backend will 400 on.
function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}
function clampMin(n: number, min: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(n, min);
}

// What each provider actually reads (from its own *.types.ts credentials
// interface on the backend) - showing every field for every provider would
// mean e.g. Manual Bank File (which makes no external API call at all) asks
// for an API key it never uses, and Paystack/Flutterwave show an unused
// "API Key" field alongside their real "Secret Key".
interface CredentialField {
  key: string;
  label: string;
  placeholder?: string;
  hint?: string;
}

// Placeholders/hints are copied from each provider's own credentials
// interface docblock on the backend (paystack.types.ts, flutterwave.types.ts,
// etc.) — not guessed — so the format actually matches what that provider's
// dashboard hands you.
const PROVIDER_CREDENTIAL_FIELDS: Record<BackendProviderType, CredentialField[]> = {
  manual_bank_file: [],
  monnify: [
    {
      key: 'apiKey',
      label: 'API Key',
      placeholder: 'MK_TEST_XXXXXXXXXX or MK_PROD_XXXXXXXXXX',
      hint: "Monnify dashboard → Settings → API Keys. Monnify itself calls the two modes Sandbox / Live.",
    },
    { key: 'secretKey', label: 'Secret Key', placeholder: 'Paired with the API Key above, same screen' },
    { key: 'contractCode', label: 'Contract Code', placeholder: 'e.g. 1234567890', hint: 'Monnify dashboard → Settings → Contract Details' },
    { key: 'walletAccountNumber', label: 'Wallet Account Number', placeholder: '10-digit NUBAN, e.g. 3012345678' },
  ],
  paystack: [
    {
      key: 'secretKey',
      label: 'Secret Key',
      placeholder: 'sk_test_xxxxxxxxxxxx or sk_live_xxxxxxxxxxxx',
      hint: 'Paystack dashboard → Settings → API Keys & Webhooks. Paystack calls the two modes Test / Live — use the Secret Key, not the Public Key (pk_...), which this integration never uses.',
    },
  ],
  flutterwave: [
    {
      key: 'secretKey',
      label: 'Secret Key',
      placeholder: 'FLWSECK_TEST-xxxxxxxxxxxx or FLWSECK-xxxxxxxxxxxx',
      hint: 'Flutterwave dashboard → Settings → API. Flutterwave calls the two modes Test / Live.',
    },
  ],
  remita: [
    { key: 'merchantId', label: 'Merchant ID' },
    { key: 'serviceTypeId', label: 'Service Type ID', hint: 'The service type configured for salary/bulk payments on your Remita account' },
    { key: 'apiKey', label: 'API Key' },
    { key: 'apiToken', label: 'API Token (optional)' },
  ],
};

// Matches PRIMARY_CREDENTIAL_FIELD on the backend - the one field the API
// computes a masked preview for.
const PRIMARY_CREDENTIAL_KEY: Partial<Record<BackendProviderType, string>> = {
  monnify: 'secretKey',
  paystack: 'secretKey',
  flutterwave: 'secretKey',
  remita: 'apiKey',
};

// Manual Bank File has no external API to call, so "sandbox vs production"
// and a webhook secret are meaningless for it - both are hidden for that
// provider only.
const PROVIDER_HAS_ENVIRONMENT: Record<BackendProviderType, boolean> = {
  manual_bank_file: false,
  monnify: true,
  paystack: true,
  flutterwave: true,
  remita: true,
};
const PROVIDER_HAS_WEBHOOK: Record<BackendProviderType, boolean> = {
  manual_bank_file: false,
  monnify: true,
  paystack: true,
  flutterwave: true,
  remita: true,
};

// This app verifies webhook signatures itself (HMAC-SHA512 of the raw
// payload against this stored value) - it is NOT something to go find as a
// labeled field in the provider's own dashboard. For Monnify/Paystack/Remita,
// their real webhook signature is computed from your account's own secret
// key, so this must be set to the exact same value as the Secret/API Key
// above - there is no separate "webhook secret" in their dashboards to copy
// instead. Flutterwave is the one exception: it has a real, distinct
// "Secret Hash" field under Settings -> Webhooks in their dashboard, made
// for exactly this.
const WEBHOOK_SECRET_HINTS: Partial<Record<BackendProviderType, string>> = {
  monnify: "Not a separate field in Monnify's dashboard — paste the same Secret Key you entered above.",
  paystack: "Not a separate field in Paystack's dashboard — paste the same Secret Key you entered above.",
  remita: "Remita has no standard self-service webhook secret — check with Remita support for what value to use here.",
  flutterwave: 'Found in your Flutterwave dashboard under Settings → Webhooks, labeled "Secret Hash" — a real, separate value from your Secret Key.',
};

const blankProviderForm = {
  environment: 'sandbox' as 'sandbox' | 'production',
  enabled: true,
  isDefault: false,
  credentials: {} as Record<string, string>,
  webhookSecret: '',
};

export default function DisbursementSettings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  // DISBURSEMENT_CONFIGURE (every write on this page - save settings,
  // configure/validate a provider) is tenant_admin/super_admin only on the
  // backend - finance_manager holds DISBURSEMENT_READ/MANAGE but not
  // CONFIGURE, so it can approve/execute batches on /payments but not touch
  // provider credentials or general settings here.
  const canManage = role === 'tenant_admin' || role === 'super_admin';

  const { data: settings, isLoading, isError, error, refetch } = useQuery<BackendDisbursementSettings>({
    queryKey: ['disbursement-settings'],
    queryFn: () => apiClient<BackendDisbursementSettings>(ENDPOINTS.DISBURSEMENT.SETTINGS),
  });

  const { data: providers } = useQuery<BackendDisbursementProviderConfig[]>({
    queryKey: ['disbursement-providers'],
    queryFn: () => apiClient<BackendDisbursementProviderConfig[]>(ENDPOINTS.DISBURSEMENT.PROVIDERS),
  });

  const [form, setForm] = useState<UpdateDisbursementSettingsRequest>({});
  useEffect(() => {
    if (!settings) return;
    setForm({
      defaultProvider: settings.defaultProvider,
      executionPolicy: settings.executionPolicy,
      approvalWorkflow: settings.approvalWorkflow,
      timezone: settings.timezone,
      autoReconcile: settings.autoReconcile,
      releasePayslipsOnComplete: settings.releasePayslipsOnComplete,
      retryPolicy: settings.retryPolicy,
      notificationSettings: {
        email: settings.notificationSettings.email,
        sms: settings.notificationSettings.sms,
        inApp: settings.notificationSettings.inApp,
        webhook: settings.notificationSettings.webhook,
        webhookUrl: settings.notificationSettings.webhookUrl ?? '',
      },
    });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => apiClient(ENDPOINTS.DISBURSEMENT.SETTINGS, { method: 'PATCH', body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disbursement-settings'] });
      toast.success('Disbursement settings saved');
    },
    onError: (err) => toast.error('Failed to save settings', err instanceof Error ? err.message : undefined),
  });

  const [providerTarget, setProviderTarget] = useState<BackendProviderType | null>(null);
  const [providerForm, setProviderForm] = useState(blankProviderForm);
  const [validatingProvider, setValidatingProvider] = useState<BackendProviderType | null>(null);

  const configureMutation = useMutation({
    mutationFn: () => {
      const fields = PROVIDER_CREDENTIAL_FIELDS[providerTarget!];
      const credentials: Record<string, string> = {};
      fields.forEach(({ key }) => {
        const v = providerForm.credentials[key]?.trim();
        if (v) credentials[key] = v;
      });
      const body: ConfigureProviderRequest = {
        ...(PROVIDER_HAS_ENVIRONMENT[providerTarget!] ? { environment: providerForm.environment } : {}),
        enabled: providerForm.enabled,
        isDefault: providerForm.isDefault,
        ...(Object.keys(credentials).length > 0 ? { credentials } : {}),
        ...(PROVIDER_HAS_WEBHOOK[providerTarget!] && providerForm.webhookSecret.trim()
          ? { webhookSecret: providerForm.webhookSecret.trim() }
          : {}),
      };
      return apiClient(ENDPOINTS.DISBURSEMENT.PROVIDER_CONFIGURE(providerTarget!), {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disbursement-providers'] });
      toast.success(`${PROVIDER_LABELS[providerTarget!]} configuration saved`);
      setProviderTarget(null);
      setProviderForm(blankProviderForm);
    },
    onError: (err) => toast.error('Failed to save provider configuration', err instanceof Error ? err.message : undefined),
  });

  async function handleValidate(providerType: BackendProviderType) {
    setValidatingProvider(providerType);
    try {
      await apiClient(ENDPOINTS.DISBURSEMENT.PROVIDER_VALIDATE(providerType), { method: 'POST' });
      qc.invalidateQueries({ queryKey: ['disbursement-providers'] });
      toast.success(`${PROVIDER_LABELS[providerType]} credentials validated`);
    } catch (err) {
      toast.error('Validation failed', err instanceof Error ? err.message : undefined);
    } finally {
      setValidatingProvider(null);
    }
  }

  function openConfigure(providerType: BackendProviderType) {
    const existing = providers?.find((p) => p.providerType === providerType);
    setProviderTarget(providerType);
    setProviderForm({
      environment: existing?.environment ?? 'sandbox',
      enabled: existing?.enabled ?? true,
      isDefault: existing?.isDefault ?? false,
      credentials: {},
      webhookSecret: '',
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !settings) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  if (!canManage) {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
        <div className="bg-white rounded-xl border border-mint-light p-8 text-center text-cash-green/70 text-sm">
          You need Tenant Admin access to manage disbursement settings.
        </div>
      </div>
    );
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
      <PageHeader title="Disbursement Settings" />

      {/* General */}
      <div className="bg-white rounded-xl border border-mint-light p-6 mb-5">
        <div className="flex items-center gap-2 mb-5">
          <Settings2 size={16} className="text-cash-green" />
          <h3 className="text-sm font-semibold text-deep-cash">General</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Default Provider"
            value={form.defaultProvider ?? ''}
            options={PROVIDER_OPTIONS}
            onChange={(v) => setForm((f) => ({ ...f, defaultProvider: v as BackendProviderType }))}
          />
          <Select
            label="Execution Policy"
            value={form.executionPolicy ?? ''}
            options={EXECUTION_POLICY_OPTIONS}
            onChange={(v) => setForm((f) => ({ ...f, executionPolicy: v as UpdateDisbursementSettingsRequest['executionPolicy'] }))}
          />
          <Select
            label="Batch Approval Workflow"
            value={form.approvalWorkflow ?? ''}
            options={APPROVAL_WORKFLOW_OPTIONS}
            onChange={(v) => setForm((f) => ({ ...f, approvalWorkflow: v as UpdateDisbursementSettingsRequest['approvalWorkflow'] }))}
          />
          <Input
            label="Timezone"
            value={form.timezone ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            placeholder="Africa/Lagos"
          />
        </div>
        <div className="flex flex-col gap-2 mt-4">
          <label className="flex items-center gap-2 text-sm text-deep-cash">
            <input
              type="checkbox"
              checked={form.autoReconcile ?? false}
              onChange={(e) => setForm((f) => ({ ...f, autoReconcile: e.target.checked }))}
            />
            Automatically reconcile completed batches
          </label>
          <label className="flex items-center gap-2 text-sm text-deep-cash">
            <input
              type="checkbox"
              checked={form.releasePayslipsOnComplete ?? false}
              onChange={(e) => setForm((f) => ({ ...f, releasePayslipsOnComplete: e.target.checked }))}
            />
            Release payslips to employees once a batch completes
          </label>
        </div>
      </div>

      {/* Retry policy */}
      <div className="bg-white rounded-xl border border-mint-light p-6 mb-5">
        <div className="flex items-center gap-2 mb-5">
          <RefreshCw size={16} className="text-cash-green" />
          <h3 className="text-sm font-semibold text-deep-cash">Retry Policy</h3>
        </div>
        <label className="flex items-center gap-2 text-sm text-deep-cash mb-4">
          <input
            type="checkbox"
            checked={form.retryPolicy?.enabled ?? false}
            onChange={(e) => setForm((f) => ({ ...f, retryPolicy: { ...f.retryPolicy!, enabled: e.target.checked } }))}
          />
          Automatically retry failed transactions
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Max retries (1-10)"
            type="number"
            min={1}
            max={10}
            value={String(form.retryPolicy?.maxRetries ?? '')}
            onChange={(e) => setForm((f) => ({
              ...f,
              retryPolicy: { ...f.retryPolicy!, maxRetries: clamp(Number(e.target.value), 1, 10) },
            }))}
          />
          <Input
            label="Retry interval (minutes, min 5)"
            type="number"
            min={5}
            value={String(form.retryPolicy?.retryIntervalMinutes ?? '')}
            onChange={(e) => setForm((f) => ({
              ...f,
              retryPolicy: { ...f.retryPolicy!, retryIntervalMinutes: clampMin(Number(e.target.value), 5) },
            }))}
          />
          <Input
            label="Retry window (hours, min 1)"
            type="number"
            min={1}
            value={String(form.retryPolicy?.maxRetryWindowHours ?? '')}
            onChange={(e) => setForm((f) => ({
              ...f,
              retryPolicy: { ...f.retryPolicy!, maxRetryWindowHours: clampMin(Number(e.target.value), 1) },
            }))}
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-mint-light p-6 mb-5">
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck size={16} className="text-cash-green" />
          <h3 className="text-sm font-semibold text-deep-cash">Notification Channels</h3>
        </div>
        <p className="text-xs text-cash-green/60 mb-4">
          Which channels get notified of disbursement events. Per-event toggles (e.g. only on failure) aren't
          exposed here yet — this covers the channels themselves.
        </p>
        <div className="flex flex-col gap-2 mb-4">
          {(['email', 'sms', 'inApp', 'webhook'] as const).map((channel) => (
            <label key={channel} className="flex items-center gap-2 text-sm text-deep-cash capitalize">
              <input
                type="checkbox"
                checked={form.notificationSettings?.[channel] ?? false}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    notificationSettings: { ...f.notificationSettings, [channel]: e.target.checked },
                  }))
                }
              />
              {channel === 'inApp' ? 'In-app' : channel}
            </label>
          ))}
        </div>
        {form.notificationSettings?.webhook && (
          <Input
            label="Webhook URL"
            value={form.notificationSettings?.webhookUrl ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, notificationSettings: { ...f.notificationSettings, webhookUrl: e.target.value } }))}
            placeholder="https://your-system.example.com/webhooks/disbursement"
          />
        )}
      </div>

      <div className="flex justify-end mb-6">
        <Button variant="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          Save Settings
        </Button>
      </div>

      {/* Providers */}
      <div className="bg-white rounded-xl border border-mint-light overflow-hidden">
        <div className="px-6 py-4 border-b border-mint-light flex items-center gap-2">
          <PlugZap size={16} className="text-cash-green" />
          <h3 className="text-sm font-semibold text-deep-cash">Payment Providers</h3>
        </div>
        <div className="divide-y divide-mint-light">
          {PROVIDER_TYPES.map((type) => {
            const config = providers?.find((p) => p.providerType === type);
            return (
              <div key={type} className="flex items-center justify-between gap-3 px-6 py-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-deep-cash">{PROVIDER_LABELS[type]}</p>
                    {INCOMPLETE_PROVIDERS[type] && <Badge variant="warning" label="Incomplete" />}
                  </div>
                  <p className="text-xs text-cash-green/60 mt-0.5">
                    {config ? (
                      <>
                        {PROVIDER_HAS_ENVIRONMENT[type] && <>{config.environment} · </>}
                        {PROVIDER_CREDENTIAL_FIELDS[type].length === 0
                          ? 'No credentials needed'
                          : config.hasCredentials
                            ? `Key set (${config.credentialsPreview ?? '••••'})`
                            : 'No credentials set'}
                        {config.lastValidatedAt && <> · validated {formatDate(config.lastValidatedAt)}</>}
                      </>
                    ) : (
                      'Not configured'
                    )}
                  </p>
                  {INCOMPLETE_PROVIDERS[type] && (
                    <p className="text-xs text-amber-600 mt-1">{INCOMPLETE_PROVIDERS[type]}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {config?.isDefault && <Badge variant="success" label="Default" />}
                  {config && <Badge variant={config.enabled ? 'info' : 'error'} label={config.enabled ? 'Enabled' : 'Disabled'} />}
                  {config?.hasCredentials && (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={validatingProvider === type}
                      onClick={() => handleValidate(type)}
                    >
                      Validate
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => openConfigure(type)}>
                    Configure
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={!!providerTarget}
        onClose={() => { setProviderTarget(null); setProviderForm(blankProviderForm); }}
        title={providerTarget ? `Configure ${PROVIDER_LABELS[providerTarget]}` : 'Configure Provider'}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          {providerTarget === 'manual_bank_file' && (
            <p className="text-sm text-cash-green/70">
              Manual Bank File makes no external API calls, so there's nothing to authenticate —
              Execute just generates a payment file for you to upload to your bank yourself.
            </p>
          )}
          {providerTarget && PROVIDER_HAS_ENVIRONMENT[providerTarget] && (
            <Select
              label="Environment"
              value={providerForm.environment}
              options={[
                { value: 'sandbox', label: 'Sandbox / Test' },
                { value: 'production', label: 'Production / Live' },
              ]}
              onChange={(v) => setProviderForm((f) => ({ ...f, environment: v as 'sandbox' | 'production' }))}
              hint="Match whichever mode you copied the credentials below from — the label your provider uses (Test/Live, Sandbox/Live) varies, this is the same underlying setting."
            />
          )}
          <label className="flex items-center gap-2 text-sm text-deep-cash">
            <input
              type="checkbox"
              checked={providerForm.enabled}
              onChange={(e) => setProviderForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
            Enabled
          </label>
          <label className="flex items-center gap-2 text-sm text-deep-cash">
            <input
              type="checkbox"
              checked={providerForm.isDefault}
              onChange={(e) => setProviderForm((f) => ({ ...f, isDefault: e.target.checked }))}
            />
            Set as default provider
          </label>
          {providerTarget &&
            PROVIDER_CREDENTIAL_FIELDS[providerTarget].map(({ key, label, placeholder, hint }) => {
              const currentConfig = providers?.find((p) => p.providerType === providerTarget);
              const preview = key === PRIMARY_CREDENTIAL_KEY[providerTarget] ? currentConfig?.credentialsPreview : null;
              return (
                <Input
                  key={key}
                  label={preview ? `${label} (currently ${preview})` : `${label} (leave blank to keep current)`}
                  type="password"
                  showPasswordToggle
                  placeholder={placeholder}
                  hint={hint}
                  value={providerForm.credentials[key] ?? ''}
                  onChange={(e) =>
                    setProviderForm((f) => ({
                      ...f,
                      credentials: { ...f.credentials, [key]: e.target.value },
                    }))
                  }
                />
              );
            })}
          {providerTarget && PROVIDER_HAS_WEBHOOK[providerTarget] && (
            <Input
              label={
                providers?.find((p) => p.providerType === providerTarget)?.hasWebhookSecret
                  ? 'Webhook Secret (already set - leave blank to keep it)'
                  : 'Webhook Secret (not yet set)'
              }
              type="password"
              showPasswordToggle
              value={providerForm.webhookSecret}
              onChange={(e) => setProviderForm((f) => ({ ...f, webhookSecret: e.target.value }))}
              hint={WEBHOOK_SECRET_HINTS[providerTarget]}
            />
          )}
          {providerTarget && PROVIDER_CREDENTIAL_FIELDS[providerTarget].length > 0 && (
            <p className="text-xs text-cash-green/50">
              Credentials are encrypted at rest and never shown again once saved.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setProviderTarget(null); setProviderForm(blankProviderForm); }}>
              Cancel
            </Button>
            <Button variant="primary" loading={configureMutation.isPending} onClick={() => configureMutation.mutate()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
