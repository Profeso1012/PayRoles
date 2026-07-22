import { useUiStore } from '@/store/uiStore';

export function useToast() {
  const addToast = useUiStore((s) => s.addToast);

  return {
    success: (title: string, message?: string) =>
      addToast({ variant: 'success', title, message }),
    error: (title: string, message?: string) =>
      addToast({ variant: 'error', title, message }),
    warning: (title: string, message?: string) =>
      addToast({ variant: 'warning', title, message }),
    info: (title: string, message?: string) =>
      addToast({ variant: 'info', title, message }),
  };
}
