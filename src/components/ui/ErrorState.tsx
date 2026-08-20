import { AlertCircle, ShieldAlert } from 'lucide-react';
import Button from './Button';
import { ApiError } from '@/lib/api';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  /** The raw error from a failed query/mutation. When it's an ApiError with
   * status 401/403, this renders a distinct "Access Denied" state instead of
   * the generic "Something went wrong" - a permission restriction reads very
   * differently from a broken API call and shouldn't look the same. */
  error?: unknown;
}

export default function ErrorState({ message, onRetry, error }: ErrorStateProps) {
  const isAccessDenied = error instanceof ApiError && (error.status === 401 || error.status === 403);

  if (isAccessDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-mint-light">
          <ShieldAlert size={32} className="stroke-fresh-cash" />
        </div>
        <p className="text-base font-bold text-fresh-cash mt-4">Access Denied</p>
        <p className="text-sm text-cash-green mt-1 max-w-sm text-center">
          {message || "You don't have permission to view this."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
        <AlertCircle size={32} className="stroke-red-500" />
      </div>
      <p className="text-base font-semibold text-deep-cash mt-4">Something went wrong</p>
      {message && (
        <p className="text-sm text-cash-green mt-1 max-w-sm text-center">{message}</p>
      )}
      {onRetry && (
        <div className="mt-4">
          <Button variant="ghost" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
