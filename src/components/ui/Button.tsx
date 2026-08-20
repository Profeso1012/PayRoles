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

// Text/icon shrink at the sm breakpoint instead of wrapping - an icon+label
// button (e.g. "Add User") that doesn't fit its available width used to wrap
// onto two lines and grow taller instead of shrinking, which is what
// `whitespace-nowrap` below actually prevents; these size steps just make
// the one-line result fit more often on narrow screens.
const sizeMap = {
  sm: 'text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded gap-1.5 sm:gap-2',
  md: 'text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-md gap-1.5 sm:gap-2',
  lg: 'text-sm sm:text-base px-4 sm:px-6 py-3 rounded-md gap-2',
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
        'inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-fresh-cash focus-visible:ring-offset-2',
        // Normalizes icon size off whatever numeric `size` prop each call
        // site happens to pass lucide-react (13-18px in the wild across this
        // app) and shrinks it one notch on mobile - CSS width/height here
        // wins over the SVG's own width/height attributes.
        '[&_svg]:shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5 sm:[&_svg]:w-4 sm:[&_svg]:h-4',
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
