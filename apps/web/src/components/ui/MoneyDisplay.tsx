import { cn, formatMoney } from '@/lib/utils';

interface MoneyDisplayProps {
  /** Already-major-unit amount (e.g. naira, not kobo) - see lib/utils.ts#formatMoney. */
  amount: number;
  currency?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export default function MoneyDisplay({
  amount,
  currency = 'NGN',
  className,
  size = 'md',
}: MoneyDisplayProps) {
  return (
    <span className={cn('font-semibold tabular-nums', sizeMap[size], className)}>
      {formatMoney(amount, currency)}
    </span>
  );
}
