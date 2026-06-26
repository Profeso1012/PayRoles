import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export default function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full border-2 border-mint-light border-t-fresh-cash animate-spin',
        sizeMap[size],
        className,
      )}
    />
  );
}
