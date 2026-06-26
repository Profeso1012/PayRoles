import { cn } from '@/lib/utils';
import Spinner from './Spinner';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const variantMap = {
  primary: 'bg-fresh-cash text-white hover:bg-cash-green',
  secondary:
    'bg-mint-light text-deep-cash hover:bg-fresh-cash/20 border border-fresh-cash/30',
  ghost:
    'bg-transparent text-cash-green hover:bg-mint-light border border-transparent',
  danger: 'bg-red-500 text-white hover:bg-red-600',
};

const sizeMap = {
  sm: 'text-sm px-3 py-1.5 rounded',
  md: 'text-sm px-4 py-2 rounded-md',
  lg: 'text-base px-6 py-3 rounded-md',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  onClick,
  type = 'button',
  className,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-fresh-cash focus-visible:ring-offset-2',
        variantMap[variant],
        sizeMap[size],
        isDisabled && 'opacity-60 cursor-not-allowed pointer-events-none',
        className,
      )}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
