import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { PATHS } from '../paths';

interface Props {
  children: React.ReactNode;
}

// There is no /organisation/setup-status endpoint on the real backend (it was
// a mock-only concept, along with pay groups) - this previously 404'd on every
// check and silently redirected away from Add Employee every time. Legal
// entities are the only real organisation concept, and CreateWorkerDto.legalEntityId
// is optional on the backend anyway - this is a soft product nudge, not a hard
// backend requirement.
export function OrgGuard({ children }: Props) {
  const { data: legalEntities, isLoading } = useQuery({
    queryKey: ['legal-entities'],
    queryFn: async () => {
      const response = await apiClient<any>(ENDPOINTS.LEGAL_ENTITIES.LIST);
      return Array.isArray(response) ? response : response.data || [];
    },
  });

  if (isLoading) return null;

  if (!legalEntities || legalEntities.length === 0) {
    return <Navigate to={PATHS.ORGANISATION} replace />;
  }

  return <>{children}</>;
}
