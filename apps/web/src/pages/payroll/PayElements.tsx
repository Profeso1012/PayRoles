import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
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

const blank = { code: '', name: '', type: 'earning', formula: '', taxRuleCode: '' };

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
      const response = await apiClient<any>(ENDPOINTS.PAY_ELEMENTS.LIST);
      const items = Array.isArray(response) ? response : (response.data || []);
      return items;
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      // code is UPPER_SNAKE_CASE and immutable once created (formulas
      // reference it elsewhere) - only send it on create.
      const payload: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        formula: form.formula || undefined,
      };
      if (form.type === 'tax') payload.taxRuleCode = form.taxRuleCode || undefined;

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
    onError: () => toast.error('Failed to save pay element'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(ENDPOINTS.PAY_ELEMENTS.DELETE(id), { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-elements'] });
      toast.success('Pay element deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete pay element'),
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
                    {el.isStatutory && (
                      <span className="inline-flex items-center gap-1 text-xs text-cash-green/60">
                        <Lock size={11} />
                        Statutory
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <Badge variant={typeVariant[el.type]} label={typeLabel[el.type]} />
                </td>
                <td className="px-5 py-3 font-mono text-xs text-cash-green/70">{el.formula ?? '—'}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1 justify-end">
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
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
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
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
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
            onChange={(v) => setForm((f) => ({ ...f, type: v }))}
          />
          {form.type === 'tax' ? (
            <Input
              label="Tax Rule Code"
              value={form.taxRuleCode}
              onChange={(e) => setForm((f) => ({ ...f, taxRuleCode: e.target.value.toUpperCase() }))}
              placeholder="e.g. NIGERIA_PIT"
              hint="References a tax rule's code instead of evaluating a formula."
            />
          ) : (
            <Input
              label="Formula (optional)"
              value={form.formula}
              onChange={(e) => setForm((f) => ({ ...f, formula: e.target.value }))}
              placeholder="e.g. GROSS * 0.15"
            />
          )}
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
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete Pay Element"
        message={`Delete "${deleteTarget?.name}"? This may affect payroll calculations.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
