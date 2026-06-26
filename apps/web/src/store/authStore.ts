import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, Permission } from '@contracts/types/auth';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setSession: (user: AuthUser, token: string) => void;
  clearSession: () => void;
  hasPermission: (permission: Permission) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setSession: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      clearSession: () =>
        set({ user: null, token: null, isAuthenticated: false }),

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        return user.permissions.includes(permission);
      },
    }),
    {
      name: 'payrole_auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
