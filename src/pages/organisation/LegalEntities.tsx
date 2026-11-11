import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { apiClient, fetchAllPages } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
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
import { errorMessage, fieldErrors } from '@/lib/errors';

interface LegalEntity {
  id: string;
  tenantId: string;
  name: string;
  type?: string | null;
  registrationNumber?: string | null;
  currency?: string | null;
  country: string | null;
  taxIdEncrypted?: string | null; // Backend never returns the decrypted value
  address: string | null;
  phone?: string | null;
  email?: string | null;
  // 'active' | 'inactive' - set by /deactivate, PATCH-able nowhere else.
  // CreateLegalEntityDto/UpdateLegalEntityDto have no isActive/status field
  // at all, so there is no way to reactivate one once deactivated - not a
  // frontend gap, a real backend limitation.
  status: string;
  createdAt: string;
}

const countryOptions = [
  { value: 'NG', label: 'Nigeria' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'US', label: 'United States' },
];

// Backend LegalEntityType enum (legal-entity.entity.ts).
const typeOptions = [
  { value: 'company', label: 'Company' },
  { value: 'branch', label: 'Branch' },
  { value: 'subsidiary', label: 'Subsidiary' },
  { value: 'department', label: 'Department' },
];

const blankForm = {
  name: '',
  type: 'company',
  registrationNumber: '',
  country: '',
  currency: '',
  taxId: '',
  address: '',
  phone: '',
  email: '',
};
type EntityForm = typeof blankForm;

const OPTIONAL_FIELDS = ['registrationNumber', 'country', 'currency', 'address', 'phone', 'email'] as const;

/**
 * CreateLegalEntityDto/UpdateLegalEntityDto body. Empty optional fields are
 * omitted on create; on edit they're sent as null so clearing a field really
 * clears it (the service Object.assign()s the DTO). registrationNumber must
 * never be '' - it's unique per tenant. taxId is write-only: blank on edit
 * keeps the stored (encrypted) value.
 */
function buildBody(form: EntityForm, isEdit: boolean): Record<string, string | null> {
  const body: Record<string, string | null> = { name: form.name.trim(), type: form.type };
  for (const key of OPTIONAL_FIELDS) {
    const v = key === 'currency' ? form[key].trim().toUpperCase() : form[key].trim();
    if (v) body[key] = v;
    else if (isEdit) body[key] = null;
  }
  if (form.taxId.trim()) body.taxId = form.taxId.trim();
  return body;
}

function EntityFields({
  form,
  setForm,
  errors,
  isEdit,
}: {
  form: EntityForm;
  setForm: (updater: (f: EntityForm) => EntityForm) => void;
  errors: Record<string, string>;
  isEdit: boolean;
}) {
  const set = (key: keyof EntityForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };
  return (
    <>
      <Input label="Name" value={form.name} maxLength={255} onChange={set('name')} placeholder="e.g. Acme Corp Nigeria" error={errors.name} />
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Select label="Type" value={form.type} options={typeOptions} onChange={(v) => setForm((f) => ({ ...f, type: v }))} error={errors.type} />
        <Input
          label="Registration Number"
          value={form.registrationNumber}
          maxLength={100}
          onChange={set('registrationNumber')}
          placeholder="e.g. RC-123456"
          hint="Used to match rows in legal-entity CSV imports."
          error={errors.registrationNumber}
        />
        <Select
          label="Country"
          value={form.country}
          options={countryOptions}
          onChange={(v) => setForm((f) => ({ ...f, country: v }))}
          placeholder="Select a country"
          error={errors.country}
        />
        <Input
          label="Currency"
          value={form.currency}
          maxLength={3}
          onChange={(e) => {
            const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
            setForm((f) => ({ ...f, currency: value }));
          }}
          placeholder="e.g. NGN"
          error={errors.currency}
        />
        <Input label="Phone" value={form.phone} maxLength={50} onChange={set('phone')} placeholder="e.g. +234 801 234 5678" error={errors.phone} />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="e.g. payroll@acme.ng" error={errors.email} />
      </div>
      <Input
        label="Tax ID"
        value={form.taxId}
        maxLength={50}
        onChange={set('taxId')}
        placeholder={isEdit ? 'Leave blank to keep the current tax ID unchanged' : 'e.g. 12345678-0001'}
        hint={isEdit ? 'The current tax ID is encrypted and never shown back - only fill this in if you want to replace it.' : undefined}
        error={errors.taxId}
      />
      <Input label="Address" value={form.address} onChange={set('address')} placeholder="e.g. 3 Osborne Road, Ikoyi, Lagos" error={errors.address} />
    </>
  );
}

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
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  function closeAdd() {
    setAddOpen(false);
    setForm(blankForm);
    setAddErrors({});
  }
  function closeEdit() {
    setEditTarget(null);
    setEditForm(blankForm);
    setEditErrors({});
  }

  const {
    data: legalEntities,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<LegalEntity[]>({
    queryKey: ['legal-entities'],
    // GET /legal-entities is paginated (limit defaults to 20, capped at 100) -
    // a bare apiClient() call silently returns only page 1, hiding entity #21+
    // with no pagination UI to notice. Page through the whole tenant roster.
    queryFn: () =>
      fetchAllPages<LegalEntity>((page) => `${ENDPOINTS.LEGAL_ENTITIES.LIST}?${buildPaginationParams({ page, limit: 100 })}`),
  });

  const addMutation = useMutation({
    mutationFn: (f: EntityForm) => {
      setAddErrors({});
      return apiClient(ENDPOINTS.LEGAL_ENTITIES.CREATE, {
        method: 'POST',
        body: JSON.stringify(buildBody(f, false)),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['legal-entities'] });
      qc.invalidateQueries({ queryKey: ['org-overview'] });
      toast.success('Legal entity added');
      closeAdd();
    },
    onError: (err) => {
      setAddErrors(fieldErrors(err));
      toast.error('Failed to add legal entity', errorMessage(err));
    },
  });

  const editMutation = useMutation({
    mutationFn: () => {
      setEditErrors({});
      // taxId comes back from the backend only as "Protected" (write-only,
      // encrypted at rest) - leaving the field blank must NOT overwrite an
      // existing one, so buildBody only includes it when actually typed.
      return apiClient(ENDPOINTS.LEGAL_ENTITIES.UPDATE(editTarget!.id), {
        method: 'PATCH',
        body: JSON.stringify(buildBody(editForm, true)),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['legal-entities'] });
      qc.invalidateQueries({ queryKey: ['org-overview'] });
      toast.success('Legal entity updated');
      closeEdit();
    },
    onError: (err) => {
      setEditErrors(fieldErrors(err));
      toast.error('Failed to update legal entity', errorMessage(err));
    },
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
    onError: (err) => toast.error('Failed to deactivate legal entity', errorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState error={error} message={errorMessage(error, '') || undefined} onRetry={refetch} />;
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
                  {['Name', 'Reg. No.', 'Country', 'Tax ID', 'Address', 'Created', 'Actions'].map((h) => (
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
                      {le.status === 'inactive' && (
                        <span style={{ marginLeft: '0.5rem' }}>
                          <Badge variant="error" label="Inactive" />
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#1F6F4E', whiteSpace: 'nowrap' }}>
                      {le.registrationNumber || '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {le.country ? <Badge variant="info" label={le.country} /> : '—'}
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
                      {le.address || '—'}
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
                              setEditErrors({});
                              setEditForm({
                                name: le.name,
                                type: le.type || 'company',
                                registrationNumber: le.registrationNumber ?? '',
                                country: le.country ?? '',
                                currency: le.currency ?? '',
                                taxId: '',
                                address: le.address ?? '',
                                phone: le.phone ?? '',
                                email: le.email ?? '',
                              });
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
                          {le.status !== 'inactive' && (
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
                              title="Deactivate — permanent, the backend has no way to undo this"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
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

      <Modal isOpen={addOpen} onClose={closeAdd} title="Add Legal Entity" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <EntityFields form={form} setForm={setForm} errors={addErrors} isEdit={false} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="ghost" onClick={closeAdd}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={addMutation.isPending}
              disabled={!form.name.trim()}
              onClick={() => addMutation.mutate(form)}
            >
              Add Legal Entity
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!editTarget}
        onClose={closeEdit}
        title={`Edit ${editTarget?.name ?? 'Legal Entity'}`}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <EntityFields form={editForm} setForm={setEditForm} errors={editErrors} isEdit />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="ghost" onClick={closeEdit}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={editMutation.isPending}
              disabled={!editForm.name.trim()}
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
        message={`Are you sure you want to deactivate "${deleteTarget?.name}"? Workers assigned to this entity will need to be reassigned. This cannot be undone — there is no reactivate option.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
