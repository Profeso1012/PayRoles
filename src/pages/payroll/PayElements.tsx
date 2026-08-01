import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Lock, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import type { PayElementDefinition } from '@contracts/types/payroll';

// Real backend PayElementType enum (common.enum.ts) - lowercase.
const typeOptions = [
  { value: 'earning', label: 'Earning' },
  { value: 'deduction', label: 'Deduction' },
  { value: 'employer_contribution', label: 'Employer Contribution' },
  { value: 'tax', label: 'Tax (delegates to a tax rule)' },
  { value: 'benefit', label: 'Benefit' },
];

const typeVariant: Record<string, 'success' | 'error' | 'info' | 'warning'> = {
  earning: 'success',
  deduction: 'error',
  employer_contribution: 'info',
  tax: 'warning',
  benefit: 'info',
};

const typeLabel: Record<string, string> = {
  earning: 'Earning',
  deduction: 'Deduction',
  employer_contribution: 'Employer Contribution',
  tax: 'Tax',
  benefit: 'Benefit',
};

const blank = { 
  code: '', 
  name: '', 
  type: 'earning', 
  formula: '', 
  taxRuleCode: '', 
  autoApply: true,
  isTaxable: true,
  sortOrder: 100,
  description: '',
};

export default function PayElements() {
  const qc = useQueryClient();
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PayElementDefinition | null>(null);
  const [form, setForm] = useState(blank);
  const [deleteTarget, setDeleteTarget] = useState<PayElementDefinition | null>(null);

  const { data: elements, isLoading, isError, refetch } = useQuery<PayElementDefinition[]>({
    queryKey: ['pay-elements'],
    queryFn: async () => {
      // No params here defaults to PaginationDto's limit: 20, silently
      // truncating this page for any tenant with more than 20 pay elements.
      const response = await apiClient<any>(`${ENDPOINTS.PAY_ELEMENTS.LIST}?${buildPaginationParams({ limit: 100 })}`);
      const items = Array.isArray(response) ? response : (response.data || []);
      return items;
    },
  });

  // Fetch tax rules for dropdown
  const { data: taxRules } = useQuery<Array<{ code: string; name: string }>>({
    queryKey: ['tax-rules'],
    queryFn: async () => {
      try {
        const response = await apiClient<any>(ENDPOINTS.TAX.RULES);
        const rules = Array.isArray(response) ? response : (response.data || []);
        return rules.map((rule: any) => ({
          code: rule.code,
          name: rule.name || rule.code,
        }));
      } catch (error) {
        console.error('Failed to fetch tax rules:', error);
        return [];
      }
    },
    enabled: modalOpen, // Only fetch when modal is open
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      // code is UPPER_SNAKE_CASE and immutable once created (formulas
      // reference it elsewhere) - only send it on create.
      const payload: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        formula: form.formula || undefined,
        isTaxable: form.isTaxable,
        sortOrder: parseInt(String(form.sortOrder), 10) || 100,
        description: form.description || undefined,
      };
      // autoApply has no safe default for type=tax - the backend 400s
      // (PayElementAutoApplyRequiredException) if it's omitted here.
      if (form.type === 'tax') {
        payload.taxRuleCode = form.taxRuleCode || undefined;
        payload.autoApply = form.autoApply;
      }

      if (editing) {
        return apiClient<PayElementDefinition>(ENDPOINTS.PAY_ELEMENTS.UPDATE(editing.id), {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      return apiClient<PayElementDefinition>(ENDPOINTS.PAY_ELEMENTS.CREATE, {
        method: 'POST',
        body: JSON.stringify({ ...payload, code: form.code, isStatutory: false }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-elements'] });
      toast.success(editing ? 'Pay element updated' : 'Pay element created');
      closeModal();
    },
    onError: (err) => toast.error('Failed to save pay element', err instanceof Error ? err.message : undefined),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiClient(ENDPOINTS.PAY_ELEMENTS.DEACTIVATE(id), { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-elements'] });
      toast.success('Pay element deactivated');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error('Failed to deactivate pay element', err instanceof Error ? err.message : undefined),
  });

  // No dedicated /activate route exists, but UpdatePayElementDto (unlike
  // Worker/LegalEntity's update DTOs) does include isActive - so the generic
  // update endpoint can flip it back on. Without this, a deactivated element
  // still shows up in GET /pay-elements forever (findAll doesn't filter by
  // isActive) with no way to bring it back.
  const reactivateMutation = useMutation({
    mutationFn: (id: string) => apiClient(ENDPOINTS.PAY_ELEMENTS.UPDATE(id), { method: 'PATCH', body: JSON.stringify({ isActive: true }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-elements'] });
      toast.success('Pay element reactivated');
    },
    onError: (err) => toast.error('Failed to reactivate pay element', err instanceof Error ? err.message : undefined),
  });

  function openAdd() {
    setEditing(null);
    setForm(blank);
    setModalOpen(true);
  }

  function openEdit(el: PayElementDefinition) {
    setEditing(el);
    setForm({
      code: el.code,
      name: el.name,
      type: el.type,
      formula: el.formula ?? '',
      taxRuleCode: el.taxRuleCode ?? '',
      autoApply: el.autoApply,
      isTaxable: el.isTaxable ?? true,
      sortOrder: el.sortOrder ?? 100,
      description: el.description ?? '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(blank);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  const earnings = (elements ?? []).filter((e) => e.type === 'earning');
  const deductions = (elements ?? []).filter((e) => e.type === 'deduction');
  const contributions = (elements ?? []).filter((e) => e.type === 'employer_contribution');
  const taxes = (elements ?? []).filter((e) => e.type === 'tax');
  const benefits = (elements ?? []).filter((e) => e.type === 'benefit');

  function ElementGroup({ title, items }: { title: string; items: PayElementDefinition[] }) {
    if (items.length === 0) return null;
    return (
      <div className="bg-white rounded-xl border border-mint-light overflow-hidden mb-4">
        <div className="px-5 py-3 bg-soft-white border-b border-mint-light">
          <p className="text-xs font-semibold text-cash-green uppercase tracking-wide">{title}</p>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {items.map((el, idx) => (
              <tr
                key={el.id}
                className={idx < items.length - 1 ? 'border-b border-mint-light/50' : ''}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-deep-cash">{el.name}</span>
                    {!el.isActive && <Badge variant="error" label="Inactive" />}
                    {el.isStatutory && (
                      <span className="inline-flex items-center gap-1 text-xs text-cash-green/60">
                        <Lock size={11} />
                        Statutory
                      </span>
                    )}
                    {el.type === 'tax' && !el.autoApply && (
                      <span className="text-xs text-cash-green/60">· assigned only</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <Badge variant={typeVariant[el.type]} label={typeLabel[el.type]} />
                </td>
                <td className="px-5 py-3 font-mono text-xs text-cash-green/70">{el.formula ?? '—'}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {el.isActive ? (
                      <>
                        <button
                          onClick={() => openEdit(el)}
                          className="p-1.5 rounded hover:bg-mint-light text-cash-green transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        {!el.isStatutory && (
                          <button
                            onClick={() => setDeleteTarget(el)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={reactivateMutation.isPending && reactivateMutation.variables === el.id}
                        onClick={() => reactivateMutation.mutate(el.id)}
                      >
                        Reactivate
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title="Pay Elements"
        action={
          <Button variant="primary" onClick={openAdd}>
            <Plus size={16} />
            Add Element
          </Button>
        }
      />
      <p className="text-sm text-cash-green/70 mb-6">
        Define earnings, deductions and employer contributions used in payroll calculations.
      </p>

      {/* BASIC_SALARY Info Note */}
      <div className="flex items-start gap-3 p-4 bg-mint-light/30 border border-mint-light rounded-lg mb-6">
        <div>
          <p className="text-sm font-semibold text-deep-cash mb-1">BASIC_SALARY is auto-managed</p>
          <p className="text-sm text-cash-green">
            The BASIC_SALARY pay element is automatically created by the system during payroll calculations and pulls amounts directly from employee compensation records. 
            You don't need to manually create or assign it.
          </p>
        </div>
      </div>

      {(!elements || elements.length === 0) ? (
        <EmptyState
          title="No pay elements defined"
          description="Add earnings, deductions and contributions to run payroll."
          action={{ label: 'Add Element', onClick: openAdd }}
        />
      ) : (
        <>
          <ElementGroup title="Earnings" items={earnings} />
          <ElementGroup title="Deductions" items={deductions} />
          <ElementGroup title="Employer Contributions" items={contributions} />
          <ElementGroup title="Taxes" items={taxes} />
          <ElementGroup title="Benefits" items={benefits} />
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Pay Element' : 'New Pay Element'}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Code"
            value={form.code}
            disabled={!!editing}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                // Backend requires UPPER_SNAKE_CASE (/^[A-Z][A-Z0-9_]*$/), starting with a letter.
                code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').replace(/^[0-9_]+/, ''),
              }))
            }
            placeholder="e.g. TRANSPORT_ALLOWANCE"
            hint={editing ? 'Code cannot be changed once created — formulas may reference it.' : 'Unique identifier, referenced by other formulas.'}
          />
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Transport Allowance"
          />
          <Select
            label="Type"
            value={form.type}
            options={typeOptions}
            onChange={(v) => setForm((f) => ({ 
              ...f, 
              type: v,
              // Reset tax-specific fields when changing away from tax
              taxRuleCode: v === 'tax' ? f.taxRuleCode : '',
              autoApply: v === 'tax' ? f.autoApply : true,
              // Reset isTaxable when changing to tax
              isTaxable: v === 'tax' ? false : f.isTaxable,
            }))}
          />
          {form.type === 'tax' ? (
            <>
              <Select
                label="Tax Rule"
                value={form.taxRuleCode}
                options={[
                  { value: '', label: '-- Select Tax Rule --' },
                  ...(taxRules || []).map((rule) => ({
                    value: rule.code,
                    label: `${rule.name} (${rule.code})`,
                  })),
                ]}
                onChange={(v) => setForm((f) => ({ ...f, taxRuleCode: v }))}
                hint="Select the tax calculation rule this element applies"
              />
              <Select
                label="Applies to"
                value={form.autoApply ? 'auto' : 'assigned'}
                options={[
                  { value: 'auto', label: 'Every employee automatically (e.g. PAYE)' },
                  { value: 'assigned', label: 'Only employees explicitly assigned this (e.g. withholding tax)' },
                ]}
                onChange={(v) => setForm((f) => ({ ...f, autoApply: v === 'auto' }))}
              />
            </>
          ) : (
            <Input
              label="Formula (optional)"
              value={form.formula}
              onChange={(e) => setForm((f) => ({ ...f, formula: e.target.value }))}
              placeholder="e.g. gross * 0.15"
              hint={
                <span>
                  Leave empty for fixed amounts. Need help with formula rules?{' '}
                  <a
                    href="/formula-guide"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cash-green hover:text-deep-cash underline font-medium"
                  >
                    View Formula Guide
                  </a>
                </span>
              }
            />
          )}
          
          {/* Additional fields */}
          {form.type !== 'tax' && (
            <div>
              <label className="flex items-center gap-2 text-sm text-cash-green font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isTaxable}
                  onChange={(e) => setForm((f) => ({ ...f, isTaxable: e.target.checked }))}
                  className="w-4 h-4 text-fresh-cash border-mint-light rounded focus:ring-fresh-cash"
                />
                <span>Taxable</span>
              </label>
              <p className="text-xs text-cash-green/60 mt-1 ml-6">
                Check if this element should be included in taxable income calculations
              </p>
            </div>
          )}
          
          <Input
            label="Sort Order"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 100 }))}
            placeholder="100"
            hint="Display order on payslips (lower numbers appear first)"
          />
          
          <div>
            <p className="text-sm text-cash-green font-medium mb-1">Description (Optional)</p>
            <textarea
              className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Monthly transportation stipend for employees"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button
              variant="primary"
              loading={saveMutation.isPending}
              disabled={!form.name || (!editing && !form.code)}
              onClick={() => saveMutation.mutate()}
            >
              {editing ? 'Save Changes' : 'Add Element'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deactivateMutation.mutate(deleteTarget.id)}
        title="Deactivate Pay Element"
        message={`Deactivate "${deleteTarget?.name}"? It will stop applying to future payroll calculations, but existing history is kept.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}
