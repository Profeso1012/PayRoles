import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { mapWorkerFields } from '@/lib/api/transforms';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import type { Employee } from '@contracts/types/employee';
import type { BackendWorker } from '@/lib/api/types';

export default function EditEmployee() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: employee, isLoading, isError, refetch } = useQuery<Employee>({
    queryKey: ['worker', id],
    queryFn: async () => {
      const worker = await apiClient<BackendWorker>(ENDPOINTS.WORKERS.DETAIL(id!));
      const mapped = mapWorkerFields(worker, 'toFrontend');
      return { ...mapped, status: mapped.status || 'active', annualRentMinor: worker.annualRentMinor } as Employee & { annualRentMinor: string | null };
    },
    enabled: !!id,
  });

  // Real UpdateWorkerDto has no `gender` or `status` field - status changes go
  // through PATCH /workers/:id/terminate, not this generic update.
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nationalId: '',
    annualRent: '',
  });

  useEffect(() => {
    if (employee) {
      const withRent = employee as Employee & { annualRentMinor: string | null };
      setForm({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        dateOfBirth: employee.dateOfBirth,
        nationalId: employee.nationalId === '****' ? '' : employee.nationalId,
        annualRent: withRent.annualRentMinor ? String(parseInt(withRent.annualRentMinor, 10) / 100) : '',
      });
    }
  }, [employee]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, string | number | undefined> = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        annualRentMinor: form.annualRent ? Math.round(parseFloat(form.annualRent) * 100) : undefined,
      };
      // Only send nationalId if the user actually typed a new value (it
      // displays masked as '****' for existing employees - see EmployeeDetail).
      if (form.nationalId) payload.nationalId = form.nationalId;
      return apiClient<BackendWorker>(ENDPOINTS.WORKERS.UPDATE(id!), {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker', id] });
      qc.invalidateQueries({ queryKey: ['workers-list'] });
      toast.success('Employee updated');
      navigate(`/employees/${id}`);
    },
    onError: (err) => toast.error('Failed to update employee', err instanceof Error ? err.message : undefined),
  });

  const fieldClass =
    'w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !employee) {
    return <ErrorState onRetry={refetch} />;
  }

  const fullName = `${employee.firstName} ${employee.lastName}`;

  return (
    <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title={`Edit — ${fullName}`}
        breadcrumbs={[
          { label: 'Employees', path: '/employees' },
          { label: fullName, path: `/employees/${id}` },
          { label: 'Edit' },
        ]}
      />

      <div className="bg-white rounded-xl border border-mint-light p-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          />
          <Input
            label="Last Name"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          />
          <Input
            label="Email Address"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Phone Number"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <div>
            <p className="text-sm text-cash-green font-medium mb-1">Date of Birth</p>
            <input
              type="date"
              className={fieldClass}
              value={form.dateOfBirth}
              onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            />
          </div>
          <Input
            label="National ID (NIN)"
            placeholder={employee.nationalId === '****' ? 'Protected - enter to replace' : ''}
            value={form.nationalId}
            onChange={(e) => setForm((f) => ({ ...f, nationalId: e.target.value }))}
          />
          <div className="col-span-2">
            <p className="text-sm text-cash-green font-medium mb-1">Annual Rent Paid (₦, optional)</p>
            <input
              type="number"
              className={fieldClass}
              min={0}
              value={form.annualRent}
              onChange={(e) => setForm((f) => ({ ...f, annualRent: e.target.value }))}
              placeholder="e.g. 1000000"
            />
            <p className="text-xs text-cash-green/60 mt-1">
              Used only to calculate this employee's Nigerian PAYE rent relief — not a payroll deduction.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-mint-light">
          <Button variant="ghost" onClick={() => navigate(`/employees/${id}`)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={updateMutation.isPending}
            disabled={!form.firstName || !form.lastName}
            onClick={() => updateMutation.mutate()}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
