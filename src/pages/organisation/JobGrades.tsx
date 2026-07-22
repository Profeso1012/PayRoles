import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import MoneyDisplay from '@/components/ui/MoneyDisplay';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface JobGrade {
  id: string;
  tenantId: string;
  name: string;
  minSalary: number;
  maxSalary: number;
  currency: string;
}

const currencyOptions = [
  { value: 'NGN', label: 'NGN — Nigerian Naira' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'USD', label: 'USD — US Dollar' },
];

const blankForm = { name: '', currency: 'NGN', minSalary: '', maxSalary: '' };

export default function JobGrades() {
  const qc = useQueryClient();
  const toast = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [deleteTarget, setDeleteTarget] = useState<JobGrade | null>(null);

  const {
    data: jobGrades,
    isLoading,
    isError,
    refetch,
  } = useQuery<JobGrade[]>({
    queryKey: ['job-grades'],
    queryFn: () => apiClient('/organisation/job-grades'),
  });

  const addMutation = useMutation({
    mutationFn: (body: { name: string; currency: string; minSalary: number; maxSalary: number }) =>
      apiClient('/organisation/job-grades', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-grades'] });
      toast.success('Job grade added');
      setForm(blankForm);
      setAddOpen(false);
    },
    onError: () => toast.error('Failed to add job grade'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/organisation/job-grades/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-grades'] });
      toast.success('Job grade deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete job grade'),
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
            Job Grades
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#1F6F4E' }}>
            Define salary bands and grade levels for your workforce.
          </p>
        </div>
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          <Plus size={16} />
          Add Grade
        </Button>
      </div>

      {(!jobGrades || jobGrades.length === 0) ? (
        <EmptyState
          title="No job grades yet."
          description="Add your first job grade to define salary bands."
          action={{ label: 'Add Grade', onClick: () => setAddOpen(true) }}
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
                  {['Grade Name', 'Min Salary', 'Max Salary', 'Currency', 'Actions'].map((h) => (
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
                {jobGrades.map((jg, idx) => (
                  <tr
                    key={jg.id}
                    style={{
                      borderBottom:
                        idx < jobGrades.length - 1 ? '1px solid #CDEFD7' : 'none',
                    }}
                  >
                    <td style={{ padding: '0.875rem 1rem', color: '#0F2E23', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {jg.name}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                      <MoneyDisplay amount={jg.minSalary} currency={jg.currency} size="sm" />
                    </td>
                    <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                      <MoneyDisplay amount={jg.maxSalary} currency={jg.currency} size="sm" />
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#1F6F4E', whiteSpace: 'nowrap' }}>
                      {jg.currency}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(jg)}
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
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); setForm(blankForm); }}
        title="Add Job Grade"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Grade Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Senior Associate"
          />
          <Select
            label="Currency"
            value={form.currency}
            options={currencyOptions}
            onChange={(v) => setForm((f) => ({ ...f, currency: v }))}
            placeholder="Select a currency"
          />
          <Input
            label="Min Salary (major units)"
            type="number"
            value={form.minSalary}
            onChange={(e) => setForm((f) => ({ ...f, minSalary: e.target.value }))}
            placeholder="e.g. 150000"
            hint="Enter amount in full units (e.g. 150000 for NGN 150,000)"
          />
          <Input
            label="Max Salary (major units)"
            type="number"
            value={form.maxSalary}
            onChange={(e) => setForm((f) => ({ ...f, maxSalary: e.target.value }))}
            placeholder="e.g. 300000"
            hint="Enter amount in full units (e.g. 300000 for NGN 300,000)"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="ghost" onClick={() => { setAddOpen(false); setForm(blankForm); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={addMutation.isPending}
              disabled={!form.name || !form.minSalary || !form.maxSalary}
              onClick={() =>
                addMutation.mutate({
                  name: form.name,
                  currency: form.currency,
                  minSalary: Math.round(parseFloat(form.minSalary) * 100),
                  maxSalary: Math.round(parseFloat(form.maxSalary) * 100),
                })
              }
            >
              Add Grade
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete Job Grade"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
