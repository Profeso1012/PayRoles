import { AlertCircle } from 'lucide-react';
import Button from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
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
