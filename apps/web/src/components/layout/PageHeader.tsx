import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Breadcrumb {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
  action?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, breadcrumbs, action, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex items-start justify-between gap-4', className)}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 mb-1">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <span key={index} className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronRight size={12} className="text-cash-green/70" />
                  )}
                  {isLast || !crumb.path ? (
                    <span className="text-xs text-cash-green/70">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.path} className="text-xs text-cash-green/70 hover:text-cash-green transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        )}
        <h1 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-bold text-deep-cash leading-tight">
          {title}
        </h1>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
