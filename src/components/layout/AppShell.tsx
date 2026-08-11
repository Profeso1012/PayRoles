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

  // mustChangePassword is deliberately NOT persisted (see authStore.ts) - it's
  // only ever set fresh from a login response. Without this, a user who logs
  // in with a temp password, never changes it, and just closes the tab
  // (rather than explicitly logging out) would find mustChangePassword reset
  // to false on their next visit - since isAuthenticated/accessToken ARE
  // persisted, they'd sail straight into the app still on the temp password,
  // with the forced-change gate silently bypassed. Re-derive the real value
  // from the server (User.mustChangePassword) once per app mount instead of
  // trusting only what login last said. Platform admin sessions have no such
  // field at all (platform-roles.enum.ts / PlatformUser entity), so skip it there.
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
