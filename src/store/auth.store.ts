import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types';
import { connectSockets, disconnectSockets } from '@/lib/socket';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (payload: { user: AuthUser; accessToken: string }) => void;
  clearAuth: () => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  updateToken: (token: string) => void;
  _setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: ({ user, accessToken }) => {
        localStorage.setItem('accessToken', accessToken);
        connectSockets(accessToken);
        set({ user, accessToken, isAuthenticated: true });
      },

      clearAuth: () => {
        localStorage.removeItem('accessToken');
        disconnectSockets();
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      updateUser: (partial) =>
        set((s) => ({ user: s.user ? { ...s.user, ...partial } : s.user })),

      updateToken: (token) => {
        localStorage.setItem('accessToken', token);
        set({ accessToken: token });
      },

      _setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'munework-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);
