import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { OrgSetupStatus } from '@contracts/types/organisation';
import { PATHS } from '../paths';

interface Props {
  children: React.ReactNode;
  requirePayGroups?: boolean;
}

export function OrgGuard({ children, requirePayGroups = false }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['org-setup-status'],
    queryFn: () => apiClient<OrgSetupStatus>('/organisation/setup-status'),
  });

  if (isLoading) return null;

  if (!data?.hasLegalEntities) {
    return <Navigate to={PATHS.ORGANISATION} replace />;
  }

  if (requirePayGroups && !data?.hasPayGroups) {
    return <Navigate to={PATHS.ORGANISATION} replace />;
  }

  return <>{children}</>;
}
