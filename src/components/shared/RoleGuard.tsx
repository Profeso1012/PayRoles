import type { UserRole } from '@contracts/types/auth';
import { useAuthStore } from '@/store/authStore';

interface RoleGuardProps {
  roles?: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Coarse role-based visibility only - real authorization is server-side (see
// AuthUser doc comment in @contracts/types/auth). Hides children, does not redirect.
export default function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) return <>{fallback}</>;

  if (roles && !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
