import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Toast as ToastType } from '@/store/uiStore';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const variantConfig = {
  success: { bar: 'bg-fresh-cash', icon: CheckCircle2, iconClass: 'text-fresh-cash' },
  error: { bar: 'bg-red-500', icon: XCircle, iconClass: 'text-red-500' },
  warning: { bar: 'bg-cash-gold', icon: AlertTriangle, iconClass: 'text-cash-gold' },
  info: { bar: 'bg-cash-green', icon: Info, iconClass: 'text-cash-green' },
};

export default function Toast({ toast, onRemove }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const { bar, icon: Icon, iconClass } = variantConfig[toast.variant];

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 4000);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(timer);
    };
  }, [toast.id, onRemove]);

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm bg-white rounded-lg shadow-lg border overflow-hidden transition-transform duration-300',
        visible ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      <div className="flex">
        <div className={cn('w-1 flex-shrink-0', bar)} />
        <div className="flex items-start gap-3 px-4 py-3 flex-1 min-w-0">
          <Icon size={18} className={cn('flex-shrink-0 mt-0.5', iconClass)} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-deep-cash">{toast.title}</p>
            {toast.message && (
              <p className="text-xs text-cash-green mt-0.5">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="flex-shrink-0 p-0.5 rounded hover:bg-mint-light text-cash-green transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
