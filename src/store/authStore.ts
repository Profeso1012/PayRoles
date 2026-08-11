import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, UserRole } from '@contracts/types/auth';
import { parseTokenExpiry } from '@/lib/api/transforms';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  isAuthenticated: boolean;
  /** True from a login whose temp/emailed password hasn't been changed yet - forces the change-password interstitial before the app renders. Persisted so the obligation survives a reload/reopen; only cleared by an actual successful password change or a fresh login that returns false. */
  mustChangePassword: boolean;
  setSession: (data: {
    user?: AuthUser;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: string;
    mustChangePassword?: boolean;
  }) => void;
  clearMustChangePassword: () => void;
  clearSession: () => void;
  /**
   * Coarse role-based check only - real permission enforcement is server-side
   * (see AuthUser doc comment in @contracts/types/auth). Useful for hiding UI,
   * never sufficient on its own for authorization.
   */
  hasRole: (...roles: UserRole[]) => boolean;
  isTokenExpired: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      mustChangePassword: false,

      setSession: ({ user, accessToken, refreshToken, expiresIn, mustChangePassword }) => {
        const currentState = get();

        // Calculate token expiry if provided
        let tokenExpiresAt = currentState.tokenExpiresAt;
        if (expiresIn) {
          const expiryMs = parseTokenExpiry(expiresIn);
          tokenExpiresAt = Date.now() + expiryMs;
        }

        set({
          user: user || currentState.user,
          accessToken: accessToken || currentState.accessToken,
          refreshToken: refreshToken || currentState.refreshToken,
          tokenExpiresAt,
          isAuthenticated: true,
          mustChangePassword: mustChangePassword ?? currentState.mustChangePassword,
        });
      },

      clearMustChangePassword: () => set({ mustChangePassword: false }),

      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          isAuthenticated: false,
          mustChangePassword: false,
        }),

      hasRole: (...roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },

      isTokenExpired: () => {
        const { tokenExpiresAt } = get();
        if (!tokenExpiresAt) return true;
        // Add 60 second buffer
        return Date.now() >= tokenExpiresAt - 60000;
      },
    }),
    {
      name: 'payrole_auth',
      // mustChangePassword MUST be persisted: tokens/isAuthenticated already
      // survive a reload via localStorage, so if this were left transient-only
      // (as originally designed), abandoning the tab mid-forced-change and
      // reopening the app later - even days later - would silently drop the
      // obligation on the next reload (it'd reset to its false default) while
      // the account's real password on the backend is still the original
      // temp one. Persisting it closes that gap; it's corrected back to the
      // authoritative server value on every fresh login regardless.
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tokenExpiresAt: state.tokenExpiresAt,
        isAuthenticated: state.isAuthenticated,
        mustChangePassword: state.mustChangePassword,
      }),
    },
  ),
);
