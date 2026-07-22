import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronDown, ChevronUp, Globe, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import type {
  TaxJurisdiction,
  TaxRule,
  TaxVersion,
  BackendTaxCalculationBasis,
  BackendTaxReliefType,
  CreateTaxRuleRequest,
  CreateTaxVersionRequest,
} from '@/lib/api/types';

const FLAG_EMOJI: Record<string, string> = {
  NG: '🇳🇬', GB: '🇬🇧', US: '🇺🇸', CA: '🇨🇦', GH: '🇬🇭', KE: '🇰🇪', ZA: '🇿🇦',
};

const BASIS_OPTIONS: { value: BackendTaxCalculationBasis; label: string }[] = [
  { value: 'annual', label: 'Annual' },
  { value: 'monthly', label: 'Monthly' },
];

const RELIEF_TYPE_OPTIONS: { value: BackendTaxReliefType; label: string }[] = [
  { value: 'fixed_amount', label: 'Fixed amount' },
  { value: 'percentage_of_gross', label: '% of gross' },
  { value: 'percentage_of_gross_capped', label: '% of gross, capped' },
  { value: 'greater_of_fixed_or_percentage', label: 'Greater of fixed or %' },
  { value: 'percentage_of_worker_amount_capped', label: '% of a worker-supplied amount, capped (e.g. rent)' },
];

interface BandRow {
  sequence: string;
  lowerBoundMinor: string; // major units in the form, converted on submit
  upperBoundMinor: string; // blank = open-ended (top band)
  ratePercent: string;
}

interface ReliefRow {
  code: string;
  name: string;
  type: BackendTaxReliefType;
  value: string;
  capMinor: string; // major units in the form, converted on submit; blank = uncapped
  isActive: boolean;
}

const blankBand: BandRow = { sequence: '1', lowerBoundMinor: '0', upperBoundMinor: '', ratePercent: '' };
const blankRelief: ReliefRow = { code: '', name: '', type: 'fixed_amount', value: '', capMinor: '', isActive: true };

const blankRuleForm = { code: '', name: '', jurisdictionCode: '', description: '' };
const blankVersionForm = {
  code: '',
  name: '',
  effectiveDate: '',
  endDate: '',
  basis: 'annual' as BackendTaxCalculationBasis,
  notes: '',
  bands: [blankBand],
  reliefs: [] as ReliefRow[],
};

interface JurisdictionRow {
  jurisdiction: TaxJurisdiction;
  rules: Array<{ rule: TaxRule; versions: TaxVersion[] }>;
}

export default function SATaxManagement() {
  const qc = useQueryClient();
  const toast = useToast();
  const platformRole = useAuthStore((s) => s.user?.platformRole);
  // Only platform super_admin holds PlatformPermission.TAX_RULE_WRITE -
  // support_engineer/auditor are read-only, devops has neither.
  const canWrite = platformRole === 'super_admin';

  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState(blankRuleForm);
  const [versionModalTarget, setVersionModalTarget] = useState<TaxRule | null>(null);
  const [versionForm, setVersionForm] = useState(blankVersionForm);
  const [togglingCode, setTogglingCode] = useState<string | null>(null);

  const { data: rows, isLoading, isError, refetch } = useQuery<JurisdictionRow[]>({
    queryKey: ['platform-tax-tree'],
    queryFn: async () => {
      const [jurisdictions, rules] = await Promise.all([
        apiClient<TaxJurisdiction[]>(ENDPOINTS.PLATFORM_TAX.JURISDICTIONS),
        apiClient<TaxRule[]>(ENDPOINTS.PLATFORM_TAX.RULES),
      ]);
      return Promise.all(
        jurisdictions.map(async (jurisdiction): Promise<JurisdictionRow> => {
          const jurisdictionRules = rules.filter((r) => r.jurisdictionId === jurisdiction.id);
          const withVersions = await Promise.all(
            jurisdictionRules.map(async (rule) => {
              const versions = await apiClient<TaxVersion[]>(ENDPOINTS.PLATFORM_TAX.RULE_VERSIONS(rule.code)).catch(() => []);
              return { rule, versions };
            }),
          );
          return { jurisdiction, rules: withVersions };
        }),
      );
    },
  });

  const jurisdictionOptions = (rows ?? []).map((r) => ({ value: r.jurisdiction.code, label: `${r.jurisdiction.name} (${r.jurisdiction.code})` }));

  const invalidate = () => qc.invalidateQueries({ queryKey: ['platform-tax-tree'] });

  const createRuleMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.PLATFORM_TAX.CREATE_RULE, {
        method: 'POST',
        body: JSON.stringify({
          code: ruleForm.code,
          name: ruleForm.name,
          jurisdictionCode: ruleForm.jurisdictionCode,
          description: ruleForm.description || undefined,
        } satisfies CreateTaxRuleRequest),
      }),
    onSuccess: () => {
      invalidate();
      toast.success('Tax rule created');
      setRuleModalOpen(false);
      setRuleForm(blankRuleForm);
    },
    onError: (err) => toast.error('Failed to create tax rule', err instanceof Error ? err.message : undefined),
  });

  const createVersionMutation = useMutation({
    mutationFn: () => {
      if (!versionModalTarget) return Promise.reject(new Error('No rule selected'));
      return apiClient(ENDPOINTS.PLATFORM_TAX.CREATE_VERSION, {
        method: 'POST',
        body: JSON.stringify({
          code: versionForm.code,
          taxRuleCode: versionModalTarget.code,
          name: versionForm.name,
          effectiveDate: versionForm.effectiveDate,
          endDate: versionForm.endDate || undefined,
          basis: versionForm.basis,
          notes: versionForm.notes || undefined,
          bands: versionForm.bands.map((b) => ({
            sequence: parseInt(b.sequence, 10),
            lowerBoundMinor: Math.round(parseFloat(b.lowerBoundMinor || '0') * 100),
            upperBoundMinor: b.upperBoundMinor ? Math.round(parseFloat(b.upperBoundMinor) * 100) : undefined,
            ratePercent: parseFloat(b.ratePercent),
          })),
          reliefs: versionForm.reliefs.length
            ? versionForm.reliefs.map((r) => ({
                code: r.code,
                name: r.name,
                type: r.type,
                value: parseFloat(r.value),
                capMinor: r.capMinor ? Math.round(parseFloat(r.capMinor) * 100) : undefined,
                isActive: r.isActive,
              }))
            : undefined,
        } satisfies CreateTaxVersionRequest),
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success('Tax version created');
      setVersionModalTarget(null);
      setVersionForm(blankVersionForm);
    },
    onError: (err) => toast.error('Failed to create tax version', err instanceof Error ? err.message : undefined),
  });

  const activateMutation = useMutation({
    mutationFn: ({ code, activate }: { code: string; activate: boolean }) =>
      apiClient(
        activate ? ENDPOINTS.PLATFORM_TAX.ACTIVATE(code) : ENDPOINTS.PLATFORM_TAX.DEACTIVATE(code),
        { method: 'PATCH' },
      ),
    onMutate: ({ code }) => setTogglingCode(code),
    onSuccess: (_, { activate }) => {
      invalidate();
      toast.success(activate ? 'Tax version activated' : 'Tax version deactivated');
    },
    onError: (err) => toast.error('Failed to update tax version', err instanceof Error ? err.message : undefined),
    onSettled: () => setTogglingCode(null),
  });

  function toggleExpand(code: string) {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function openVersionModal(rule: TaxRule) {
    setVersionModalTarget(rule);
    setVersionForm(blankVersionForm);
  }

  function updateBand(index: number, patch: Partial<BandRow>) {
    setVersionForm((f) => ({
      ...f,
      bands: f.bands.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }));
  }

  function addBand() {
    setVersionForm((f) => {
      const last = f.bands[f.bands.length - 1];
      return {
        ...f,
        bands: [
          ...f.bands,
          { sequence: String(f.bands.length + 1), lowerBoundMinor: last?.upperBoundMinor || '', upperBoundMinor: '', ratePercent: '' },
        ],
      };
    });
  }

  function removeBand(index: number) {
    setVersionForm((f) => ({ ...f, bands: f.bands.filter((_, i) => i !== index) }));
  }

  function updateRelief(index: number, patch: Partial<ReliefRow>) {
    setVersionForm((f) => ({
      ...f,
      reliefs: f.reliefs.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  }

  function addRelief() {
    setVersionForm((f) => ({ ...f, reliefs: [...f.reliefs, { ...blankRelief }] }));
  }

  function removeRelief(index: number) {
    setVersionForm((f) => ({ ...f, reliefs: f.reliefs.filter((_, i) => i !== index) }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !rows) {
    return <ErrorState message="Failed to load tax rules." onRetry={() => refetch()} />;
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-semibold text-deep-cash">Tax Rules</h1>
          <p className="text-sm text-cash-green/70 mt-0.5">
            Jurisdiction-wide statutory tax reference data, shared by every company on PayRole.
          </p>
        </div>
        {canWrite && (
          <Button variant="primary" onClick={() => setRuleModalOpen(true)}>
            <Plus size={16} className="mr-2" />
            New Tax Rule
          </Button>
        )}
      </div>

      {!canWrite && (
        <div className="bg-soft-white border border-mint-light rounded-lg px-4 py-3 mb-6 text-sm text-cash-green/80">
          You have read-only access to tax rules. Only a platform Super Admin can create rules/versions or activate/deactivate a version.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {rows.length === 0 && (
          <div className="bg-white border border-mint-light rounded-xl p-8 text-center text-cash-green/70 text-sm">
            No jurisdictions configured yet.
          </div>
        )}

        {rows.map(({ jurisdiction, rules }) => {
          const isExpanded = expandedCodes.has(jurisdiction.code);
          return (
            <div key={jurisdiction.id} className="bg-white border border-mint-light rounded-xl overflow-hidden">
              <div className="flex items-center gap-3.5 px-5 py-4">
                <span className="text-2xl leading-none shrink-0">{FLAG_EMOJI[jurisdiction.code] ?? <Globe size={24} />}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-deep-cash text-sm">{jurisdiction.name}</p>
                  <p className="text-xs text-cash-green/70 mt-0.5">
                    {jurisdiction.currency} · {rules.length} tax rule{rules.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleExpand(jurisdiction.code)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-cash-green text-xs font-medium hover:bg-mint-light/50 transition-colors"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {isExpanded ? 'Hide' : 'Show'} rules
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-mint-light px-5 py-3.5 bg-soft-white flex flex-col gap-3.5">
                  {rules.length === 0 ? (
                    <p className="text-xs text-cash-green/70">No tax rules configured for this jurisdiction.</p>
                  ) : (
                    rules.map(({ rule, versions }) => (
                      <div key={rule.id}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-sm font-semibold text-deep-cash">{rule.name}</p>
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => openVersionModal(rule)}
                              className="text-xs font-medium text-fresh-cash hover:text-cash-green"
                            >
                              + New Version
                            </button>
                          )}
                        </div>
                        {versions.length === 0 ? (
                          <p className="text-xs text-cash-green/70 pl-2">No versions defined.</p>
                        ) : (
                          <ul className="flex flex-col gap-1.5">
                            {versions.map((v) => {
                              const isToggling = togglingCode === v.code;
                              return (
                                <li
                                  key={v.id}
                                  className={`flex items-center justify-between gap-2 text-sm text-cash-green pl-2 ${isToggling ? 'opacity-60' : ''}`}
                                >
                                  <span>
                                    {v.name} <span className="text-fresh-cash">· effective {v.effectiveDate}</span>
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant={v.isActive ? 'success' : 'info'} label={v.isActive ? 'Active' : 'Inactive'} />
                                    {canWrite && (
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        disabled={isToggling}
                                        onClick={() => activateMutation.mutate({ code: v.code, activate: !v.isActive })}
                                      >
                                        {v.isActive ? 'Deactivate' : 'Activate'}
                                      </Button>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Tax Rule modal */}
      <Modal
        isOpen={ruleModalOpen}
        onClose={() => { setRuleModalOpen(false); setRuleForm(blankRuleForm); }}
        title="New Tax Rule"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Code"
            value={ruleForm.code}
            onChange={(e) => setRuleForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').replace(/^[0-9_]+/, '') }))}
            placeholder="e.g. NIGERIA_WHT"
            hint="UPPER_SNAKE_CASE, immutable once created."
          />
          <Input
            label="Name"
            value={ruleForm.name}
            onChange={(e) => setRuleForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Nigeria Withholding Tax"
          />
          <Select
            label="Jurisdiction"
            value={ruleForm.jurisdictionCode}
            options={jurisdictionOptions}
            onChange={(v) => setRuleForm((f) => ({ ...f, jurisdictionCode: v }))}
            placeholder="Select a jurisdiction"
          />
          <Input
            label="Description (optional)"
            value={ruleForm.description}
            onChange={(e) => setRuleForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setRuleModalOpen(false); setRuleForm(blankRuleForm); }}>Cancel</Button>
            <Button
              variant="primary"
              loading={createRuleMutation.isPending}
              disabled={!ruleForm.code || !ruleForm.name || !ruleForm.jurisdictionCode}
              onClick={() => createRuleMutation.mutate()}
            >
              Create Rule
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Tax Version modal */}
      <Modal
        isOpen={!!versionModalTarget}
        onClose={() => { setVersionModalTarget(null); setVersionForm(blankVersionForm); }}
        title={`New Version — ${versionModalTarget?.name ?? ''}`}
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code"
              value={versionForm.code}
              onChange={(e) => setVersionForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
              placeholder="e.g. NIGERIA_PIT_2027"
            />
            <Input
              label="Name"
              value={versionForm.name}
              onChange={(e) => setVersionForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Nigeria PIT 2027"
            />
            <div>
              <p className="text-sm text-cash-green font-medium mb-1">Effective From</p>
              <input
                type="date"
                className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                value={versionForm.effectiveDate}
                onChange={(e) => setVersionForm((f) => ({ ...f, effectiveDate: e.target.value }))}
              />
            </div>
            <div>
              <p className="text-sm text-cash-green font-medium mb-1">End Date (optional)</p>
              <input
                type="date"
                className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
                value={versionForm.endDate}
                onChange={(e) => setVersionForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
            <Select
              label="Basis"
              value={versionForm.basis}
              options={BASIS_OPTIONS}
              onChange={(v) => setVersionForm((f) => ({ ...f, basis: v as BackendTaxCalculationBasis }))}
            />
            <Input
              label="Notes (optional)"
              value={versionForm.notes}
              onChange={(e) => setVersionForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-deep-cash">Tax Bands</p>
              <button type="button" onClick={addBand} className="text-xs font-medium text-fresh-cash hover:text-cash-green">
                + Add Band
              </button>
            </div>
            <p className="text-xs text-cash-green/70 mb-2">
              Amounts in ₦ (converted to minor units automatically). Leave the last band's "Upper bound" blank for an open-ended top band.
            </p>
            <div className="flex flex-col gap-2">
              {versionForm.bands.map((band, i) => (
                <div key={i} className="grid grid-cols-[3rem_1fr_1fr_1fr_2rem] gap-2 items-center">
                  <input
                    type="number"
                    className="bg-white border border-mint-light rounded-md px-2 py-2 text-xs text-deep-cash outline-none focus:border-fresh-cash"
                    value={band.sequence}
                    onChange={(e) => updateBand(i, { sequence: e.target.value })}
                    placeholder="#"
                  />
                  <input
                    type="number"
                    className="bg-white border border-mint-light rounded-md px-2 py-2 text-xs text-deep-cash outline-none focus:border-fresh-cash"
                    value={band.lowerBoundMinor}
                    onChange={(e) => updateBand(i, { lowerBoundMinor: e.target.value })}
                    placeholder="Lower bound"
                  />
                  <input
                    type="number"
                    className="bg-white border border-mint-light rounded-md px-2 py-2 text-xs text-deep-cash outline-none focus:border-fresh-cash"
                    value={band.upperBoundMinor}
                    onChange={(e) => updateBand(i, { upperBoundMinor: e.target.value })}
                    placeholder="Upper bound (blank = ∞)"
                  />
                  <input
                    type="number"
                    className="bg-white border border-mint-light rounded-md px-2 py-2 text-xs text-deep-cash outline-none focus:border-fresh-cash"
                    value={band.ratePercent}
                    onChange={(e) => updateBand(i, { ratePercent: e.target.value })}
                    placeholder="Rate %"
                  />
                  <button
                    type="button"
                    onClick={() => removeBand(i)}
                    disabled={versionForm.bands.length === 1}
                    className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-deep-cash">Reliefs (optional)</p>
              <button type="button" onClick={addRelief} className="text-xs font-medium text-fresh-cash hover:text-cash-green">
                + Add Relief
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {versionForm.reliefs.map((relief, i) => (
                <div key={i} className="border border-mint-light rounded-lg p-3 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="bg-white border border-mint-light rounded-md px-2 py-2 text-xs text-deep-cash outline-none focus:border-fresh-cash"
                      value={relief.code}
                      onChange={(e) => updateRelief(i, { code: e.target.value.toUpperCase() })}
                      placeholder="Code, e.g. CRA"
                    />
                    <input
                      className="bg-white border border-mint-light rounded-md px-2 py-2 text-xs text-deep-cash outline-none focus:border-fresh-cash"
                      value={relief.name}
                      onChange={(e) => updateRelief(i, { name: e.target.value })}
                      placeholder="Name"
                    />
                  </div>
                  <Select
                    value={relief.type}
                    options={RELIEF_TYPE_OPTIONS}
                    onChange={(v) => updateRelief(i, { type: v as BackendTaxReliefType })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      className="bg-white border border-mint-light rounded-md px-2 py-2 text-xs text-deep-cash outline-none focus:border-fresh-cash"
                      value={relief.value}
                      onChange={(e) => updateRelief(i, { value: e.target.value })}
                      placeholder="Value (% or ₦ depending on type)"
                    />
                    <input
                      type="number"
                      className="bg-white border border-mint-light rounded-md px-2 py-2 text-xs text-deep-cash outline-none focus:border-fresh-cash"
                      value={relief.capMinor}
                      onChange={(e) => updateRelief(i, { capMinor: e.target.value })}
                      placeholder="Cap ₦ (optional)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRelief(i)}
                    className="self-end text-xs font-medium text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setVersionModalTarget(null); setVersionForm(blankVersionForm); }}>Cancel</Button>
            <Button
              variant="primary"
              loading={createVersionMutation.isPending}
              disabled={
                !versionForm.code || !versionForm.name || !versionForm.effectiveDate ||
                versionForm.bands.some((b) => !b.ratePercent)
              }
              onClick={() => createVersionMutation.mutate()}
            >
              Create Version
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
