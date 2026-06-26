import { create } from 'zustand';

export interface Toast {
  id: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

interface UiState {
  sidebarOpen: boolean;
  activeModal: string | null;
  toasts: Toast[];

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarOpen: true,
  activeModal: null,
  toasts: [],

  toggleSidebar: () =>
    set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  openModal: (id) => set({ activeModal: id }),

  closeModal: () => set({ activeModal: null }),

  addToast: (toast) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { ...toast, id: Math.random().toString(36).slice(2) },
      ],
    })),

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
