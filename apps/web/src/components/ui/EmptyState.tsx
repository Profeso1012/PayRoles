import { PackageOpen, LucideIcon } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-mint-light">
        <Icon size={32} className="stroke-cash-green" />
      </div>
      <p className="text-base font-semibold text-deep-cash mt-4">{title}</p>
      {description && (
        <p className="text-sm text-cash-green mt-1 max-w-sm text-center">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          <Button variant="primary" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
