import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Mail, Globe, BadgeCheck, PauseCircle, UserPlus } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import type { BackendTenant } from '@/lib/api/types';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function SACompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: generateTempPassword(),
  });

  const { data: tenant, isLoading, isError, refetch } = useQuery<BackendTenant>({
    queryKey: ['platform-tenant', id],
    queryFn: () => apiClient<BackendTenant>(ENDPOINTS.PLATFORM_TENANTS.DETAIL(id!)),
    enabled: !!id,
  });

  const toggleStatus = useMutation({
    mutationFn: () => {
      const isSuspended = tenant?.status === 'suspended';
      const endpoint = isSuspended
        ? ENDPOINTS.PLATFORM_TENANTS.ACTIVATE(id!)
        : ENDPOINTS.PLATFORM_TENANTS.SUSPEND(id!);
      return apiClient(endpoint, { method: 'PATCH' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-tenant', id] });
      qc.invalidateQueries({ queryKey: ['platform-tenants'] });
      const action = tenant?.status === 'active' ? 'suspended' : 'reactivated';
      toast.success(`Company ${action}`, `${tenant?.name} has been ${action}.`);
      setShowConfirm(false);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });

  const addUserMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.PLATFORM_TENANTS.CREATE_USER(id!), {
        method: 'POST',
        body: JSON.stringify({ ...userForm, role: 'tenant_admin' }),
      }),
    onSuccess: () => {
      toast.success('User created', `Share the temporary password with ${userForm.email} directly: ${userForm.password}`);
      setAddUserOpen(false);
      setUserForm({ firstName: '', lastName: '', email: '', password: generateTempPassword() });
    },
    onError: () => toast.error('Failed to create user', 'Please try again.'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  if (isError || !tenant) return <ErrorState message="Company not found." onRetry={() => refetch()} />;

  const isSuspended = tenant.status === 'suspended';

  const fields = [
    { icon: Building2, label: 'Legal name', value: tenant.name },
    { icon: Mail, label: 'Contact Email', value: tenant.contactEmail },
    { icon: Globe, label: 'Country', value: tenant.country || '—' },
    { icon: BadgeCheck, label: 'Currency', value: tenant.currency || '—' },
    { icon: BadgeCheck, label: 'Member since', value: formatDate(tenant.createdAt) },
  ];

  return (
    <div className="p-6 max-w-[860px] mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/admin/companies')}
        className="flex items-center gap-2 text-sm text-cash-green hover:text-fresh-cash mb-6"
      >
        <ArrowLeft size={16} /> Back to companies
      </button>

      {/* Header card */}
      <div className="bg-white border border-mint-light rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[clamp(1.25rem,2.5vw,1.6rem)] font-semibold text-deep-cash">{tenant.name}</h1>
            <p className="text-sm text-cash-green/70 mt-1">{tenant.slug}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={isSuspended ? 'danger' : 'success'}
              label={tenant.status}
            />
            <Button variant="secondary" onClick={() => setAddUserOpen(true)}>
              <UserPlus size={15} className="mr-2" />
              Add User
            </Button>
            <Button
              variant={isSuspended ? 'secondary' : 'danger'}
              onClick={() => setShowConfirm(true)}
            >
              {isSuspended ? (
                <><BadgeCheck size={15} className="mr-2" />Reactivate</>
              ) : (
                <><PauseCircle size={15} className="mr-2" />Suspend</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Detail grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }} className="mb-6">
        {fields.map((f) => (
          <div key={f.label} className="bg-white border border-mint-light rounded-xl p-5 flex items-start gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-mint-light/40 flex items-center justify-center flex-shrink-0">
              <f.icon size={17} className="text-cash-green" />
            </div>
            <div>
              <p className="text-xs text-cash-green/60 mb-0.5">{f.label}</p>
              <p className="text-sm font-medium text-deep-cash">{f.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add user modal */}
      <Modal isOpen={addUserOpen} onClose={() => setAddUserOpen(false)} title="Add Tenant Admin" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">
            There is no invite email on this backend — create the user directly and share the
            temporary password with them.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input label="First name" value={userForm.firstName} onChange={(e) => setUserForm((f) => ({ ...f, firstName: e.target.value }))} />
            <Input label="Last name" value={userForm.lastName} onChange={(e) => setUserForm((f) => ({ ...f, lastName: e.target.value }))} />
          </div>
          <Input label="Email" type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} />
          <Input label="Temporary password" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddUserOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={addUserMutation.isPending}
              disabled={!userForm.firstName || !userForm.lastName || !userForm.email || !userForm.password}
              onClick={() => addUserMutation.mutate()}
            >
              Create User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm modal */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => toggleStatus.mutate()}
        title={isSuspended ? 'Reactivate company?' : 'Suspend company?'}
        message={
          isSuspended
            ? `This will restore access for all users at ${tenant.name}.`
            : `This will immediately block all users at ${tenant.name} from logging in.`
        }
        confirmLabel={isSuspended ? 'Reactivate' : 'Suspend'}
        variant={isSuspended ? 'default' : 'danger'}
        isLoading={toggleStatus.isPending}
      />
    </div>
  );
}
