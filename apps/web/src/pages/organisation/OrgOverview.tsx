import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { formatDate } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';

interface LegalEntity {
  id: string;
  tenantId: string;
  name: string;
  country: string;
  taxId: string;
  address: string;
  createdAt: string;
}

export default function OrgOverview() {
  const navigate = useNavigate();

  const {
    data: legalEntities,
    isLoading,
    isError,
    refetch,
  } = useQuery<LegalEntity[]>({
    queryKey: ['legal-entities'],
    queryFn: async () => {
      const response = await apiClient<any>(ENDPOINTS.LEGAL_ENTITIES.LIST);
      const entities = Array.isArray(response) ? response : (response.data || []);
      return entities;
    },
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
          Overview of your legal entities and organizational structure.
        </p>
      </div>

      {(!legalEntities || legalEntities.length === 0) ? (
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
          {legalEntities.map((le) => (
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
                    {le.taxId}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: '#1F6F4E',
                    lineHeight: '1.4',
                    marginTop: '0.25rem',
                  }}
                >
                  {le.address}
                </p>
                <span style={{ fontSize: '0.75rem', color: '#1F6F4E', opacity: 0.6, marginTop: '0.25rem' }}>
                  Created {formatDate(le.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
