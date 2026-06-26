import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
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

interface Department {
  id: string;
  legalEntityId: string;
  name: string;
  headEmployeeId: string | null;
  parentDepartmentId: string | null;
}

const blankForm = { name: '', legalEntityId: '', parentDepartmentId: '' };

export default function Departments() {
  const qc = useQueryClient();
  const toast = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const {
    data: departments,
    isLoading: depsLoading,
    isError: depsError,
    refetch: refetchDeps,
  } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiClient('/organisation/departments'),
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
    mutationFn: (body: { name: string; legalEntityId: string; parentDepartmentId: string | null }) =>
      apiClient('/organisation/departments', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department added');
      setForm(blankForm);
      setAddOpen(false);
    },
    onError: () => toast.error('Failed to add department'),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiClient(`/organisation/departments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department renamed');
      setEditingId(null);
    },
    onError: () => toast.error('Failed to rename department'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/organisation/departments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete department'),
  });

  if (depsLoading || leLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (depsError || leError) {
    return (
      <ErrorState
        onRetry={() => {
          refetchDeps();
          refetchLe();
        }}
      />
    );
  }

  const leOptions = (legalEntities ?? []).map((le) => ({ value: le.id, label: le.name }));

  const depsForSelectedLe = (departments ?? []).filter(
    (d) => d.legalEntityId === form.legalEntityId,
  );
  const parentOptions = [
    { value: '', label: 'None (top-level)' },
    ...depsForSelectedLe.map((d) => ({ value: d.id, label: d.name })),
  ];

  function startEdit(dept: Department) {
    setEditingId(dept.id);
    setEditName(dept.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
  }

  function saveEdit(id: string) {
    if (editName.trim()) {
      renameMutation.mutate({ id, name: editName.trim() });
    }
  }

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
            Departments
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#1F6F4E' }}>
            Manage departments across your legal entities.
          </p>
        </div>
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          <Plus size={16} />
          Add Department
        </Button>
      </div>

      {(!departments || departments.length === 0) ? (
        <EmptyState
          title="No departments yet."
          description="Add your first department to get started."
          action={{ label: 'Add Department', onClick: () => setAddOpen(true) }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {(legalEntities ?? []).map((le) => {
            const leDepts = (departments ?? []).filter((d) => d.legalEntityId === le.id);
            if (leDepts.length === 0) return null;

            const topLevel = leDepts.filter((d) => d.parentDepartmentId === null);
            const children = (parentId: string) =>
              leDepts.filter((d) => d.parentDepartmentId === parentId);

            return (
              <div
                key={le.id}
                style={{
                  background: '#fff',
                  border: '1px solid #CDEFD7',
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '0.875rem 1.25rem',
                    background: '#F7FAF8',
                    borderBottom: '1px solid #CDEFD7',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#0F2E23', fontSize: '0.9375rem' }}>
                    {le.name}
                  </span>
                  <Badge variant="info" label={le.country} />
                </div>
                <div>
                  {topLevel.map((dept) => (
                    <div key={dept.id}>
                      <DeptRow
                        dept={dept}
                        editingId={editingId}
                        editName={editName}
                        onEditNameChange={setEditName}
                        onStartEdit={startEdit}
                        onCancelEdit={cancelEdit}
                        onSaveEdit={saveEdit}
                        onDelete={setDeleteTarget}
                        isSaving={renameMutation.isPending}
                        indented={false}
                      />
                      {children(dept.id).map((child) => (
                        <DeptRow
                          key={child.id}
                          dept={child}
                          editingId={editingId}
                          editName={editName}
                          onEditNameChange={setEditName}
                          onStartEdit={startEdit}
                          onCancelEdit={cancelEdit}
                          onSaveEdit={saveEdit}
                          onDelete={setDeleteTarget}
                          isSaving={renameMutation.isPending}
                          indented
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); setForm(blankForm); }}
        title="Add Department"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Human Resources"
          />
          <Select
            label="Legal Entity"
            value={form.legalEntityId}
            options={leOptions}
            onChange={(v) => setForm((f) => ({ ...f, legalEntityId: v, parentDepartmentId: '' }))}
            placeholder="Select a legal entity"
          />
          {form.legalEntityId && (
            <Select
              label="Parent Department (optional)"
              value={form.parentDepartmentId}
              options={parentOptions}
              onChange={(v) => setForm((f) => ({ ...f, parentDepartmentId: v }))}
              placeholder="None (top-level)"
            />
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="ghost" onClick={() => { setAddOpen(false); setForm(blankForm); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={addMutation.isPending}
              disabled={!form.name || !form.legalEntityId}
              onClick={() =>
                addMutation.mutate({
                  name: form.name,
                  legalEntityId: form.legalEntityId,
                  parentDepartmentId: form.parentDepartmentId || null,
                })
              }
            >
              Add Department
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete Department"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

interface DeptRowProps {
  dept: Department;
  editingId: string | null;
  editName: string;
  onEditNameChange: (name: string) => void;
  onStartEdit: (dept: Department) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onDelete: (dept: Department) => void;
  isSaving: boolean;
  indented: boolean;
}

function DeptRow({
  dept,
  editingId,
  editName,
  onEditNameChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  isSaving,
  indented,
}: DeptRowProps) {
  const isEditing = editingId === dept.id;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1.25rem',
        borderBottom: '1px solid #CDEFD7',
        paddingLeft: indented ? '2.5rem' : '1.25rem',
        borderLeft: indented ? '2px solid #CDEFD7' : 'none',
        marginLeft: indented ? '1.25rem' : '0',
      }}
    >
      {isEditing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            style={{
              flex: 1,
              padding: '0.375rem 0.625rem',
              border: '1px solid #4FAD72',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              color: '#0F2E23',
              outline: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit(dept.id);
              if (e.key === 'Escape') onCancelEdit();
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={() => onSaveEdit(dept.id)}
            disabled={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.375rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: '#CDEFD7',
              cursor: 'pointer',
              color: '#1F6F4E',
            }}
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.375rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: '#f3f4f6',
              cursor: 'pointer',
              color: '#374151',
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <span style={{ flex: 1, fontSize: '0.875rem', color: '#0F2E23', fontWeight: 500 }}>
            {dept.name}
          </span>
          {dept.parentDepartmentId && (
            <Badge variant="info" label="sub-department" />
          )}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              type="button"
              onClick={() => onStartEdit(dept)}
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
              title="Rename"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(dept)}
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
        </>
      )}
    </div>
  );
}
