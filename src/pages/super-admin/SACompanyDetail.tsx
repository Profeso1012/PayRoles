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
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import type { BackendTenant } from '@/lib/api/types';

const blankUserForm = { firstName: '', lastName: '', email: '' };

export default function SACompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const platformRole = useAuthStore((s) => s.user?.platformRole);
  // Backend requires PlatformPermission.TENANT_WRITE for suspend/activate/
  // create-user on a tenant, held only by super_admin/platform_admin - see
  // platform-tenants.controller.ts. support_engineer/auditor/devops can view
  // this page but must not see write actions they'd just get a 403 clicking.
  const canWrite = platformRole === 'super_admin' || platformRole === 'platform_admin';
  const [showConfirm, setShowConfirm] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [userForm, setUserForm] = useState(blankUserForm);

  const { data: tenant, isLoading, isError, error, refetch } = useQuery<BackendTenant>({
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
    onError: (err) => toast.error('Action failed', err instanceof Error ? err.message : undefined),
  });

  const addUserMutation = useMutation({
    mutationFn: () =>
      apiClient(ENDPOINTS.PLATFORM_TENANTS.CREATE_USER(id!), {
        method: 'POST',
        body: JSON.stringify({ ...userForm, role: 'tenant_admin' }),
      }),
    onSuccess: () => {
      toast.success('User created', `Login credentials were emailed to ${userForm.email}.`);
      setAddUserOpen(false);
      setUserForm(blankUserForm);
    },
    onError: (err) => toast.error('Failed to create user', err instanceof Error ? err.message : undefined),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  if (isError || !tenant) return <ErrorState message="Company not found." error={error} onRetry={() => refetch()} />;

  const isSuspended = tenant.status === 'suspended';

  const fields = [
    { icon: Building2, label: 'Legal name', value: tenant.name },
    { icon: Mail, label: 'Contact Email', value: tenant.contactEmail },
    { icon: Globe, label: 'Country', value: tenant.country || '—' },
    { icon: BadgeCheck, label: 'Currency', value: tenant.currency || '—' },
    { icon: BadgeCheck, label: 'Member since', value: formatDate(tenant.createdAt) },
  ];

  return (
    <div className="p-[clamp(0.75rem,4vw,1.5rem)] max-w-[860px] mx-auto">
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
          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              variant={isSuspended ? 'danger' : 'success'}
              label={tenant.status}
            />
            {canWrite && (
              <Button variant="secondary" className="whitespace-nowrap shrink-0" onClick={() => setAddUserOpen(true)}>
                <UserPlus size={15} className="mr-2" />
                Add User
              </Button>
            )}
            {canWrite && (
              <Button
                variant={isSuspended ? 'secondary' : 'danger'}
                className="whitespace-nowrap shrink-0"
                onClick={() => setShowConfirm(true)}
              >
                {isSuspended ? (
                  <><BadgeCheck size={15} className="mr-2" />Reactivate</>
                ) : (
                  <><PauseCircle size={15} className="mr-2" />Suspend</>
                )}
              </Button>
            )}
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
            A temporary password will be generated and emailed to them, along with a link to
            verify and set a permanent password on first login.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <Input label="First name" value={userForm.firstName} onChange={(e) => setUserForm((f) => ({ ...f, firstName: e.target.value }))} />
            <Input label="Last name" value={userForm.lastName} onChange={(e) => setUserForm((f) => ({ ...f, lastName: e.target.value }))} />
          </div>
          <Input label="Email" type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddUserOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={addUserMutation.isPending}
              disabled={!userForm.firstName || !userForm.lastName || !userForm.email}
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
