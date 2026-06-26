import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import MultiSelect from '@/components/ui/MultiSelect';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface LegalEntity {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
  legalEntityId: string;
}

interface PayGroup {
  id: string;
  tenantId: string;
  name: string;
  payFrequency: string;
  payDay: number;
  legalEntityId: string;
  locationIds: string[];
}

const frequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi-weekly', label: 'Bi-Weekly' },
  { value: 'weekly', label: 'Weekly' },
];

const blankForm = {
  name: '',
  payFrequency: '',
  payDay: '',
  legalEntityId: '',
  locationIds: [] as string[],
};

type FormState = typeof blankForm;

export default function PayGroups() {
  const qc = useQueryClient();
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PayGroup | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [deleteTarget, setDeleteTarget] = useState<PayGroup | null>(null);

  const {
    data: payGroups,
    isLoading: pgLoading,
    isError: pgError,
    refetch: refetchPg,
  } = useQuery<PayGroup[]>({
    queryKey: ['pay-groups'],
    queryFn: () => apiClient('/organisation/pay-groups'),
  });

  const {
    data: legalEntities,
    isLoading: leLoading,
    isError: leError,
    refetch: refetchLe,
  } = useQuery<LegalEntity[]>({
    queryKey: ['legal-entities'],
    queryFn: () => apiClient('/organisation/legal-entities'),
  });

  const {
    data: locations,
    isLoading: locLoading,
    isError: locError,
    refetch: refetchLoc,
  } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => apiClient('/organisation/locations'),
  });

  const addMutation = useMutation({
    mutationFn: (body: Omit<FormState, 'payDay'> & { payDay: number }) =>
      apiClient('/organisation/pay-groups', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-groups'] });
      qc.invalidateQueries({ queryKey: ['org-overview'] });
      toast.success('Pay group added');
      closeModal();
    },
    onError: () => toast.error('Failed to add pay group'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Omit<FormState, 'payDay'> & { payDay: number } }) =>
      apiClient(`/organisation/pay-groups/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-groups'] });
      toast.success('Pay group updated');
      closeModal();
    },
    onError: () => toast.error('Failed to update pay group'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/organisation/pay-groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-groups'] });
      qc.invalidateQueries({ queryKey: ['org-overview'] });
      toast.success('Pay group deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete pay group'),
  });

  function openAdd() {
    setEditTarget(null);
    setForm(blankForm);
    setModalOpen(true);
  }

  function openEdit(pg: PayGroup) {
    setEditTarget(pg);
    setForm({
      name: pg.name,
      payFrequency: pg.payFrequency,
      payDay: String(pg.payDay),
      legalEntityId: pg.legalEntityId,
      locationIds: pg.locationIds,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
    setForm(blankForm);
  }

  function handleSubmit() {
    const body = {
      name: form.name,
      payFrequency: form.payFrequency,
      payDay: parseInt(form.payDay, 10) || 1,
      legalEntityId: form.legalEntityId,
      locationIds: form.locationIds,
    };
    if (editTarget) {
      editMutation.mutate({ id: editTarget.id, body });
    } else {
      addMutation.mutate(body);
    }
  }

  if (pgLoading || leLoading || locLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (pgError || leError || locError) {
    return (
      <ErrorState
        onRetry={() => {
          refetchPg();
          refetchLe();
          refetchLoc();
        }}
      />
    );
  }

  const leMap = new Map((legalEntities ?? []).map((le) => [le.id, le]));
  const leOptions = (legalEntities ?? []).map((le) => ({ value: le.id, label: le.name }));
  const locOptions = (locations ?? []).map((l) => ({ value: l.id, label: l.name }));

  const isSaving = addMutation.isPending || editMutation.isPending;

  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
              fontWeight: 700,
              color: '#0F2E23',
              marginBottom: '0.25rem',
            }}
          >
            Pay Groups
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#1F6F4E' }}>
            Configure pay groups to control payroll frequency and assignment.
          </p>
        </div>
        <Button variant="primary" onClick={openAdd}>
          <Plus size={16} />
          Add Pay Group
        </Button>
      </div>

      {(!payGroups || payGroups.length === 0) ? (
        <EmptyState
          title="No pay groups yet."
          description="Add your first pay group to get started."
          action={{ label: 'Add Pay Group', onClick: openAdd }}
        />
      ) : (
        <div
          style={{
            background: '#fff',
            border: '1px solid #CDEFD7',
            borderRadius: '0.75rem',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#F7FAF8', borderBottom: '1px solid #CDEFD7' }}>
                  {['Name', 'Frequency', 'Pay Day', 'Legal Entity', 'Locations', 'Actions'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '0.75rem 1rem',
                        fontWeight: 600,
                        color: '#1F6F4E',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payGroups.map((pg, idx) => {
                  const le = leMap.get(pg.legalEntityId);
                  return (
                    <tr
                      key={pg.id}
                      style={{
                        borderBottom:
                          idx < payGroups.length - 1 ? '1px solid #CDEFD7' : 'none',
                      }}
                    >
                      <td style={{ padding: '0.875rem 1rem', color: '#0F2E23', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {pg.name}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <Badge variant="info" label={pg.payFrequency} />
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#1F6F4E', whiteSpace: 'nowrap' }}>
                        Day {pg.payDay}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#1F6F4E', whiteSpace: 'nowrap' }}>
                        {le?.name ?? pg.legalEntityId}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <Badge variant="active" label={`${pg.locationIds.length} location${pg.locationIds.length !== 1 ? 's' : ''}`} />
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            type="button"
                            onClick={() => openEdit(pg)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.375rem',
                              borderRadius: '0.375rem',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: '#1F6F4E',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#CDEFD7')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(pg)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.375rem',
                              borderRadius: '0.375rem',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: '#dc2626',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Edit Pay Group' : 'Add Pay Group'}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Lagos Monthly Staff"
          />
          <Select
            label="Frequency"
            value={form.payFrequency}
            options={frequencyOptions}
            onChange={(v) => setForm((f) => ({ ...f, payFrequency: v }))}
            placeholder="Select frequency"
          />
          <Input
            label="Pay Day (1–31)"
            type="number"
            value={form.payDay}
            onChange={(e) => setForm((f) => ({ ...f, payDay: e.target.value }))}
            placeholder="e.g. 28"
          />
          <Select
            label="Legal Entity"
            value={form.legalEntityId}
            options={leOptions}
            onChange={(v) => setForm((f) => ({ ...f, legalEntityId: v }))}
            placeholder="Select a legal entity"
          />
          <MultiSelect
            label="Locations"
            values={form.locationIds}
            options={locOptions}
            onChange={(vals) => setForm((f) => ({ ...f, locationIds: vals }))}
            placeholder="Select locations"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isSaving}
              disabled={!form.name || !form.payFrequency || !form.legalEntityId}
              onClick={handleSubmit}
            >
              {editTarget ? 'Save Changes' : 'Add Pay Group'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete Pay Group"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
