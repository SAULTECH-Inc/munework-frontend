import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  chatOpen: boolean;
  activeChatConvId: string | null;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  openChat: (convId?: string) => void;
  closeChat: () => void;
}

// Apply saved theme immediately on module load (before React renders)
// so there's no flash of wrong theme.
const savedTheme = (() => {
  try {
    const raw = localStorage.getItem('munework-ui-store');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.state?.theme as 'dark' | 'light' | undefined;
    }
  } catch { /* ignore */ }
  return undefined;
})();

if (savedTheme === 'light') {
  document.documentElement.classList.add('light');
  document.documentElement.classList.remove('dark');
} else {
  document.documentElement.classList.add('dark');
  document.documentElement.classList.remove('light');
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: savedTheme ?? 'dark',
      sidebarCollapsed: false,
      chatOpen: false,
      activeChatConvId: null,

      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.classList.toggle('light', next === 'light');
          document.documentElement.classList.toggle('dark', next === 'dark');
          return { theme: next };
        }),

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      openChat: (convId) => set({ chatOpen: true, activeChatConvId: convId ?? null }),
      closeChat: () => set({ chatOpen: false, activeChatConvId: null }),
    }),
    {
      name: 'munework-ui-store',
      // Only persist theme and sidebarCollapsed — not transient UI state
      partialize: (s) => ({ theme: s.theme, sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
