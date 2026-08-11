import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlugZap } from 'lucide-react';
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
import type { BackendDisbursementProviderConfig, ConfigureProviderRequest } from '@/lib/api/types';

// Only Paystack/Flutterwave are collection-capable (createDedicatedAccount) -
// this is the platform's own shared config, used to fund wallet-based
// disbursement and provision tenant top-up virtual accounts. Not tenant-scoped.
type WalletProviderType = 'paystack' | 'flutterwave';
const PROVIDER_TYPES: WalletProviderType[] = ['paystack', 'flutterwave'];

const PROVIDER_LABELS: Record<WalletProviderType, string> = {
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
};

const CREDENTIAL_FIELDS: Record<WalletProviderType, { key: string; label: string; placeholder: string; hint: string }[]> = {
  paystack: [
    {
      key: 'secretKey',
      label: 'Secret Key',
      placeholder: 'sk_test_xxxxxxxxxxxx or sk_live_xxxxxxxxxxxx',
      hint: 'From the platform\'s own Paystack account (Settings → API Keys & Webhooks) - not any tenant\'s.',
    },
  ],
  flutterwave: [
    {
      key: 'secretKey',
      label: 'Secret Key',
      placeholder: 'FLWSECK_TEST-xxxxxxxxxxxx or FLWSECK-xxxxxxxxxxxx',
      hint: 'From the platform\'s own Flutterwave account (Settings → API) - not any tenant\'s.',
    },
  ],
};

const blankForm = {
  environment: 'sandbox' as 'sandbox' | 'production',
  enabled: true,
  credentials: {} as Record<string, string>,
  webhookSecret: '',
};

export default function SAWalletProviders() {
  const qc = useQueryClient();
  const toast = useToast();
  const platformRole = useAuthStore((s) => s.user?.platformRole);
  // super_admin and platform_admin both hold PlatformPermission.DISBURSEMENT_CONFIGURE
  // (platform-roles.enum.ts) - support_engineer/auditor/devops do not.
  const canWrite = platformRole === 'super_admin' || platformRole === 'platform_admin';

  const [target, setTarget] = useState<WalletProviderType | null>(null);
  const [form, setForm] = useState(blankForm);

  const paystackQuery = useQuery<BackendDisbursementProviderConfig | null>({
    queryKey: ['platform-wallet-provider', 'paystack'],
    queryFn: () => apiClient(ENDPOINTS.PLATFORM_DISBURSEMENT.PROVIDER_CONFIG('paystack')),
  });
  const flutterwaveQuery = useQuery<BackendDisbursementProviderConfig | null>({
    queryKey: ['platform-wallet-provider', 'flutterwave'],
    queryFn: () => apiClient(ENDPOINTS.PLATFORM_DISBURSEMENT.PROVIDER_CONFIG('flutterwave')),
  });
  const configs: Record<WalletProviderType, BackendDisbursementProviderConfig | null | undefined> = {
    paystack: paystackQuery.data,
    flutterwave: flutterwaveQuery.data,
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const fields = CREDENTIAL_FIELDS[target!];
      const credentials: Record<string, string> = {};
      fields.forEach(({ key }) => {
        const v = form.credentials[key]?.trim();
        if (v) credentials[key] = v;
      });
      const body: ConfigureProviderRequest = {
        environment: form.environment,
        enabled: form.enabled,
        ...(Object.keys(credentials).length > 0 ? { credentials } : {}),
        ...(form.webhookSecret.trim() ? { webhookSecret: form.webhookSecret.trim() } : {}),
      };
      return apiClient(ENDPOINTS.PLATFORM_DISBURSEMENT.PROVIDER_CONFIG(target!), {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-wallet-provider', target] });
      toast.success(`${PROVIDER_LABELS[target!]} configuration saved`);
      setTarget(null);
      setForm(blankForm);
    },
    onError: (err) => toast.error('Failed to save configuration', err instanceof Error ? err.message : undefined),
  });

  function openConfigure(type: WalletProviderType) {
    const existing = configs[type];
    setTarget(type);
    setForm({
      environment: existing?.environment ?? 'sandbox',
      enabled: existing?.enabled ?? true,
      credentials: {},
      webhookSecret: '',
    });
  }

  return (
    <div className="p-[clamp(0.75rem,4vw,1.5rem)] max-w-[820px] mx-auto">
      <PageHeader
        title="Wallet Payout Providers"
        breadcrumbs={[{ label: 'Wallet Payout Providers' }]}
      />
      <p className="text-sm text-cash-green/70 mb-6">
        Platform-wide Paystack/Flutterwave credentials used to fund wallet-based disbursement and
        provision tenant top-up virtual accounts. These are separate from any individual tenant's own
        provider credentials configured under their Disbursement Settings.
      </p>

      {!canWrite && (
        <div className="bg-soft-white border border-mint-light rounded-lg px-4 py-3 mb-6 text-sm text-cash-green/80">
          You have read-only access to wallet payout providers. Only Super Admin or Platform Admin can change these.
        </div>
      )}

      <div className="bg-white rounded-xl border border-mint-light overflow-hidden">
        <div className="px-6 py-4 border-b border-mint-light flex items-center gap-2">
          <PlugZap size={16} className="text-cash-green" />
          <h3 className="text-sm font-semibold text-deep-cash">Providers</h3>
        </div>
        <div className="divide-y divide-mint-light">
          {PROVIDER_TYPES.map((type) => {
            const config = configs[type];
            return (
              <div key={type} className="flex items-center justify-between gap-3 px-6 py-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-deep-cash">{PROVIDER_LABELS[type]}</p>
                  <p className="text-xs text-cash-green/60 mt-0.5">
                    {config
                      ? (
                        <>
                          {config.environment}
                          {' · '}
                          {config.credentialsEncrypted ? 'Credentials configured' : 'No credentials set'}
                          {config.lastValidatedAt && <> · validated {formatDate(config.lastValidatedAt)}</>}
                        </>
                      )
                      : 'Not configured'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {config && <Badge variant={config.enabled ? 'info' : 'error'} label={config.enabled ? 'Enabled' : 'Disabled'} />}
                  {canWrite && (
                    <Button variant="secondary" size="sm" onClick={() => openConfigure(type)}>
                      Configure
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={!!target}
        onClose={() => { setTarget(null); setForm(blankForm); }}
        title={target ? `Configure ${PROVIDER_LABELS[target]}` : 'Configure Provider'}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Select
            label="Environment"
            value={form.environment}
            options={[
              { value: 'sandbox', label: 'Sandbox / Test' },
              { value: 'production', label: 'Production / Live' },
            ]}
            onChange={(v) => setForm((f) => ({ ...f, environment: v as 'sandbox' | 'production' }))}
          />
          <label className="flex items-center gap-2 text-sm text-deep-cash">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
            Enabled
          </label>
          {target &&
            CREDENTIAL_FIELDS[target].map(({ key, label, placeholder, hint }) => (
              <Input
                key={key}
                label={`${label} (leave blank to keep current)`}
                type="password"
                showPasswordToggle
                placeholder={placeholder}
                hint={hint}
                value={form.credentials[key] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, credentials: { ...f.credentials, [key]: e.target.value } }))}
              />
            ))}
          <Input
            label="Webhook Secret (leave blank to keep current)"
            type="password"
            showPasswordToggle
            value={form.webhookSecret}
            onChange={(e) => setForm((f) => ({ ...f, webhookSecret: e.target.value }))}
            hint="Used to verify inbound wallet top-up webhooks from this provider."
          />
          <p className="text-xs text-cash-green/50">
            Credentials are encrypted at rest and never shown again once saved.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setTarget(null); setForm(blankForm); }}>Cancel</Button>
            <Button variant="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
