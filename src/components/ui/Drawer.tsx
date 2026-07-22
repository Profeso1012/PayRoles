import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-80',
  md: 'w-[480px]',
  lg: 'w-[640px]',
};

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: DrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-deep-cash/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-full bg-white shadow-2xl flex flex-col transition-transform duration-300',
          sizeMap[size],
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="px-6 py-4 border-b border-mint-light flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold text-deep-cash">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-mint-light text-cash-green transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </>,
    document.body,
  );
}
