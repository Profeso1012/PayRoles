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

const PROVIDER_OPTIONS = PROVIDER_TYPES.map((value) => ({ value, label: PROVIDER_LABELS[value] }));

const EXECUTION_POLICY_OPTIONS = [
  { value: 'manual', label: 'Manual — Finance clicks Initiate' },
  { value: 'immediate', label: 'Immediate — runs the moment payroll is approved' },
  { value: 'scheduled', label: 'Scheduled — runs at a configured time' },
];

const APPROVAL_WORKFLOW_OPTIONS = [
  { value: 'none', label: 'None — no separate batch approval' },
  { value: 'single', label: 'Single approver' },
  { value: 'dual', label: 'Dual approval' },
  { value: 'finance', label: 'Finance sign-off' },
  { value: 'ceo', label: 'CEO sign-off' },
  { value: 'multi_level', label: 'Multi-level' },
];

const blankProviderForm = {
  environment: 'sandbox' as 'sandbox' | 'production',
  enabled: true,
  isDefault: false,
  apiKey: '',
  secretKey: '',
  webhookSecret: '',
};

export default function DisbursementSettings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'finance_manager' || role === 'tenant_admin' || role === 'super_admin';

  const { data: settings, isLoading, isError, refetch } = useQuery<BackendDisbursementSettings>({
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
      const credentials: Record<string, string> = {};
      if (providerForm.apiKey.trim()) credentials.apiKey = providerForm.apiKey.trim();
      if (providerForm.secretKey.trim()) credentials.secretKey = providerForm.secretKey.trim();
      const body: ConfigureProviderRequest = {
        environment: providerForm.environment,
        enabled: providerForm.enabled,
        isDefault: providerForm.isDefault,
        ...(Object.keys(credentials).length > 0 ? { credentials } : {}),
        ...(providerForm.webhookSecret.trim() ? { webhookSecret: providerForm.webhookSecret.trim() } : {}),
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
      apiKey: '',
      secretKey: '',
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
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (!canManage) {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
        <div className="bg-white rounded-xl border border-mint-light p-8 text-center text-cash-green/70 text-sm">
          You need Finance or Tenant Admin access to manage disbursement settings.
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
            label="Max retries"
            type="number"
            value={String(form.retryPolicy?.maxRetries ?? '')}
            onChange={(e) => setForm((f) => ({ ...f, retryPolicy: { ...f.retryPolicy!, maxRetries: Number(e.target.value) } }))}
          />
          <Input
            label="Retry interval (minutes)"
            type="number"
            value={String(form.retryPolicy?.retryIntervalMinutes ?? '')}
            onChange={(e) => setForm((f) => ({ ...f, retryPolicy: { ...f.retryPolicy!, retryIntervalMinutes: Number(e.target.value) } }))}
          />
          <Input
            label="Retry window (hours)"
            type="number"
            value={String(form.retryPolicy?.maxRetryWindowHours ?? '')}
            onChange={(e) => setForm((f) => ({ ...f, retryPolicy: { ...f.retryPolicy!, maxRetryWindowHours: Number(e.target.value) } }))}
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
                  <p className="text-sm font-medium text-deep-cash">{PROVIDER_LABELS[type]}</p>
                  <p className="text-xs text-cash-green/60 mt-0.5">
                    {config ? (
                      <>
                        {config.environment} · {config.credentialsEncrypted ? 'Credentials configured' : 'No credentials set'}
                        {config.lastValidatedAt && <> · validated {formatDate(config.lastValidatedAt)}</>}
                      </>
                    ) : (
                      'Not configured'
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {config?.isDefault && <Badge variant="success" label="Default" />}
                  {config && <Badge variant={config.enabled ? 'info' : 'error'} label={config.enabled ? 'Enabled' : 'Disabled'} />}
                  {config?.credentialsEncrypted && (
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
          <Select
            label="Environment"
            value={providerForm.environment}
            options={[
              { value: 'sandbox', label: 'Sandbox' },
              { value: 'production', label: 'Production' },
            ]}
            onChange={(v) => setProviderForm((f) => ({ ...f, environment: v as 'sandbox' | 'production' }))}
          />
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
          <Input
            label="API Key (leave blank to keep current)"
            type="password"
            value={providerForm.apiKey}
            onChange={(e) => setProviderForm((f) => ({ ...f, apiKey: e.target.value }))}
          />
          <Input
            label="Secret Key (leave blank to keep current)"
            type="password"
            value={providerForm.secretKey}
            onChange={(e) => setProviderForm((f) => ({ ...f, secretKey: e.target.value }))}
          />
          <Input
            label="Webhook Secret (leave blank to keep current)"
            type="password"
            value={providerForm.webhookSecret}
            onChange={(e) => setProviderForm((f) => ({ ...f, webhookSecret: e.target.value }))}
          />
          <p className="text-xs text-cash-green/50">
            Credentials are encrypted at rest and never shown again once saved.
          </p>
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
