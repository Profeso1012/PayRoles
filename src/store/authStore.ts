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
  /** True right after a login whose temp/emailed password hasn't been changed yet - forces the change-password interstitial before the app renders. Not persisted - only ever set fresh from a login response. */
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
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tokenExpiresAt: state.tokenExpiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
