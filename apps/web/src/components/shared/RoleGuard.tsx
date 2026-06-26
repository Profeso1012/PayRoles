import type { Permission, UserRole } from '@contracts/types/auth';
import { useAuthStore } from '@/store/authStore';

interface RoleGuardProps {
  permission?: Permission;
  roles?: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleGuard({ permission, roles, children, fallback = null }: RoleGuardProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) return <>{fallback}</>;

  if (permission && !user.permissions.includes(permission)) {
    return <>{fallback}</>;
  }

  if (roles && !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
