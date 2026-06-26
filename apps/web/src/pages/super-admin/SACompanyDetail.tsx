import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Mail, Globe, BadgeCheck, PauseCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'onboarding';
  plan: string;
  country: string;
  createdAt: string;
  setupComplete: boolean;
  adminEmail: string;
}

export default function SACompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: tenant, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-tenant', id],
    queryFn: () => apiClient<Tenant>(`/admin/tenants/${id}`),
    enabled: !!id,
  });

  const toggleStatus = useMutation({
    mutationFn: () =>
      apiClient(`/admin/tenants/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: tenant?.status === 'active' ? 'suspended' : 'active' }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenant', id] });
      qc.invalidateQueries({ queryKey: ['admin-tenants'] });
      const action = tenant?.status === 'active' ? 'suspended' : 'reactivated';
      toast.success(`Company ${action}`, `${tenant?.name} has been ${action}.`);
      setShowConfirm(false);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  if (isError || !tenant) return <ErrorState message="Company not found." onRetry={refetch} />;

  const isSuspended = tenant.status === 'suspended';

  const fields = [
    { icon: Building2, label: 'Legal name', value: tenant.name },
    { icon: Mail, label: 'Super Admin', value: tenant.adminEmail },
    { icon: Globe, label: 'Country', value: tenant.country },
    { icon: BadgeCheck, label: 'Plan', value: <span className="capitalize">{tenant.plan}</span> },
    { icon: BadgeCheck, label: 'Setup', value: tenant.setupComplete ? 'Complete' : 'Pending' },
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
              variant={isSuspended ? 'danger' : tenant.status === 'onboarding' ? 'warning' : 'success'}
              label={tenant.status}
            />
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
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
