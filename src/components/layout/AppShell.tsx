import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import ToastProvider from '@/components/ui/ToastProvider';
import TourGuide from '@/components/tour/TourGuide';
import ForceChangePasswordModal from '@/components/shared/ForceChangePasswordModal';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';

export default function AppShell() {
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const role = useAuthStore((s) => s.user?.role);
  const setSession = useAuthStore((s) => s.setSession);
  const isPlatformAdmin = role === 'PLATFORM_ADMIN';

  // Re-derive mustChangePassword from the server once per app mount instead
  // of trusting only what login last said. While a temporary password is
  // still pending, the backend refuses GET /users/me with 403
  // PASSWORD_CHANGE_REQUIRED - lib/api.ts turns that 403 into
  // setMustChangePassword(true), so this query raises the gate either way.
  // Platform admin sessions have no such field at all (PlatformUser entity),
  // so skip it there.
  useQuery({
    queryKey: ['appshell-must-change-password-sync'],
    queryFn: async () => {
      const me = await apiClient<{ mustChangePassword: boolean }>(ENDPOINTS.USERS.ME);
      setSession({ mustChangePassword: me.mustChangePassword });
      return me;
    },
    enabled: !isPlatformAdmin,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="min-h-screen bg-soft-white font-sans">
      <Topbar />
      <div className="flex" style={{ paddingTop: '72px' }}>
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="p-[clamp(0.25rem,1.5vw,2rem)]">
            <Outlet />
          </div>
        </main>
      </div>
      <ToastProvider />
      <TourGuide />
      {mustChangePassword && <ForceChangePasswordModal />}
    </div>
  );
}
