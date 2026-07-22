import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface LegalEntity {
  id: string;
  tenantId: string;
  name: string;
  country: string;
  taxIdEncrypted: string | null; // Backend never returns the decrypted value
  address: string;
  createdAt: string;
}

const countryOptions = [
  { value: 'NG', label: 'Nigeria' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'US', label: 'United States' },
];

const blankForm = { name: '', country: '', taxId: '', address: '' };

export default function LegalEntities() {
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  // Real backend permission LEGAL_ENTITY_WRITE (create/update/deactivate) is
  // only granted to super_admin/tenant_admin - hr_manager/hr_officer can
  // reach this page (LEGAL_ENTITY_READ) but would 403 on any write.
  const canWrite = role === 'tenant_admin' || role === 'super_admin';

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [editTarget, setEditTarget] = useState<LegalEntity | null>(null);
  const [editForm, setEditForm] = useState(blankForm);
  const [deleteTarget, setDeleteTarget] = useState<LegalEntity | null>(null);

  const {
    data: legalEntities,
    isLoading,
    isError,
    refetch,
  } = useQuery<LegalEntity[]>({
    queryKey: ['legal-entities'],
    queryFn: async () => {
      const response = await apiClient<any>(ENDPOINTS.LEGAL_ENTITIES.LIST);
      return Array.isArray(response) ? response : response.data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: (body: typeof blankForm) =>
      apiClient(ENDPOINTS.LEGAL_ENTITIES.CREATE, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['legal-entities'] });
      qc.invalidateQueries({ queryKey: ['org-overview'] });
      toast.success('Legal entity added');
      setForm(blankForm);
      setAddOpen(false);
    },
    onError: () => toast.error('Failed to add legal entity'),
  });

  const editMutation = useMutation({
    mutationFn: () => {
      // taxId comes back from the backend only as "Protected" (write-only,
      // encrypted at rest) - leaving the field blank must NOT overwrite an
      // existing one, so it's only included in the body when actually typed.
      const body: Record<string, string> = {
        name: editForm.name,
        country: editForm.country,
        address: editForm.address,
      };
      if (editForm.taxId.trim()) body.taxId = editForm.taxId.trim();
      return apiClient(ENDPOINTS.LEGAL_ENTITIES.UPDATE(editTarget!.id), {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['legal-entities'] });
      qc.invalidateQueries({ queryKey: ['org-overview'] });
      toast.success('Legal entity updated');
      setEditTarget(null);
      setEditForm(blankForm);
    },
    onError: () => toast.error('Failed to update legal entity'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(ENDPOINTS.LEGAL_ENTITIES.DEACTIVATE(id), { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['legal-entities'] });
      qc.invalidateQueries({ queryKey: ['org-overview'] });
      toast.success('Legal entity deactivated');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to deactivate legal entity'),
  });

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

  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
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
            Legal Entities
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#1F6F4E' }}>
            Manage the legal entities within your organisation.
          </p>
        </div>
        {canWrite && (
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus size={16} />
            Add Legal Entity
          </Button>
        )}
      </div>

      {!legalEntities || legalEntities.length === 0 ? (
        <EmptyState
          title="No legal entities yet."
          description={
            canWrite
              ? 'Add your first legal entity to get started.'
              : 'Your tenant admin has not added a legal entity yet.'
          }
          action={canWrite ? { label: 'Add Legal Entity', onClick: () => setAddOpen(true) } : undefined}
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
                  {['Name', 'Country', 'Tax ID', 'Address', 'Created', 'Actions'].map((h) => (
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
                {legalEntities.map((le, idx) => (
                  <tr
                    key={le.id}
                    style={{
                      borderBottom:
                        idx < legalEntities.length - 1 ? '1px solid #CDEFD7' : 'none',
                    }}
                  >
                    <td
                      style={{
                        padding: '0.875rem 1rem',
                        color: '#0F2E23',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {le.name}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge variant="info" label={le.country} />
                    </td>
                    <td
                      style={{
                        padding: '0.875rem 1rem',
                        color: '#1F6F4E',
                        fontFamily: 'monospace',
                        fontSize: '0.8125rem',
                      }}
                    >
                      {le.taxIdEncrypted ? 'Protected' : '—'}
                    </td>
                    <td
                      style={{
                        padding: '0.875rem 1rem',
                        color: '#1F6F4E',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {le.address}
                    </td>
                    <td
                      style={{
                        padding: '0.875rem 1rem',
                        color: '#1F6F4E',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDate(le.createdAt)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {canWrite && (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditTarget(le);
                              setEditForm({ name: le.name, country: le.country, taxId: '', address: le.address });
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
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
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(le)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0.375rem',
                              borderRadius: '0.375rem',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: '#dc2626',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = '#fee2e2')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = 'transparent')
                            }
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); setForm(blankForm); }} title="Add Legal Entity" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Acme Corp Nigeria"
          />
          <Select
            label="Country"
            value={form.country}
            options={countryOptions}
            onChange={(v) => setForm((f) => ({ ...f, country: v }))}
            placeholder="Select a country"
          />
          <Input
            label="Tax ID"
            value={form.taxId}
            onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
            placeholder="e.g. RC-0001234"
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="e.g. 3 Osborne Road, Ikoyi, Lagos"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="ghost" onClick={() => { setAddOpen(false); setForm(blankForm); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={addMutation.isPending}
              disabled={!form.name || !form.country}
              onClick={() => addMutation.mutate(form)}
            >
              Add Legal Entity
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!editTarget}
        onClose={() => { setEditTarget(null); setEditForm(blankForm); }}
        title={`Edit ${editTarget?.name ?? 'Legal Entity'}`}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Name"
            value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Select
            label="Country"
            value={editForm.country}
            options={countryOptions}
            onChange={(v) => setEditForm((f) => ({ ...f, country: v }))}
            placeholder="Select a country"
          />
          <div>
            <Input
              label="Tax ID"
              value={editForm.taxId}
              onChange={(e) => setEditForm((f) => ({ ...f, taxId: e.target.value }))}
              placeholder="Leave blank to keep the current tax ID unchanged"
            />
            <p style={{ fontSize: '0.75rem', color: '#1F6F4E', opacity: 0.7, marginTop: '0.25rem' }}>
              The current tax ID is encrypted and never shown back — only fill this in if you want to replace it.
            </p>
          </div>
          <Input
            label="Address"
            value={editForm.address}
            onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="ghost" onClick={() => { setEditTarget(null); setEditForm(blankForm); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={editMutation.isPending}
              disabled={!editForm.name || !editForm.country}
              onClick={() => editMutation.mutate()}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate Legal Entity"
        message={`Are you sure you want to deactivate "${deleteTarget?.name}"? Workers assigned to this entity will need to be reassigned.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
