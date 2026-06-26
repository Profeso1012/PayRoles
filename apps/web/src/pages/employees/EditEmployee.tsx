import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Drawer from '@/components/ui/Drawer';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import type { Employee } from '@contracts/types/employee';

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'exited', label: 'Exited' },
];

export default function EditEmployee() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: employee, isLoading, isError, refetch } = useQuery<Employee>({
    queryKey: ['employee', id],
    queryFn: () => apiClient<Employee>(`/employees/${id}`),
    enabled: !!id,
  });

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    nationalId: '',
    status: '',
  });

  useEffect(() => {
    if (employee) {
      setForm({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        dateOfBirth: employee.dateOfBirth,
        gender: employee.gender,
        nationalId: employee.nationalId,
        status: employee.status,
      });
    }
  }, [employee]);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiClient<Employee>(`/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      qc.invalidateQueries({ queryKey: ['employees-list'] });
      toast.success('Employee updated');
      navigate(`/employees/${id}`);
    },
    onError: () => toast.error('Failed to update employee'),
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
    <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
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
          <Select
            label="Gender"
            value={form.gender}
            options={genderOptions}
            onChange={(v) => setForm((f) => ({ ...f, gender: v }))}
          />
          <Input
            label="National ID (NIN)"
            value={form.nationalId}
            onChange={(e) => setForm((f) => ({ ...f, nationalId: e.target.value }))}
          />
          <Select
            label="Status"
            value={form.status}
            options={statusOptions}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          />
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
