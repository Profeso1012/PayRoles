import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@contracts/types/auth';
import { PATHS } from '../paths';

interface Props {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: Props) {
  const user = useAuthStore((s) => s.user);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={PATHS.UNAUTHORIZED} replace />;
  }

  return <>{children}</>;
}
