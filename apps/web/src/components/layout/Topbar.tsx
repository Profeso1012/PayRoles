import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import Avatar from '@/components/ui/Avatar';
import { PATHS } from '@/router/paths';

export default function Topbar() {
  const navigate = useNavigate();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    // Backend invalidates the stored refresh token server-side on logout
    // (auth.service.ts's logout() calls clearRefreshToken) - calling this
    // before wiping local state so a captured refresh token can't be replayed
    // after "signing out". Best-effort: still clear local state and navigate
    // even if this fails (expired token, offline, etc.) - never block logout.
    try {
      await apiClient(
        user?.role === 'PLATFORM_ADMIN' ? ENDPOINTS.PLATFORM_AUTH.LOGOUT : ENDPOINTS.AUTH.LOGOUT,
        { method: 'POST', skipAuthRedirect: true },
      );
    } catch {
      // ignore - local session clears regardless
    }
    clearSession();
    navigate(PATHS.LOGIN);
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-[72px]',
        'flex items-stretch',
        'border-b border-fresh-cash/20',
        'transition-all duration-300',
        scrolled
          ? 'bg-deep-cash/95 backdrop-blur-xl'
          : 'bg-deep-cash/25 backdrop-blur-xl'
      )}
    >
      <div className="flex items-center w-full px-4 lg:px-8 gap-4">
        {/* Hamburger */}
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-3 text-white/90 hover:text-white transition-colors p-2 rounded-md hover:bg-white/10"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        {/* Divider */}
        <div className="w-px h-7 bg-white/20 flex-shrink-0" />

        {/* Tenant / brand name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img
            src="/assets/payrole-logo.png"
            alt="PayRole"
            className="h-6 w-auto hidden sm:block"
          />
          {user?.tenantName && (
            <>
              <div className="w-px h-4 bg-white/20 hidden sm:block" />
              <span className="text-white/75 text-sm truncate hidden md:block">
                {user.tenantName}
              </span>
            </>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <button className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors relative">
            <Bell size={18} />
          </button>

          {/* Divider */}
          <div className="w-px h-7 bg-white/20 mx-1 flex-shrink-0" />

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors"
            >
              <Avatar
                src={user?.avatarUrl ?? null}
                name={user?.fullName ?? ''}
                size="sm"
              />
              <span className="text-white text-sm font-medium hidden sm:block max-w-[120px] truncate">
                {user?.fullName?.split(' ')[0]}
              </span>
              <ChevronDown
                size={14}
                className={cn('text-white/70 transition-transform', dropdownOpen && 'rotate-180')}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl border border-mint-light overflow-hidden z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-mint-light">
                  <p className="text-sm font-semibold text-deep-cash truncate">{user?.fullName}</p>
                  <p className="text-xs text-cash-green truncate">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-semibold bg-mint-light text-cash-green px-2 py-0.5 rounded-full">
                    {user?.role?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setDropdownOpen(false); navigate(PATHS.MY_PROFILE); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-cash-green hover:bg-soft-white hover:text-fresh-cash transition-colors"
                  >
                    <User size={15} />
                    My Profile
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
