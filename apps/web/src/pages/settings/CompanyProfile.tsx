import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

interface TenantProfile {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  country: string;
  adminEmail: string;
  setupComplete: boolean;
}

const COUNTRY_OPTIONS = [
  { value: 'NG', label: 'Nigeria' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GH', label: 'Ghana' },
  { value: 'KE', label: 'Kenya' },
  { value: 'ZA', label: 'South Africa' },
];

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  enterprise: 'Enterprise',
};

export default function CompanyProfile() {
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'COMPANY_SUPER_ADMIN';

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { data: profile, isLoading, isError, refetch } = useQuery<TenantProfile>({
    queryKey: ['tenant-profile'],
    queryFn: () => apiClient('/tenants/profile'),
  });

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setCountry(profile.country);
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (body: { name: string; country: string }) =>
      apiClient('/tenants/profile', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-profile'] });
      setSaveStatus('success');
      toast.success('Company profile saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: () => {
      setSaveStatus('error');
      toast.error('Failed to save company profile');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !profile) {
    return <ErrorState onRetry={refetch} />;
  }

  const isDirty = name !== profile.name || country !== profile.country;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        title="Company Profile"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Company Profile' }]}
        action={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.375rem 0.875rem',
              borderRadius: '0.5rem',
              background: profile.status === 'active' ? '#CDEFD7' : '#fee2e2',
            }}
          >
            <Building2
              size={14}
              style={{ color: profile.status === 'active' ? '#1F6F4E' : '#dc2626' }}
            />
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: profile.status === 'active' ? '#1F6F4E' : '#dc2626',
                textTransform: 'capitalize',
              }}
            >
              {profile.status}
            </span>
          </div>
        }
      />

      <div
        style={{
          background: '#fff',
          border: '1px solid #CDEFD7',
          borderRadius: '0.75rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #CDEFD7',
            background: '#F7FAF8',
          }}
        >
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F2E23' }}>
            Organisation Details
          </p>
          {!canEdit && (
            <p style={{ fontSize: '0.8125rem', color: '#1F6F4E', marginTop: '0.25rem' }}>
              You have read-only access. Contact your Super Admin to make changes.
            </p>
          )}
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem',
            }}
          >
            <Input
              label="Company Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              placeholder="e.g. Acme Corporation"
            />
            <Input
              label="Slug"
              value={profile.slug}
              disabled
              hint="URL-safe identifier — cannot be changed"
            />
            <Select
              label="Country"
              value={country}
              options={COUNTRY_OPTIONS}
              onChange={setCountry}
              disabled={!canEdit}
              placeholder="Select country"
            />
            <Input
              label="Plan"
              value={PLAN_LABELS[profile.plan] ?? profile.plan}
              disabled
              hint="Contact support to upgrade your plan"
            />
            <Input
              label="Admin Email"
              value={profile.adminEmail}
              disabled
              hint="Primary contact — managed by platform admin"
            />
          </div>

          {canEdit && (
            <div
              style={{
                marginTop: '2rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid #CDEFD7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '24px' }}>
                {saveStatus === 'success' && (
                  <>
                    <CheckCircle size={16} style={{ color: '#4FAD72' }} />
                    <span style={{ fontSize: '0.8125rem', color: '#4FAD72', fontWeight: 500 }}>
                      Changes saved
                    </span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <AlertCircle size={16} style={{ color: '#dc2626' }} />
                    <span style={{ fontSize: '0.8125rem', color: '#dc2626', fontWeight: 500 }}>
                      Save failed — please try again
                    </span>
                  </>
                )}
              </div>
              <Button
                variant="primary"
                loading={saveMutation.isPending}
                disabled={!isDirty || saveMutation.isPending}
                onClick={() => saveMutation.mutate({ name, country })}
              >
                Save changes
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
