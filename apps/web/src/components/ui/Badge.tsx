import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'active'
  | 'on_leave'
  | 'exited'
  | 'draft'
  | 'calculating'
  | 'calculated'
  | 'in_review'
  | 'approved'
  | 'paid'
  | 'posted'
  | 'reversed'
  | 'failed'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
  active: 'bg-mint-light text-cash-green',
  success: 'bg-mint-light text-cash-green',
  on_leave: 'bg-amber-100 text-amber-700',
  warning: 'bg-amber-100 text-amber-700',
  in_review: 'bg-amber-100 text-amber-700',
  exited: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  reversed: 'bg-red-100 text-red-700',
  error: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
  info: 'bg-gray-100 text-gray-600',
  calculating: 'bg-blue-100 text-blue-600 animate-pulse',
  calculated: 'bg-teal-100 text-teal-700',
  approved: 'bg-fresh-cash/20 text-cash-green',
  paid: 'bg-deep-cash/10 text-deep-cash',
  posted: 'bg-deep-cash/10 text-deep-cash',
};

export default function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantMap[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
