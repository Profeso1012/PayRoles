import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import OrgSetupBanner from '@/components/shared/OrgSetupBanner';

interface OverviewLegalEntity {
  id: string;
  name: string;
  country: string;
  taxId: string;
  address: string;
  createdAt: string;
  departments: { id: string }[];
  locations: { id: string }[];
  payGroups: { id: string }[];
}

interface SetupStatus {
  hasLegalEntities: boolean;
  hasDepartments: boolean;
  hasPayGroups: boolean;
}

export default function OrgOverview() {
  const navigate = useNavigate();

  const {
    data: overview,
    isLoading,
    isError,
    refetch,
  } = useQuery<OverviewLegalEntity[]>({
    queryKey: ['org-overview'],
    queryFn: () => apiClient('/organisation/overview'),
  });

  const { data: setupStatus } = useQuery<SetupStatus>({
    queryKey: ['org-setup-status'],
    queryFn: () => apiClient('/organisation/setup-status'),
    enabled: !!(overview && overview.length > 0),
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

  const showSetupBanner =
    setupStatus &&
    overview &&
    overview.length > 0 &&
    (!setupStatus.hasDepartments || !setupStatus.hasPayGroups);

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1
          style={{
            fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
            fontWeight: 700,
            color: '#0F2E23',
            marginBottom: '0.25rem',
          }}
        >
          Organisation
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#1F6F4E' }}>
          Overview of your legal entities, departments, locations, and pay groups.
        </p>
      </div>

      {showSetupBanner && (
        <OrgSetupBanner message="Some organisation setup steps are incomplete. Ensure you have departments and pay groups configured." />
      )}

      {(!overview || overview.length === 0) ? (
        <EmptyState
          icon={Building2}
          title="No legal entities yet."
          description="Add your first legal entity to get started."
          action={{
            label: 'Go to Legal Entities',
            onClick: () => navigate('/organisation/legal-entities'),
          }}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {overview.map((le) => (
            <div
              key={le.id}
              style={{
                background: '#fff',
                border: '1px solid #CDEFD7',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                <p
                  style={{
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    color: '#0F2E23',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {le.name}
                </p>
                <Badge variant="info" label={le.country} />
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  borderTop: '1px solid #CDEFD7',
                  paddingTop: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={15} style={{ color: '#1F6F4E', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8125rem', color: '#1F6F4E' }}>
                    {le.departments.length} Department{le.departments.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={15} style={{ color: '#1F6F4E', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8125rem', color: '#1F6F4E' }}>
                    {le.locations.length} Location{le.locations.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={15} style={{ color: '#1F6F4E', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8125rem', color: '#1F6F4E' }}>
                    {le.payGroups.length} Pay Group{le.payGroups.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  borderTop: '1px solid #CDEFD7',
                  paddingTop: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={() => navigate('/organisation/departments')}
                  style={{
                    fontSize: '0.8125rem',
                    color: '#4FAD72',
                    fontWeight: 500,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  Departments
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/organisation/locations')}
                  style={{
                    fontSize: '0.8125rem',
                    color: '#4FAD72',
                    fontWeight: 500,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  Locations
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/organisation/pay-groups')}
                  style={{
                    fontSize: '0.8125rem',
                    color: '#4FAD72',
                    fontWeight: 500,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  Pay Groups
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
