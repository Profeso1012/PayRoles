import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { PATHS } from '../paths';

interface Props {
  children: React.ReactNode;
}

// Mirrors DashboardRouter's role -> landing page mapping (router/index.tsx) -
// kept independent rather than imported since that one is a route element,
// not a plain function.
function homePathForRole(role: string | undefined): string {
  if (role === 'PLATFORM_ADMIN') return PATHS.ADMIN;
  if (role === 'employee_self_service') return PATHS.MY_PAYSLIPS;
  return PATHS.DASHBOARD;
}

/**
 * Inverse of AuthGuard: keeps an already-authenticated user off the
 * login/reset-password/etc screens (typed directly into the address bar, or
 * reached via the browser back button after signing in) and sends them
 * straight to their dashboard instead.
 */
export function GuestGuard({ children }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);

  if (isAuthenticated) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  return <>{children}</>;
}
