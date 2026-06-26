import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, MapPin } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
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
  name: string;
  country: string;
}

interface Location {
  id: string;
  legalEntityId: string;
  name: string;
  address: string;
  country: string;
}

const countryOptions = [
  { value: 'NG', label: 'Nigeria' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'US', label: 'United States' },
];

const blankForm = { name: '', address: '', country: '', legalEntityId: '' };

export default function Locations() {
  const qc = useQueryClient();
  const toast = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);

  const {
    data: locations,
    isLoading: locLoading,
    isError: locError,
    refetch: refetchLoc,
  } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => apiClient('/organisation/locations'),
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

  const addMutation = useMutation({
    mutationFn: (body: typeof blankForm) =>
      apiClient('/organisation/locations', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      qc.invalidateQueries({ queryKey: ['org-overview'] });
      toast.success('Location added');
      setForm(blankForm);
      setAddOpen(false);
    },
    onError: () => toast.error('Failed to add location'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/organisation/locations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      qc.invalidateQueries({ queryKey: ['org-overview'] });
      toast.success('Location deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete location'),
  });

  if (locLoading || leLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (locError || leError) {
    return (
      <ErrorState
        onRetry={() => {
          refetchLoc();
          refetchLe();
        }}
      />
    );
  }

  const leMap = new Map((legalEntities ?? []).map((le) => [le.id, le]));
  const leOptions = (legalEntities ?? []).map((le) => ({ value: le.id, label: le.name }));

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
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
            Locations
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#1F6F4E' }}>
            Manage office locations across your legal entities.
          </p>
        </div>
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          <Plus size={16} />
          Add Location
        </Button>
      </div>

      {(!locations || locations.length === 0) ? (
        <EmptyState
          icon={MapPin}
          title="No locations yet."
          description="Add your first location to get started."
          action={{ label: 'Add Location', onClick: () => setAddOpen(true) }}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {locations.map((loc) => {
            const le = leMap.get(loc.legalEntityId);
            return (
              <div
                key={loc.id}
                style={{
                  background: '#fff',
                  border: '1px solid #CDEFD7',
                  borderRadius: '0.75rem',
                  padding: '1.125rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  position: 'relative',
                }}
              >
                <button
                  type="button"
                  onClick={() => setDeleteTarget(loc)}
                  style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '2rem' }}>
                  <MapPin size={15} style={{ color: '#4FAD72', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#0F2E23' }}>
                    {loc.name}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: '#1F6F4E',
                    lineHeight: '1.4',
                  }}
                >
                  {loc.address}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <Badge variant="info" label={loc.country} />
                  {le && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#1F6F4E',
                        fontStyle: 'italic',
                        textAlign: 'right',
                        maxWidth: '60%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {le.name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); setForm(blankForm); }}
        title="Add Location"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Lagos Head Office"
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="e.g. 3 Osborne Road, Ikoyi, Lagos"
          />
          <Select
            label="Country"
            value={form.country}
            options={countryOptions}
            onChange={(v) => setForm((f) => ({ ...f, country: v }))}
            placeholder="Select a country"
          />
          <Select
            label="Legal Entity"
            value={form.legalEntityId}
            options={leOptions}
            onChange={(v) => setForm((f) => ({ ...f, legalEntityId: v }))}
            placeholder="Select a legal entity"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="ghost" onClick={() => { setAddOpen(false); setForm(blankForm); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={addMutation.isPending}
              disabled={!form.name || !form.country || !form.legalEntityId}
              onClick={() => addMutation.mutate(form)}
            >
              Add Location
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete Location"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
